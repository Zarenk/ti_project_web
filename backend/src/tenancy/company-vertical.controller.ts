import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';
import { VerticalConfigService } from './vertical-config.service';
import {
  VerticalCompatibilityResult,
  VerticalCompatibilityService,
} from './vertical-compatibility.service';
import { CheckBusinessVerticalDto } from './dto/check-business-vertical.dto';
import { UpdateBusinessVerticalDto } from './dto/update-business-vertical.dto';
import { SetProductSchemaEnforcedDto } from './dto/set-product-schema-enforced.dto';
import { BusinessVertical } from 'src/types/business-vertical.enum';
import { VerticalMigrationService } from './vertical-migration.service';
import { VerticalNotificationsService } from './vertical-notifications.service';

const ALLOWED_VERTICALS = new Set<BusinessVertical>([
  BusinessVertical.GENERAL,
  BusinessVertical.COMPUTERS,
  BusinessVertical.RETAIL,
  BusinessVertical.RESTAURANTS,
  BusinessVertical.LAW_FIRM,
]);

@Controller('companies')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class CompanyVerticalController {
  private readonly compatibilityThrottle = new Map<number, number>();
  private readonly csvExportThrottle = new Map<number, number[]>();
  private readonly CSV_EXPORT_LIMIT = 10; // Max exports per hour
  private readonly CSV_EXPORT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
    private readonly verticalConfigService: VerticalConfigService,
    private readonly compatibilityService: VerticalCompatibilityService,
    private readonly migrationService: VerticalMigrationService,
    private readonly notificationsService: VerticalNotificationsService,
  ) {}

  /**
   * Check if user has exceeded CSV export rate limit
   * Throws ForbiddenException if limit exceeded
   */
  private checkCsvExportRateLimit(userId: number): void {
    const now = Date.now();
    const userExports = this.csvExportThrottle.get(userId) || [];

    // Remove exports outside the time window
    const recentExports = userExports.filter(
      (timestamp) => now - timestamp < this.CSV_EXPORT_WINDOW,
    );

    if (recentExports.length >= this.CSV_EXPORT_LIMIT) {
      const oldestExport = Math.min(...recentExports);
      const resetTime = new Date(oldestExport + this.CSV_EXPORT_WINDOW);
      throw new ForbiddenException(
        `Límite de exportaciones excedido. Has alcanzado el máximo de ${this.CSV_EXPORT_LIMIT} exportaciones por hora. Intenta nuevamente después de ${resetTime.toLocaleTimeString('es-PE')}.`,
      );
    }

    // Add current export and update map
    recentExports.push(now);
    this.csvExportThrottle.set(userId, recentExports);

    // Cleanup old entries (optional optimization)
    if (this.csvExportThrottle.size > 1000) {
      for (const [uid, exports] of this.csvExportThrottle.entries()) {
        const validExports = exports.filter(
          (timestamp) => now - timestamp < this.CSV_EXPORT_WINDOW,
        );
        if (validExports.length === 0) {
          this.csvExportThrottle.delete(uid);
        } else {
          this.csvExportThrottle.set(uid, validExports);
        }
      }
    }
  }

  private ensurePermissionForCompany(
    companyId: number,
    organizationId: number,
  ): void {
    const context = this.tenantContextService.getContextWithFallback();
    if (context.isGlobalSuperAdmin) return;
    if (Array.isArray(context.allowedCompanyIds)) {
      const allowed = context.allowedCompanyIds.some(
        (allowedId) => allowedId === companyId,
      );
      if (allowed) {
        return;
      }
    }
    if (
      context.isOrganizationSuperAdmin &&
      context.organizationId === organizationId
    ) {
      return;
    }
    throw new ForbiddenException(
      'Solo los super administradores pueden realizar esta accion.',
    );
  }

  private ensureCompatibilityThrottled(companyId: number): void {
    const now = Date.now();
    const lastCheck = this.compatibilityThrottle.get(companyId);
    const cooldownMs = 10_000;

    if (lastCheck && now - lastCheck < cooldownMs) {
      const retryAfter = Math.ceil(
        (cooldownMs - (now - lastCheck)) / 1000,
      );
      throw new BadRequestException(
        `Demasiadas verificaciones de compatibilidad. Intenta nuevamente en ${retryAfter} segundos.`,
      );
    }

    this.compatibilityThrottle.set(companyId, now);

    if (this.compatibilityThrottle.size > 100) {
      for (const [key, timestamp] of this.compatibilityThrottle) {
        if (now - timestamp > cooldownMs * 6) {
          this.compatibilityThrottle.delete(key);
        }
      }
    }
  }

  private ensureAllowedVertical(vertical: BusinessVertical): void {
    if (!ALLOWED_VERTICALS.has(vertical)) {
      throw new BadRequestException(
        'Este vertical aun no esta disponible en esta fase.',
      );
    }
  }

  /**
   * Read-only access: allows any authenticated user whose active company
   * matches the requested companyId (employees, admins, super admins).
   */
  private async getCompanyWithReadAccess(companyId: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        organizationId: true,
        businessVertical: true,
        productSchemaEnforced: true,
      },
    });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    const context = this.tenantContextService.getContextWithFallback();
    if (context.isGlobalSuperAdmin) return company;
    if (context.companyId === companyId) return company;
    if (
      Array.isArray(context.allowedCompanyIds) &&
      context.allowedCompanyIds.includes(companyId)
    ) {
      return company;
    }
    if (
      context.isOrganizationSuperAdmin &&
      context.organizationId === company.organizationId
    ) {
      return company;
    }
    throw new ForbiddenException(
      'No tiene permiso para acceder a la información de esta empresa.',
    );
  }

  private async getCompanyOrThrow(companyId: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        organizationId: true,
        businessVertical: true,
        productSchemaEnforced: true,
      },
    });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    this.ensurePermissionForCompany(company.id, company.organizationId);
    return company;
  }

  @Get(':id/bank-accounts')
  async getBankAccounts(@Param('id', ParseIntPipe) id: number) {
    await this.getCompanyWithReadAccess(id);
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { bankAccounts: true },
    });
    return { bankAccounts: Array.isArray(company?.bankAccounts) ? company.bankAccounts : [] };
  }

  @Put(':id/bank-accounts')
  async updateBankAccounts(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { bankAccounts: { bankName: string; accountNumber: string; cci?: string }[] },
  ) {
    const company = await this.getCompanyOrThrow(id);
    if (!Array.isArray(body.bankAccounts)) {
      throw new BadRequestException('bankAccounts debe ser un array.');
    }
    for (const account of body.bankAccounts) {
      if (!account.bankName || !account.accountNumber) {
        throw new BadRequestException('Cada cuenta debe tener bankName y accountNumber.');
      }
    }
    await this.prisma.company.update({
      where: { id },
      data: { bankAccounts: body.bankAccounts },
    });
    return { bankAccounts: body.bankAccounts };
  }

  @Get(':id/vertical')
  async getVertical(@Param('id', ParseIntPipe) id: number) {
    const company = await this.getCompanyWithReadAccess(id);
    const config = await this.verticalConfigService.getConfig(id);
    const migration = await this.getMigrationProgress(id);

    return {
      companyId: company.id,
      organizationId: company.organizationId,
      businessVertical: company.businessVertical,
      productSchemaEnforced: company.productSchemaEnforced,
      migration,
      config,
    };
  }

  @Get(':id/vertical/status')
  async getVerticalStatus(@Param('id', ParseIntPipe) id: number) {
    await this.getCompanyWithReadAccess(id);
    const migration = await this.getMigrationProgress(id);
    return {
      companyId: id,
      ...migration,
    };
  }

  @Post(':id/vertical/compatibility-check')
  async checkCompatibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckBusinessVerticalDto,
  ): Promise<VerticalCompatibilityResult> {
    const company = await this.getCompanyOrThrow(id);
    this.ensureAllowedVertical(dto.targetVertical);
    this.ensureCompatibilityThrottled(id);

    return this.compatibilityService.check(
      id,
      company.businessVertical,
      dto.targetVertical,
    );
  }

  @Post(':id/vertical/enforce-product-schema')
  async enforceProductSchema(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetProductSchemaEnforcedDto,
  ) {
    const company = await this.getCompanyOrThrow(id);
    const updated = await this.prisma.company.update({
      where: { id },
      data: { productSchemaEnforced: dto.enforced },
      select: { productSchemaEnforced: true },
    });
    this.verticalConfigService.invalidateCache(id, company.organizationId);
    return {
      companyId: id,
      productSchemaEnforced: updated.productSchemaEnforced,
    };
  }

  @Put(':id/vertical')
  async updateVertical(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessVerticalDto,
  ) {
    const company = await this.getCompanyOrThrow(id);
    this.ensureAllowedVertical(dto.vertical);

    const compatibility = await this.compatibilityService.check(
      id,
      company.businessVertical,
      dto.vertical,
    );

    if (compatibility.errors.length > 0) {
      throw new BadRequestException({
        message: 'No es posible cambiar de vertical.',
        errors: compatibility.errors,
        warnings: compatibility.warnings,
      });
    }

    if (compatibility.warnings.length > 0 && !dto.force) {
      throw new BadRequestException({
        message:
          'El cambio tiene advertencias, confirma con force=true para continuar.',
        warnings: compatibility.warnings,
      });
    }

    const context = this.tenantContextService.getContextWithFallback();
    if (!context.userId) {
      throw new BadRequestException(
        'No se pudo identificar al usuario que realiza el cambio.',
      );
    }

    await this.migrationService.changeVertical({
      companyId: id,
      actorId: context.userId,
      previousVertical: company.businessVertical,
      targetVertical: dto.vertical,
      warnings: compatibility.warnings,
      reason: dto.reason,
    });

    return {
      companyId: id,
      organizationId: company.organizationId,
      businessVertical: dto.vertical,
      warnings: compatibility.warnings,
    };
  }

  @Post(':id/vertical/rollback')
  async rollback(@Param('id', ParseIntPipe) id: number) {
    const company = await this.getCompanyOrThrow(id);
    const context = this.tenantContextService.getContextWithFallback();
    if (!context.userId) {
      throw new BadRequestException(
        'No se pudo identificar al usuario que solicita el rollback.',
      );
    }
    const target = await this.migrationService.rollback(id, context.userId);

    return {
      companyId: id,
      organizationId: company.organizationId,
      businessVertical: target,
    };
  }

  /**
   * GET /companies/:id/vertical/override
   * Fetch the current vertical configuration override for a company
   */
  @Get(':id/vertical/override')
  async getVerticalOverride(@Param('id', ParseIntPipe) id: number) {
    await this.getCompanyWithReadAccess(id);
    const override = await this.prisma.companyVerticalOverride.findUnique({
      where: { companyId: id },
      select: { companyId: true, configJson: true },
    });

    if (!override) {
      return {
        companyId: id,
        configJson: null,
      };
    }

    return override;
  }

  /**
   * PUT /companies/:id/vertical/override
   * Create or update the vertical configuration override for a company
   */
  @Put(':id/vertical/override')
  async updateVerticalOverride(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { configJson: Record<string, any> },
  ) {
    const company = await this.getCompanyOrThrow(id);

    if (!body.configJson || typeof body.configJson !== 'object') {
      throw new BadRequestException(
        'configJson debe ser un objeto de configuracion valido.',
      );
    }

    const override = await this.prisma.companyVerticalOverride.upsert({
      where: { companyId: id },
      update: { configJson: body.configJson },
      create: { companyId: id, configJson: body.configJson },
      select: { companyId: true, configJson: true },
    });

    // Invalidate cache to force reload with new override
    this.verticalConfigService.invalidateCache(id, company.organizationId);

    return override;
  }

  /**
   * DELETE /companies/:id/vertical/override
   * Remove the vertical configuration override for a company
   */
  @Delete(':id/vertical/override')
  async deleteVerticalOverride(@Param('id', ParseIntPipe) id: number) {
    const company = await this.getCompanyOrThrow(id);

    await this.prisma.companyVerticalOverride.deleteMany({
      where: { companyId: id },
    });

    // Invalidate cache to force reload without override
    this.verticalConfigService.invalidateCache(id, company.organizationId);

    return {
      companyId: id,
      deleted: true,
    };
  }

  private async getMigrationProgress(companyId: number) {
    const total = await this.prisma.product.count({
      where: { companyId },
    });
    if (total === 0) {
      return { total: 0, migrated: 0, legacy: 0, percentage: 100 };
    }
    const migrated = await this.prisma.product.count({
      where: {
        companyId,
        extraAttributes: { not: Prisma.JsonNull },
        isVerticalMigrated: true,
      },
    });
    const legacy = total - migrated;
    const percentage = total === 0 ? 100 : Math.round((migrated / total) * 100);
    return { total, migrated, legacy, percentage };
  }

  /**
   * GET /companies/:id/vertical/history
   * Fetch migration history for a specific company
   */
  @Get(':id/vertical/history')
  async getVerticalHistory(@Param('id', ParseIntPipe) id: number) {
    await this.getCompanyWithReadAccess(id);

    const history = await this.prisma.companyVerticalChangeAudit.findMany({
      where: { companyId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        oldVertical: true,
        newVertical: true,
        changeReason: true,
        warningsJson: true,
        success: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Get available rollback snapshot
    const snapshot = await this.prisma.companyVerticalRollbackSnapshot.findFirst({
      where: {
        companyId: id,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        snapshotData: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return {
      companyId: id,
      history,
      rollbackAvailable: !!snapshot,
      rollbackSnapshot: snapshot,
      totalChanges: history.length,
    };
  }

  /**
   * GET /companies/:id/vertical/metrics
   * Fetch detailed migration metrics for a specific company
   */
  @Get(':id/vertical/metrics')
  async getVerticalMetrics(@Param('id', ParseIntPipe) id: number) {
    const company = await this.getCompanyWithReadAccess(id);

    // Migration progress
    const progress = await this.getMigrationProgress(id);

    // Recent history (last 10 changes)
    const recentHistory = await this.prisma.companyVerticalChangeAudit.findMany({
      where: { companyId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        oldVertical: true,
        newVertical: true,
        success: true,
        createdAt: true,
      },
    });

    // Count successes vs failures
    const totalChanges = await this.prisma.companyVerticalChangeAudit.count({
      where: { companyId: id },
    });

    const successfulChanges = await this.prisma.companyVerticalChangeAudit.count({
      where: { companyId: id, success: true },
    });

    const failedChanges = totalChanges - successfulChanges;

    // Check for rollback availability
    const rollbackSnapshot = await this.prisma.companyVerticalRollbackSnapshot.findFirst({
      where: {
        companyId: id,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      companyId: id,
      currentVertical: company.businessVertical,
      migration: progress,
      statistics: {
        totalChanges,
        successfulChanges,
        failedChanges,
        successRate:
          totalChanges > 0
            ? Math.round((successfulChanges / totalChanges) * 100)
            : 100,
      },
      recentHistory,
      rollbackAvailable: !!rollbackSnapshot,
      rollbackExpiresAt: rollbackSnapshot?.expiresAt,
    };
  }

  /**
   * GET /companies/:id/vertical/notifications
   * Fetch recent vertical change notifications for a specific company
   */
  @Get(':id/vertical/notifications')
  async getVerticalNotifications(@Param('id', ParseIntPipe) id: number) {
    await this.getCompanyWithReadAccess(id);

    const notifications =
      await this.notificationsService.getRecentNotifications(id);

    return {
      companyId: id,
      notifications,
      total: notifications.length,
    };
  }

  /**
   * GET /companies/:id/vertical/history/export/csv
   * Export vertical change history as CSV file
   */
  @Get(':id/vertical/history/export/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="vertical-history.csv"')
  async exportHistoryCSV(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    await this.getCompanyWithReadAccess(id);

    // Rate limiting: max 10 CSV exports per hour per user
    const context = this.tenantContextService.getContextWithFallback();
    if (context.userId) {
      this.checkCsvExportRateLimit(context.userId);
    }

    const history = await this.prisma.companyVerticalChangeAudit.findMany({
      where: { companyId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        oldVertical: true,
        newVertical: true,
        changeReason: true,
        warningsJson: true,
        success: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    });

    // Generate CSV content
    const headers = [
      'ID',
      'Fecha',
      'Usuario',
      'Email Usuario',
      'Vertical Anterior',
      'Vertical Nuevo',
      'Razón',
      'Advertencias',
      'Estado',
    ];

    const rows = history.map((entry) => {
      const warnings = Array.isArray(entry.warningsJson)
        ? entry.warningsJson.join('; ')
        : '';

      return [
        entry.id,
        new Date(entry.createdAt).toLocaleString('es-PE', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
        entry.user?.username || 'N/A',
        entry.user?.email || 'N/A',
        entry.oldVertical,
        entry.newVertical,
        entry.changeReason || '',
        warnings,
        entry.success ? 'Exitoso' : 'Fallido',
      ];
    });

    // Escape CSV values
    const escapeCSV = (value: any): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Add BOM for Excel compatibility with UTF-8
    const bom = '\uFEFF';
    res.send(bom + csvContent);
  }
}
