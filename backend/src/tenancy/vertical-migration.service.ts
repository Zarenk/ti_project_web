import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDays } from 'date-fns';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessVertical } from 'src/types/business-vertical.enum';
import { VERTICAL_REGISTRY } from 'src/config/verticals.config';
import {
  runVerticalScript,
  VerticalScriptName,
} from '../../scripts/verticals';
import { VerticalConfigService } from './vertical-config.service';
import { VerticalEventsService } from './vertical-events.service';

interface ChangeVerticalParams {
  companyId?: number;
  organizationId?: number;
  actorId: number;
  previousVertical: BusinessVertical;
  targetVertical: BusinessVertical;
  warnings: string[];
  reason?: string;
}

interface SnapshotPayload {
  previousVertical?: BusinessVertical;
  reason?: string | null;
  warnings?: string[];
  createdAt?: string;
}

@Injectable()
export class VerticalMigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: VerticalConfigService,
    private readonly events: VerticalEventsService,
  ) {}

  private getScriptsFor(
    vertical: BusinessVertical,
    phase: 'onActivate' | 'onDeactivate',
  ): VerticalScriptName[] {
    const config = VERTICAL_REGISTRY[vertical];
    if (!config?.migrations) {
      return [];
    }
    const scripts = config.migrations[phase];
    if (!scripts) {
      return [];
    }
    return scripts as VerticalScriptName[];
  }

  private async runScripts(
    scripts: VerticalScriptName[],
    companyId: number,
    organizationId: number,
  ) {
    for (const script of scripts) {
      await runVerticalScript(script, {
        companyId,
        organizationId,
        prisma: this.prisma,
      });
    }
  }

  async changeVertical(params: ChangeVerticalParams): Promise<void> {
    if (!params.companyId) {
      throw new BadRequestException(
        'Debes indicar el companyId para cambiar el vertical.',
      );
    }
    const { companyId, previousVertical, targetVertical } = params;

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { organizationId: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    await this.runScripts(
      this.getScriptsFor(previousVertical, 'onDeactivate'),
      companyId,
      company.organizationId,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: companyId },
        data: { businessVertical: targetVertical },
      });

      await tx.companyVerticalRollbackSnapshot.create({
        data: {
          id: randomUUID(),
          companyId,
          organizationId: company.organizationId,
          snapshotData: {
            previousVertical,
            warnings: params.warnings,
            reason: params.reason ?? null,
            createdAt: new Date().toISOString(),
          },
          expiresAt: addDays(new Date(), 7),
        },
      });

      await tx.companyVerticalChangeAudit.create({
        data: {
          companyId,
          organizationId: company.organizationId,
          userId: params.actorId,
          oldVertical: previousVertical,
          newVertical: targetVertical,
          changeReason: params.reason,
          warningsJson:
            params.warnings.length > 0
              ? params.warnings
              : Prisma.JsonNull,
          success: true,
        },
      });
    });

    await this.runScripts(
      this.getScriptsFor(targetVertical, 'onActivate'),
      companyId,
      company.organizationId,
    );

    this.configService.invalidateCache(companyId, company.organizationId);
    this.events.emitChanged({
      companyId,
      organizationId: company.organizationId,
      previousVertical,
      newVertical: targetVertical,
    });
  }

  async rollback(companyId: number, actorId: number) {
    const [snapshot, company] = await Promise.all([
      this.prisma.companyVerticalRollbackSnapshot.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { businessVertical: true, organizationId: true },
      }),
    ]);

    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    if (!snapshot) {
      throw new NotFoundException(
        'No hay snapshots disponibles para rollback.',
      );
    }

    const payload = snapshot.snapshotData as SnapshotPayload | null;
    const targetVertical = payload?.previousVertical;
    if (!targetVertical) {
      throw new BadRequestException('Snapshot invalido para rollback.');
    }

    await this.runScripts(
      this.getScriptsFor(company.businessVertical, 'onDeactivate'),
      companyId,
      company.organizationId,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: companyId },
        data: { businessVertical: targetVertical },
      });

      await tx.companyVerticalChangeAudit.create({
        data: {
          companyId,
          organizationId: company.organizationId,
          userId: actorId,
          oldVertical: company.businessVertical,
          newVertical: targetVertical,
          changeReason: 'rollback',
          warningsJson: Prisma.JsonNull,
          success: true,
        },
      });

      await tx.companyVerticalRollbackSnapshot.delete({
        where: { id: snapshot.id },
      });
    });

    await this.runScripts(
      this.getScriptsFor(targetVertical, 'onActivate'),
      companyId,
      company.organizationId,
    );

    this.configService.invalidateCache(companyId, company.organizationId);
    this.events.emitChanged({
      companyId,
      organizationId: company.organizationId,
      previousVertical: company.businessVertical,
      newVertical: targetVertical,
    });

    return targetVertical;
  }
}
