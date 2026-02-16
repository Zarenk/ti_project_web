import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Res,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { QueryActivityDto } from './dto/query-activity.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { Response, Request as ExpressRequest } from 'express';
import { CurrentTenant } from '../tenancy/tenant-context.decorator';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  private resolveScope(
    req: ExpressRequest,
    organizationId: number | null | undefined,
    companyId: number | null | undefined,
  ) {
    const role =
      typeof (req as any)?.user?.role === 'string'
        ? (req as any).user.role.toUpperCase()
        : undefined;

    if (role === 'SUPER_ADMIN_GLOBAL') {
      return { organizationId: undefined, companyId: undefined };
    }

    if (role === 'SUPER_ADMIN_ORG' || role === 'SUPER_ADMIN') {
      if (organizationId === null || organizationId === undefined) {
        throw new ForbiddenException('Organization scope required');
      }
      return { organizationId, companyId: undefined };
    }

    throw new ForbiddenException('Forbidden resource');
  }

  private resolveUserScope(
    req: ExpressRequest,
    organizationId: number | null | undefined,
    companyId: number | null | undefined,
  ) {
    const role =
      typeof (req as any)?.user?.role === 'string'
        ? (req as any).user.role.toUpperCase()
        : undefined;

    if (role === 'SUPER_ADMIN_GLOBAL') {
      if (organizationId === null || organizationId === undefined) {
        throw new ForbiddenException('Organization scope required');
      }
      return { organizationId, companyId: undefined };
    }

    if (role === 'SUPER_ADMIN_ORG' || role === 'SUPER_ADMIN') {
      if (organizationId === null || organizationId === undefined) {
        throw new ForbiddenException('Organization scope required');
      }
      return { organizationId, companyId: undefined };
    }

    throw new ForbiddenException('Forbidden resource');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL')
  @Get()
  findAll(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.findAll(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL')
  @Get('stats')
  stats(
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.stats(scope.organizationId, scope.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL')
  @Get('summary')
  summary(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.summary(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL')
  @Get('timeseries')
  timeSeries(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.timeSeries(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL')
  @Get('actors')
  actors(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.actors(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL')
  @Get('export')
  async export(
    @Query() query: QueryActivityDto,
    @Res() res: Response,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveScope(req, organizationId, companyId);
    const csv = await this.activityService.export(
      query,
      scope.organizationId,
      scope.companyId,
    );
    const filename = `activity-export-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL')
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveScope(req, organizationId, companyId);
    return this.activityService.findOne(
      id,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/actors')
  userActors(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    if (scope.organizationId === undefined) {
      throw new ForbiddenException('Organization scope required');
    }
    return this.activityService.searchOrganizationUsers(
      scope.organizationId,
      query.q,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/summary')
  usersSummary(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    if (scope.organizationId === undefined) {
      throw new ForbiddenException('Organization scope required');
    }
    return this.activityService.organizationSummary(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/timeseries')
  usersTimeSeries(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    if (scope.organizationId === undefined) {
      throw new ForbiddenException('Organization scope required');
    }
    return this.activityService.organizationTimeSeries(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/heatmap')
  usersHeatmap(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    if (scope.organizationId === undefined) {
      throw new ForbiddenException('Organization scope required');
    }
    return this.activityService.organizationHeatmap(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/breakdown')
  usersBreakdown(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    if (scope.organizationId === undefined) {
      throw new ForbiddenException('Organization scope required');
    }
    return this.activityService.organizationBreakdown(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/options')
  usersOptions(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    if (scope.organizationId === undefined) {
      throw new ForbiddenException('Organization scope required');
    }
    return this.activityService.organizationOptions(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users')
  usersActivity(
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const scope = this.resolveUserScope(req, organizationId, companyId);
    if (scope.organizationId === undefined) {
      throw new ForbiddenException('Organization scope required');
    }
    return this.activityService.organizationActivity(
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/:userId')
  async findAllByUser(
    @Param('userId') userId: string,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
      throw new BadRequestException(
        'El ID del usuario debe ser un número válido',
      );
    }
    await this.activityService.ensureUserVisible(id);
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.findAllByUser(
      id,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/:userId/summary')
  async userSummary(
    @Param('userId') userId: string,
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
      throw new BadRequestException(
        'El ID del usuario debe ser un nǧmero vǭlido',
      );
    }
    await this.activityService.ensureUserVisible(id);
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.userSummary(
      id,
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/:userId/timeseries')
  async userTimeSeries(
    @Param('userId') userId: string,
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
      throw new BadRequestException(
        'El ID del usuario debe ser un nǧmero vǭlido',
      );
    }
    await this.activityService.ensureUserVisible(id);
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.userTimeSeries(
      id,
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/:userId/heatmap')
  async userHeatmap(
    @Param('userId') userId: string,
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
      throw new BadRequestException(
        'El ID del usuario debe ser un numero valido',
      );
    }
    await this.activityService.ensureUserVisible(id);
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.userHeatmap(
      id,
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/:userId/breakdown')
  async userBreakdown(
    @Param('userId') userId: string,
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
      throw new BadRequestException(
        'El ID del usuario debe ser un nǧmero vǭlido',
      );
    }
    await this.activityService.ensureUserVisible(id);
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.userBreakdown(
      id,
      query,
      scope.organizationId,
      scope.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'SUPER_ADMIN')
  @Get('users/:userId/options')
  async userOptions(
    @Param('userId') userId: string,
    @Query() query: QueryActivityDto,
    @Request() req: ExpressRequest,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
      throw new BadRequestException(
        'El ID del usuario debe ser un nǧmero vǭlido',
      );
    }
    await this.activityService.ensureUserVisible(id);
    const scope = this.resolveUserScope(req, organizationId, companyId);
    return this.activityService.userOptions(
      id,
      query,
      scope.organizationId,
      scope.companyId,
    );
  }
}
