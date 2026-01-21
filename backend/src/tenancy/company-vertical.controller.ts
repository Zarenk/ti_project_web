import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
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

const ALLOWED_VERTICALS = new Set<BusinessVertical>([
  BusinessVertical.GENERAL,
  BusinessVertical.COMPUTERS,
  BusinessVertical.RETAIL,
  BusinessVertical.RESTAURANTS,
]);

@Controller('companies')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class CompanyVerticalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
    private readonly verticalConfigService: VerticalConfigService,
    private readonly compatibilityService: VerticalCompatibilityService,
    private readonly migrationService: VerticalMigrationService,
  ) {}

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

  private ensureAllowedVertical(vertical: BusinessVertical): void {
    if (!ALLOWED_VERTICALS.has(vertical)) {
      throw new BadRequestException(
        'Este vertical aun no esta disponible en esta fase.',
      );
    }
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

  @Get(':id/vertical')
  async getVertical(@Param('id', ParseIntPipe) id: number) {
    const company = await this.getCompanyOrThrow(id);
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
    await this.getCompanyOrThrow(id);
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
}
