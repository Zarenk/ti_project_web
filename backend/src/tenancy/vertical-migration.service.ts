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
  runVerticalCleanup,
  VerticalScriptName,
  BusinessVertical as VerticalType,
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

  private getDataTransformationsFor(
    vertical: BusinessVertical,
  ): VerticalScriptName[] {
    const config = VERTICAL_REGISTRY[vertical];
    if (!config?.migrations?.dataTransformations) {
      return [];
    }
    // Extract transformation script names from the dataTransformations array
    return config.migrations.dataTransformations.map(
      (dt) => dt.transformation as VerticalScriptName,
    );
  }

  private async runScripts(
    scripts: VerticalScriptName[],
    companyId: number,
    organizationId: number,
    metadata?: Record<string, unknown>,
  ) {
    for (const script of scripts) {
      await runVerticalScript(script, {
        companyId,
        organizationId,
        prisma: this.prisma,
        metadata,
      });
    }
  }

  private async runCleanup(
    vertical: BusinessVertical,
    companyId: number,
    organizationId: number,
    reason?: string,
  ) {
    await runVerticalCleanup(vertical as unknown as VerticalType, {
      companyId,
      organizationId,
      prisma: this.prisma,
      metadata: { reason },
    });
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

    // Run onDeactivate scripts for previous vertical
    await this.runScripts(
      this.getScriptsFor(previousVertical, 'onDeactivate'),
      companyId,
      company.organizationId,
    );

    // Archive vertical-specific data before switching
    await this.runCleanup(
      previousVertical,
      companyId,
      company.organizationId,
      params.reason,
    );

    await this.prisma.$transaction(async (tx) => {
      // Optimistic concurrency: verify vertical hasn't changed
      const current = await tx.company.findUnique({
        where: { id: companyId },
        select: { businessVertical: true },
      });
      if (!current || current.businessVertical !== previousVertical) {
        throw new BadRequestException(
          'El vertical fue modificado por otro usuario. Recarga la pagina e intenta nuevamente.',
        );
      }

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

    try {
      // Run onActivate scripts for target vertical
      await this.runScripts(
        this.getScriptsFor(targetVertical, 'onActivate'),
        companyId,
        company.organizationId,
      );

      // Run data transformations for target vertical
      const dataTransformations = this.getDataTransformationsFor(targetVertical);
      if (dataTransformations.length > 0) {
        await this.runScripts(
          dataTransformations,
          companyId,
          company.organizationId,
          { phase: 'dataTransformation' },
        );
      }
    } catch (activationError) {
      // Compensate: revert the vertical change
      await this.prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: companyId },
          data: { businessVertical: previousVertical },
        });
        await tx.companyVerticalChangeAudit.create({
          data: {
            companyId,
            organizationId: company.organizationId,
            userId: params.actorId,
            oldVertical: targetVertical,
            newVertical: previousVertical,
            changeReason:
              'rollback-automatico: fallo en scripts de activacion',
            warningsJson: Prisma.JsonNull,
            success: false,
          },
        });
      });

      try {
        await this.runScripts(
          this.getScriptsFor(targetVertical, 'onDeactivate'),
          companyId,
          company.organizationId,
        );
      } catch {
        // Best-effort cleanup; primary error is more important
      }

      throw activationError;
    }

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
        where: {
          companyId,
          expiresAt: { gte: new Date() },
        },
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
        'No hay snapshots disponibles para rollback. Es posible que haya expirado (7 dias).',
      );
    }

    const payload = snapshot.snapshotData as SnapshotPayload | null;
    const targetVertical = payload?.previousVertical;
    if (!targetVertical) {
      throw new BadRequestException('Snapshot invalido para rollback.');
    }

    const currentVertical = company.businessVertical;

    // Run onDeactivate scripts for current vertical
    await this.runScripts(
      this.getScriptsFor(currentVertical, 'onDeactivate'),
      companyId,
      company.organizationId,
    );

    // Archive vertical-specific data before rolling back
    await this.runCleanup(
      currentVertical,
      companyId,
      company.organizationId,
      'rollback',
    );

    await this.prisma.$transaction(async (tx) => {
      // Optimistic concurrency: verify vertical hasn't changed
      const current = await tx.company.findUnique({
        where: { id: companyId },
        select: { businessVertical: true },
      });
      if (!current || current.businessVertical !== currentVertical) {
        throw new BadRequestException(
          'El vertical fue modificado por otro usuario. Recarga la pagina e intenta nuevamente.',
        );
      }

      await tx.company.update({
        where: { id: companyId },
        data: { businessVertical: targetVertical },
      });

      await tx.companyVerticalChangeAudit.create({
        data: {
          companyId,
          organizationId: company.organizationId,
          userId: actorId,
          oldVertical: currentVertical,
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

    try {
      // Run onActivate scripts for target vertical (rollback)
      await this.runScripts(
        this.getScriptsFor(targetVertical, 'onActivate'),
        companyId,
        company.organizationId,
      );

      // Run data transformations for target vertical (rollback)
      const dataTransformations = this.getDataTransformationsFor(targetVertical);
      if (dataTransformations.length > 0) {
        await this.runScripts(
          dataTransformations,
          companyId,
          company.organizationId,
          { phase: 'dataTransformation' },
        );
      }
    } catch (activationError) {
      // Compensate: revert the vertical change
      await this.prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: companyId },
          data: { businessVertical: currentVertical },
        });
        await tx.companyVerticalChangeAudit.create({
          data: {
            companyId,
            organizationId: company.organizationId,
            userId: actorId,
            oldVertical: targetVertical,
            newVertical: currentVertical,
            changeReason:
              'rollback-automatico: fallo en scripts de activacion',
            warningsJson: Prisma.JsonNull,
            success: false,
          },
        });
      });

      try {
        await this.runScripts(
          this.getScriptsFor(targetVertical, 'onDeactivate'),
          companyId,
          company.organizationId,
        );
      } catch {
        // Best-effort cleanup
      }

      throw activationError;
    }

    this.configService.invalidateCache(companyId, company.organizationId);
    this.events.emitChanged({
      companyId,
      organizationId: company.organizationId,
      previousVertical: currentVertical,
      newVertical: targetVertical,
    });

    return targetVertical;
  }
}
