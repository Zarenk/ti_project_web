import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { SelfCreateOrgDto } from './dto/self-create-org.dto';
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

  @UseGuards(JwtAuthGuard)
  @Post('self-create')
  async selfCreate(
    @Body() dto: SelfCreateOrgDto,
    @Req() req: Request,
  ): Promise<{ organizationId: number; companyId: number }> {
    const userId =
      (req as any).user?.userId ??
      (req as any).user?.sub ??
      (req as any).user?.id;
    if (typeof userId !== 'number') {
      throw new BadRequestException('No se pudo identificar al usuario.');
    }

    const result = await this.tenancyService.selfCreateOrganization(dto, userId);

    this.contextEventsGateway.emitContextChanged(userId, {
      orgId: result.organizationId,
      companyId: result.companyId,
      updatedAt: new Date().toISOString(),
    });

    return result;
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

  @UseGuards(JwtAuthGuard)
  @Get(':orgId/members')
  async getMembers(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Req() req: Request,
  ) {
    this.assertSuperAdminRole(req);
    return this.tenancyService.getOrganizationMembers(orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':orgId/members/:userId')
  async removeMember(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Req() req: Request,
  ) {
    this.assertSuperAdminRole(req);
    const performedByUserId =
      (req as any).user?.userId ??
      (req as any).user?.sub ??
      (req as any).user?.id;
    if (typeof performedByUserId !== 'number') {
      throw new BadRequestException('No se pudo identificar al usuario.');
    }
    const result = await this.tenancyService.removeMember(orgId, targetUserId, performedByUserId);

    this.contextEventsGateway.emitContextChanged(targetUserId, {
      orgId: result.nextOrgId ?? 0,
      companyId: result.nextCompanyId,
      updatedAt: new Date().toISOString(),
    });

    return { removed: result.removed };
  }

  private assertSuperAdminRole(req: Request): void {
    const role = ((req as any).user?.role ?? '').toString().toUpperCase();
    const allowed = new Set(['SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG']);
    if (!allowed.has(role)) {
      throw new ForbiddenException(
        'Solo Super Admins pueden gestionar miembros de la organización.',
      );
    }
  }
}
