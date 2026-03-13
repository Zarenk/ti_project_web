import {
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Patch,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { GlobalSuperAdminGuard } from 'src/tenancy/global-super-admin.guard';
import { AdminSignupsService } from './admin-signups.service';

@UseGuards(JwtAuthGuard, GlobalSuperAdminGuard)
@Controller('admin/signups')
export class AdminSignupsController {
  constructor(private readonly service: AdminSignupsService) {}

  /** GET /admin/signups/stats — summary cards */
  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  /** GET /admin/signups/attempts — paginated list of signup attempts */
  @Get('attempts')
  listAttempts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listAttempts({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      status: status || undefined,
      search: search || undefined,
    });
  }

  /** GET /admin/signups/trials — organizations currently in trial */
  @Get('trials')
  listTrials(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listTrials({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      search: search || undefined,
    });
  }

  /** GET /admin/signups/blocklist — blocked IPs/domains/devices */
  @Get('blocklist')
  listBlocklist(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listBlocklist({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
    });
  }

  /** DELETE /admin/signups/blocklist/:id — unblock an entry */
  @Delete('blocklist/:id')
  unblock(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeBlocklistEntry(id);
  }

  /** PATCH /admin/signups/verify/:userId — manually verify a user's email */
  @Patch('verify/:userId')
  manualVerify(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.manualVerifyEmail(userId);
  }

  /** PATCH /admin/signups/trials/:orgId/extend — extend a trial */
  @Patch('trials/:orgId/extend')
  extendTrial(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() body: { days: number },
  ) {
    const days = Math.min(90, Math.max(1, Number(body.days) || 7));
    return this.service.extendTrial(orgId, days);
  }
}
