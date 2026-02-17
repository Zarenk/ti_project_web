import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenancyService, TenantSelectionSummary } from './tenancy.service';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import { TenancySnapshot } from './entities/tenancy.entity';
import { GlobalSuperAdminGuard } from './global-super-admin.guard';
import { AssignSuperAdminDto } from './dto/assign-super-admin.dto';
import { ValidateOrganizationNameDto } from './dto/validate-organization-name.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantContextService } from './tenant-context.service';
import { ContextEventsGateway } from 'src/users/context-events.gateway';
import type { Request } from 'express';
import type { TenantContext } from './tenant-context.interface';

@Controller('tenancy')
export class TenancyController {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly tenantContextService: TenantContextService,
    private readonly contextEventsGateway: ContextEventsGateway,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentTenant(
    @Req() request: Request,
  ): Promise<TenantSelectionSummary> {
    try {
      const context = this.tenantContextService.getContextWithFallback();
      (request as any).tenantContext = context;
      const summary = await this.tenancyService.resolveTenantSelection(context);

      if (summary.organization || summary.company) {
        this.tenantContextService.updateContext({
          organizationId: summary.organization?.id ?? context.organizationId,
          companyId: summary.company?.id ?? context.companyId,
        });
        (request as any).tenantContext = this.tenantContextService.getContext();
      }

      return summary;
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        throw error;
      }

      const fallbackContext: TenantContext = {
        organizationId: null,
        companyId: null,
        organizationUnitId: null,
        userId: null,
        isGlobalSuperAdmin: true,
        isOrganizationSuperAdmin: false,
        isSuperAdmin: true,
        allowedOrganizationIds: [],
        allowedCompanyIds: [],
        allowedOrganizationUnitIds: [],
      };

      const summary =
        await this.tenancyService.resolveTenantSelection(fallbackContext);

      if (summary.organization || summary.company) {
        this.tenantContextService.updateContext({
          organizationId: summary.organization?.id ?? null,
          companyId: summary.company?.id ?? null,
        });
        (request as any).tenantContext =
          this.tenantContextService.getContextWithFallback();
      }

      return summary;
    }
  }

  @UseGuards(JwtAuthGuard, GlobalSuperAdminGuard)
  @Post()
  async create(
    @Body() createTenancyDto: CreateTenancyDto,
    @Req() req: Request,
  ): Promise<TenancySnapshot> {
    const result = await this.tenancyService.create(createTenancyDto);

    const userId =
      (req as any).user?.userId ??
      (req as any).user?.sub ??
      (req as any).user?.id;
    if (typeof userId === 'number' && result.id) {
      const primaryCompany = result.companies?.[0] ?? null;
      this.contextEventsGateway.emitContextChanged(userId, {
        orgId: result.id,
        companyId: primaryCompany?.id ?? null,
        updatedAt: new Date().toISOString(),
      });
    }

    return result;
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Post('validate-name')
  async validateOrganizationName(
    @Body() dto: ValidateOrganizationNameDto,
  ): Promise<{ nameAvailable: boolean }> {
    return this.tenancyService.validateOrganizationName(dto.name);
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Get()
  findAll(): Promise<TenancySnapshot[]> {
    return this.tenancyService.findAll();
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TenancySnapshot> {
    return this.tenancyService.findOne(id);
  }

  @Get('resolve/slug/:slug')
  resolveBySlug(@Param('slug') slug: string): Promise<TenancySnapshot> {
    return this.tenancyService.findBySlug(slug);
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenancyDto: UpdateTenancyDto,
  ): Promise<TenancySnapshot> {
    return this.tenancyService.update(id, updateTenancyDto);
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Patch(':id/super-admin')
  assignSuperAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignSuperAdminDto,
  ): Promise<TenancySnapshot> {
    return this.tenancyService.assignSuperAdmin(id, dto.userId);
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<TenancySnapshot> {
    return this.tenancyService.remove(id);
  }
}
