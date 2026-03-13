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
  Query,
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

    const result = await this.tenancyService.selfCreateOrganization(
      dto,
      userId,
    );

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
  @Post(':orgId/members')
  async addMember(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() body: { email: string; role?: string },
    @Req() req: Request,
  ) {
    this.assertSuperAdminRole(req);
    if (!body.email?.trim()) {
      throw new BadRequestException('El email es requerido.');
    }
    const validUserRoles = ['ADMIN', 'EMPLOYEE'];
    const userRole = (body.role ?? 'EMPLOYEE').toUpperCase();
    if (!validUserRoles.includes(userRole)) {
      throw new BadRequestException(
        `Rol inválido. Roles permitidos: ${validUserRoles.join(', ')}`,
      );
    }
    // Map: ADMIN→ADMIN membership, EMPLOYEE→MEMBER membership
    const membershipRole = userRole === 'ADMIN' ? 'ADMIN' : 'MEMBER';
    return this.tenancyService.addMemberToOrg(orgId, body.email.trim(), membershipRole);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':orgId/members/:userId')
  async removeMember(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Req() req: Request,
  ) {
    this.assertSuperAdminRole(req);
    const performedByUserId = this.extractUserId(req);
    const result = await this.tenancyService.removeMember(
      orgId,
      targetUserId,
      performedByUserId,
    );

    this.contextEventsGateway.emitContextChanged(targetUserId, {
      orgId: result.nextOrgId ?? 0,
      companyId: result.nextCompanyId,
      updatedAt: new Date().toISOString(),
    });

    return { removed: result.removed };
  }

  // ── Membership Requests ─────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('membership-requests')
  async createMembershipRequest(
    @Body() body: { toOrganizationId: number; reason?: string },
    @Req() req: Request,
  ) {
    const userId = this.extractUserId(req);
    if (!body.toOrganizationId) {
      throw new BadRequestException('toOrganizationId es requerido.');
    }
    return this.tenancyService.createMembershipRequest(
      userId,
      body.toOrganizationId,
      body.reason,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':orgId/membership-requests')
  async getPendingRequests(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Req() req: Request,
  ) {
    this.assertSuperAdminRole(req);
    return this.tenancyService.getPendingRequests(orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('membership-requests/:requestId/approve')
  async approveMembershipRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() body: { resolutionNote?: string },
    @Req() req: Request,
  ) {
    this.assertSuperAdminRole(req);
    const resolvedBy = this.extractUserId(req);
    return this.tenancyService.approveMembershipRequest(
      requestId,
      resolvedBy,
      body.resolutionNote,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('membership-requests/:requestId/reject')
  async rejectMembershipRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() body: { resolutionNote?: string },
    @Req() req: Request,
  ) {
    this.assertSuperAdminRole(req);
    const resolvedBy = this.extractUserId(req);
    return this.tenancyService.rejectMembershipRequest(
      requestId,
      resolvedBy,
      body.resolutionNote,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('members/move')
  async moveMember(
    @Body()
    body: {
      targetUserId: number;
      fromOrganizationId: number;
      toOrganizationId: number;
      role?: string;
      reason?: string;
    },
    @Req() req: Request,
  ) {
    this.assertGlobalSuperAdminRole(req);
    const { targetUserId, fromOrganizationId, toOrganizationId, reason } = body;
    if (!targetUserId || !fromOrganizationId || !toOrganizationId) {
      throw new BadRequestException(
        'targetUserId, fromOrganizationId y toOrganizationId son requeridos.',
      );
    }
    const validUserRoles = ['ADMIN', 'EMPLOYEE'];
    const userRole = (body.role ?? 'EMPLOYEE').toUpperCase();
    if (!validUserRoles.includes(userRole)) {
      throw new BadRequestException(
        `Rol inválido. Roles permitidos: ${validUserRoles.join(', ')}`,
      );
    }
    // Map user role to membership role: ADMIN→ADMIN, EMPLOYEE→MEMBER
    const membershipRole = userRole === 'ADMIN' ? 'ADMIN' : 'MEMBER';
    const performedByUserId = this.extractUserId(req);
    const result = await this.tenancyService.moveMember(
      targetUserId,
      fromOrganizationId,
      toOrganizationId,
      membershipRole,
      performedByUserId,
      reason,
      userRole, // pass user role to update User.role
    );

    if (result.nextOrgId) {
      this.contextEventsGateway.emitContextChanged(targetUserId, {
        orgId: result.nextOrgId,
        companyId: result.nextCompanyId,
        updatedAt: new Date().toISOString(),
      });
    }

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('global/transfer-history')
  async getGlobalTransferHistory(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Req() req?: Request,
  ) {
    this.assertGlobalSuperAdminRole(req!);
    const page = pageRaw ? Number(pageRaw) : 1;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : 20;
    return this.tenancyService.getGlobalTransferHistory(page, pageSize);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':orgId/transfer-history')
  async getTransferHistory(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Req() req: Request,
  ) {
    this.assertSuperAdminRole(req);
    return this.tenancyService.getTransferHistory(orgId);
  }

  // ── Helpers ─────────────────────────────────────────────────

  private extractUserId(req: Request): number {
    const userId =
      (req as any).user?.userId ??
      (req as any).user?.sub ??
      (req as any).user?.id;
    if (typeof userId !== 'number') {
      throw new BadRequestException('No se pudo identificar al usuario.');
    }
    return userId;
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

  private assertGlobalSuperAdminRole(req: Request): void {
    const role = ((req as any).user?.role ?? '').toString().toUpperCase();
    if (role !== 'SUPER_ADMIN_GLOBAL') {
      throw new ForbiddenException(
        'Solo Super Admin Global puede mover usuarios entre organizaciones.',
      );
    }
  }
}
