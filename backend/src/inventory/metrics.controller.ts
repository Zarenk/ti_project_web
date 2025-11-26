import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantContextGuard } from 'src/tenancy/tenant-context.guard';
import { ModulePermissionsGuard } from 'src/common/guards/module-permissions.guard';
import { InvoiceTemplatesMetricsService } from 'src/invoice-templates/metrics.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantContextGuard, ModulePermissionsGuard)
export class InventoryMetricsController {
  private readonly logger = new Logger(InventoryMetricsController.name);
  constructor(private readonly metricsService: InvoiceTemplatesMetricsService) {}

  @Get('metrics')
  getMetrics() {
    this.logger.debug('inventory metrics requested');
    return this.metricsService.getMonitoringStats();
  }
}
