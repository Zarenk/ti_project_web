import { Controller, Get, Logger, Req } from '@nestjs/common';
import type { Request } from 'express';
import { InvoiceTemplatesMetricsService } from './metrics.service';

@Controller('invoice-templates')
export class InvoiceTemplatesMetricsController {
  constructor(private readonly metricsService: InvoiceTemplatesMetricsService) {}
  private readonly logger = new Logger(InvoiceTemplatesMetricsController.name);

  @Get('metrics')
  getMetrics(@Req() req: Request) {
    const orgIdHeader = req.headers['x-org-id'];
    const companyIdHeader = req.headers['x-company-id'];
    this.logger.debug(`headers x-org-id=${orgIdHeader} x-company-id=${companyIdHeader}`);
    return this.metricsService.getMonitoringStats();
  }
}
