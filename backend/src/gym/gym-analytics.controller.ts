import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { GymAnalyticsService } from './gym-analytics.service';

@Controller('gym/analytics')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class GymAnalyticsController {
  constructor(private readonly analytics: GymAnalyticsService) {}

  @Get('overview')
  getOverview(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.analytics.getOverview(organizationId, companyId);
  }

  @Get('membership-distribution')
  getMembershipDistribution(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.analytics.getMembershipDistribution(organizationId, companyId);
  }

  @Get('checkin-trend')
  getCheckinTrend(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.analytics.getCheckinTrend(
      Math.min(days, 90),
      organizationId,
      companyId,
    );
  }

  @Get('popular-classes')
  getPopularClasses(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.analytics.getPopularClasses(organizationId, companyId);
  }

  @Get('checkins-by-hour')
  getCheckinsByHour(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.analytics.getCheckinsByHour(organizationId, companyId);
  }

  @Get('new-members-monthly')
  getNewMembersMonthly(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.analytics.getNewMembersMonthly(organizationId, companyId);
  }

  @Get('revenue')
  getRevenueSummary(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.analytics.getRevenueSummary(organizationId, companyId);
  }
}
