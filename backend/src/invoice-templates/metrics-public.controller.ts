import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantContextGuard } from 'src/tenancy/tenant-context.guard';
import { InvoiceTemplatesMetricsService } from './metrics.service';
import { SkipModulePermissionsGuard } from 'src/common/decorators/skip-module-permission.decorator';
import { SkipTenantContextGuard } from 'src/tenancy/skip-tenant-context.decorator';

@Controller('invoice-templates')
@SkipModulePermissionsGuard()
@SkipTenantContextGuard()
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class InvoiceTemplatesMetricsPublicController {
  constructor(
    private readonly metricsService: InvoiceTemplatesMetricsService,
  ) {}

  @Get('metrics-public')
  getPublicMetrics() {
    return this.metricsService.getMonitoringStats();
  }
}
