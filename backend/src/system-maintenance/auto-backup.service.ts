import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';

import { PrismaService } from 'src/prisma/prisma.service';
import { SystemMaintenanceService } from './system-maintenance.service';

type AutoBackupFrequency =
  | 'manual'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly';

const FREQUENCY_TO_MS: Record<Exclude<AutoBackupFrequency, 'manual'>, number> =
  {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    biweekly: 15 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

@Injectable()
export class AutoBackupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoBackupService.name);
  private readonly pollingIntervalMs: number;
  private readonly storageDir: string;
  private readonly enabled: boolean;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly maintenanceService: SystemMaintenanceService,
    private readonly configService: ConfigService,
  ) {
    this.pollingIntervalMs =
      Number(this.configService.get('AUTO_BACKUP_POLL_INTERVAL_MS')) ||
      15 * 60 * 1000;
    this.storageDir =
      this.configService.get('AUTO_BACKUP_DIR') ||
      join(process.cwd(), 'storage', 'auto-backups');
    this.enabled = this.configService.get('AUTO_BACKUP_DISABLED') !== 'true';
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Auto-backup scheduler disabled via configuration.');
      return;
    }

    this.timer = setInterval(() => {
      void this.executeCycle();
    }, this.pollingIntervalMs);

    setTimeout(() => void this.executeCycle(), 7_500);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async executeCycle(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      const now = new Date();
      const tenants = await this.prisma.siteSettings.findMany({
        select: {
          id: true,
          data: true,
          organizationId: true,
          companyId: true,
          tenantKey: true,
        },
      });

      for (const tenant of tenants) {
        const { autoBackupFrequency, lastAutoBackupAt } =
          this.extractSystemSettings(tenant.data);

        if (
          autoBackupFrequency === 'manual' ||
          !this.isDue(autoBackupFrequency, lastAutoBackupAt, now)
        ) {
          continue;
        }

        await this.runBackupForTenant(tenant, now);
      }
    } catch (error) {
      this.logger.error(
        `Automatic backup cycle failed: ${(error as Error)?.message ?? error}`,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async runBackupForTenant(
    tenant: {
      id: number;
      data: Prisma.JsonValue;
      organizationId: number | null;
      companyId: number | null;
      tenantKey: string;
    },
    executedAt: Date,
  ): Promise<void> {
    try {
      const backup = await this.maintenanceService.generateBackup({
        organizationId: tenant.organizationId ?? undefined,
        companyId: tenant.companyId ?? undefined,
      });

      const directory = join(
        this.storageDir,
        String(tenant.organizationId ?? 'global'),
        tenant.companyId ? `company-${tenant.companyId}` : 'org-wide',
      );

      await mkdir(directory, { recursive: true });
      const filePath = join(directory, backup.filename);
      const writeStream = createWriteStream(filePath);
      await pipeline(backup.stream, writeStream);

      await this.updateSystemMetadata(
        tenant.id,
        tenant.data,
        executedAt.toISOString(),
      );

      this.logger.log(
        `Automatic backup stored for ${tenant.tenantKey} at ${filePath}`,
      );
    } catch (error) {
      this.logger.error(
        `Automatic backup failed for ${tenant.tenantKey}: ${
          (error as Error)?.message ?? error
        }`,
      );
    }
  }

  private isDue(
    frequency: AutoBackupFrequency,
    lastRunIso: string | null,
    referenceDate: Date,
  ): boolean {
    if (frequency === 'manual') {
      return false;
    }

    if (!lastRunIso) {
      return true;
    }

    const lastRun = new Date(lastRunIso);
    const diff = referenceDate.getTime() - lastRun.getTime();
    const required = FREQUENCY_TO_MS[frequency];
    return diff >= required;
  }

  private extractSystemSettings(data: Prisma.JsonValue): {
    autoBackupFrequency: AutoBackupFrequency;
    lastAutoBackupAt: string | null;
  } {
    if (!this.isJsonObject(data)) {
      return { autoBackupFrequency: 'manual', lastAutoBackupAt: null };
    }

    const system = data.system;
    if (!this.isJsonObject(system)) {
      return { autoBackupFrequency: 'manual', lastAutoBackupAt: null };
    }

    const rawFrequency = system.autoBackupFrequency;
    const rawLast = system.lastAutoBackupAt;

    const frequency: AutoBackupFrequency =
      rawFrequency === 'daily' ||
      rawFrequency === 'weekly' ||
      rawFrequency === 'biweekly' ||
      rawFrequency === 'monthly'
        ? rawFrequency
        : 'manual';

    const lastAutoBackupAt =
      typeof rawLast === 'string' && rawLast.length > 0 ? rawLast : null;

    return { autoBackupFrequency: frequency, lastAutoBackupAt };
  }

  private async updateSystemMetadata(
    siteSettingsId: number,
    originalData: Prisma.JsonValue,
    executedAtIso: string,
  ): Promise<void> {
    const baseObject: Prisma.JsonObject = this.isJsonObject(originalData)
      ? { ...originalData }
      : {};

    const system: Prisma.JsonObject = this.isJsonObject(baseObject.system)
      ? { ...(baseObject.system as Prisma.JsonObject) }
      : {};

    const currentFrequency =
      system.autoBackupFrequency === 'daily' ||
      system.autoBackupFrequency === 'weekly' ||
      system.autoBackupFrequency === 'biweekly' ||
      system.autoBackupFrequency === 'monthly'
        ? (system.autoBackupFrequency as AutoBackupFrequency)
        : 'manual';

    system.autoBackupFrequency = currentFrequency;
    system.lastAutoBackupAt = executedAtIso;

    const nextData: Prisma.JsonObject = {
      ...baseObject,
      system,
    };

    await this.prisma.siteSettings.update({
      where: { id: siteSettingsId },
      data: { data: nextData },
    });
  }

  private isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
