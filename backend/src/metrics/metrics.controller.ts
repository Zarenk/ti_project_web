import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('metrics')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(@Res({ passthrough: true }) res: Response): Promise<string> {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return this.metrics.getMetrics();
  }
}
