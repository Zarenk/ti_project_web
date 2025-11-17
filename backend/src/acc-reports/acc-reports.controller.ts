import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccReportsService } from './acc-reports.service';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

@Controller('acc-reports')
export class AccReportsController {
  constructor(private readonly service: AccReportsService) {}

  @Post('trial-balance')
  async enqueue(
    @Body() body: { startDate: string; endDate: string; cache?: boolean },
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    const id = await this.service.enqueueTrialBalance(tenant, body);
    return { jobId: id };
  }

  @Get(':id')
  async status(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.service.getJob(tenant, id);
  }
}
