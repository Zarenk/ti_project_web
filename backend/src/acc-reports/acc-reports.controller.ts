import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccReportsService } from './acc-reports.service';

@Controller('acc-reports')
export class AccReportsController {
  constructor(private readonly service: AccReportsService) {}

  @Post('trial-balance')
  async enqueue(
    @Body() body: { startDate: string; endDate: string; cache?: boolean },
  ) {
    const id = await this.service.enqueueTrialBalance(body);
    return { jobId: id };
  }

  @Get(':id')
  async status(@Param('id') id: string) {
    return this.service.getJob(id);
  }
}