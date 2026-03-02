import { Controller, Get, Post, Body, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { JurisprudenceAdminService } from './jurisprudence-admin.service';
import { JurisprudenceCoverageService } from './jurisprudence-coverage.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { TenantRequiredGuard } from '../common/guards/tenant-required.guard';
import { Roles } from '../users/roles.decorator';
import { ModulePermission } from '../common/decorators/module-permission.decorator';
import { UserRole } from '@prisma/client';

@Controller('jurisprudence-admin')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@ModulePermission('legal')
export class JurisprudenceAdminController {
  constructor(
    private readonly adminService: JurisprudenceAdminService,
    private readonly coverageService: JurisprudenceCoverageService,
  ) {}

  /**
   * GET /jurisprudence-admin/coverage
   * Coverage dashboard - shows processing status of documents
   */
  @Get('coverage')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN_GLOBAL, UserRole.SUPER_ADMIN_ORG)
  async getCoverage(@Req() req: any) {
    const { organizationId, companyId } = req.tenantContext;

    const coverage = await this.coverageService.getCoverage(organizationId, companyId);

    return {
      success: true,
      coverage,
    };
  }

  /**
   * GET /jurisprudence-admin/failed-documents
   * List of documents that failed processing
   */
  @Get('failed-documents')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN_GLOBAL, UserRole.SUPER_ADMIN_ORG)
  async getFailedDocuments(
    @Req() req: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const { organizationId, companyId } = req.tenantContext;

    const failed = await this.coverageService.getFailedDocuments(
      organizationId,
      companyId,
      limit || 50,
    );

    return {
      success: true,
      failed,
      count: failed.length,
    };
  }

  /**
   * GET /jurisprudence-admin/pending-documents
   * List of documents currently being processed
   */
  @Get('pending-documents')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN_GLOBAL, UserRole.SUPER_ADMIN_ORG)
  async getPendingDocuments(
    @Req() req: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const { organizationId, companyId } = req.tenantContext;

    const pending = await this.coverageService.getPendingDocuments(
      organizationId,
      companyId,
      limit || 50,
    );

    return {
      success: true,
      pending,
      count: pending.length,
    };
  }

  /**
   * GET /jurisprudence-admin/stats/queries
   * Query statistics (accuracy, latency, cost)
   */
  @Get('stats/queries')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN_GLOBAL, UserRole.SUPER_ADMIN_ORG)
  async getQueryStats(@Req() req: any) {
    const { organizationId, companyId } = req.tenantContext;

    const stats = await this.adminService.getQueryStats(organizationId, companyId);

    return {
      success: true,
      stats,
    };
  }

  /**
   * POST /jurisprudence-admin/reprocess
   * Trigger reprocessing of documents
   */
  @Post('reprocess')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN_GLOBAL, UserRole.SUPER_ADMIN_ORG)
  async reprocessDocuments(
    @Req() req: any,
    @Body()
    body: {
      documentIds?: number[];
      court?: string;
      year?: number;
      failedOnly?: boolean;
    },
  ) {
    const { organizationId, companyId } = req.tenantContext;

    const result = await this.adminService.reprocessDocuments(organizationId, companyId, body);

    return result;
  }

  /**
   * GET /jurisprudence-admin/health
   * Overall system health status
   */
  @Get('health')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN_GLOBAL, UserRole.SUPER_ADMIN_ORG)
  async getHealth(@Req() req: any) {
    const { organizationId, companyId } = req.tenantContext;

    const health = await this.adminService.getSystemHealth(organizationId, companyId);

    return {
      success: true,
      ...health,
    };
  }
}
