import { Controller, Get, Header, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ContextMetricsService } from './context-metrics.service';
import { GlobalSuperAdminGuard } from 'src/tenancy/global-super-admin.guard';
import { ContextPrometheusService } from './context-prometheus.service';

@Controller('context-metrics')
export class ContextMetricsController {
  constructor(
    private readonly metricsService: ContextMetricsService,
    private readonly prometheusService: ContextPrometheusService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyMetrics(@Request() req) {
    return this.metricsService.getUserSummary(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, GlobalSuperAdminGuard)
  @Get('summary')
  getGlobalSummary() {
    return this.metricsService.getGlobalSummary();
  }

  @UseGuards(JwtAuthGuard, GlobalSuperAdminGuard)
  @Get('prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getPrometheusMetrics() {
    return this.prometheusService.getMetricsSnapshot();
  }
}
