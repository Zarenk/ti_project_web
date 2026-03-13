import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { GlobalSuperAdminGuard } from 'src/tenancy/global-super-admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';

@UseGuards(JwtAuthGuard, GlobalSuperAdminGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  /** GET /admin/dashboard/global-overview */
  @Get('global-overview')
  getGlobalOverview() {
    return this.service.getGlobalOverview();
  }

  /** GET /admin/dashboard/sunat */
  @Get('sunat')
  getSunatOverview() {
    return this.service.getSunatOverview();
  }

  /** GET /admin/dashboard/security */
  @Get('security')
  getSecurityOverview() {
    return this.service.getSecurityOverview();
  }

  /** GET /admin/dashboard/audit-log */
  @Get('audit-log')
  getAuditLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.service.getAuditLog({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      action: action || undefined,
      search: search || undefined,
      entityType: entityType || undefined,
    });
  }

  /** GET /admin/dashboard/financial */
  @Get('financial')
  getFinancialHealth() {
    return this.service.getFinancialHealth();
  }

  /** GET /admin/dashboard/sales-inventory */
  @Get('sales-inventory')
  getSalesInventoryOverview() {
    return this.service.getSalesInventoryOverview();
  }

  /** GET /admin/dashboard/whatsapp */
  @Get('whatsapp')
  getWhatsappOverview() {
    return this.service.getWhatsappOverview();
  }

  /** GET /admin/dashboard/plans */
  @Get('plans')
  getPlansOverview() {
    return this.service.getPlansOverview();
  }
}
