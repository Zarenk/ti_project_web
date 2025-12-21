import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { ModulePermission } from '../common/decorators/module-permission.decorator';
import { CurrentTenant } from '../tenancy/tenant-context.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN_GLOBAL')
@ModulePermission('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview(
    @Query('entriesLimit') entriesLimit = '10',
    @Query('salesLimit') salesLimit = '10',
    @Query('lowStockLimit') lowStockLimit = '10',
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const entriesTake = parseInt(entriesLimit, 10);
    const salesTake = parseInt(salesLimit, 10);
    const lowStockTake = parseInt(lowStockLimit, 10);

    return this.dashboardService.getOverview({
      entriesLimit: Number.isFinite(entriesTake) ? entriesTake : 10,
      salesLimit: Number.isFinite(salesTake) ? salesTake : 10,
      lowStockLimit: Number.isFinite(lowStockTake) ? lowStockTake : 10,
      organizationId: organizationId ?? undefined,
      companyId: companyId ?? undefined,
    });
  }
}
