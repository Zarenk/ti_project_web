import {
  Body,
  Controller,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { GlobalSuperAdminGuard } from 'src/tenancy/global-super-admin.guard';
import { SubscriptionsService } from './subscriptions.service';
import { AdminPlanMigrationDto } from './dto/admin-plan-migration.dto';
import { ChangePlanDto } from './dto/change-plan.dto';

@UseGuards(JwtAuthGuard, GlobalSuperAdminGuard)
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  private readonly logger = new Logger(AdminSubscriptionsController.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post(':orgId/migrate')
  async migratePlan(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() dto: AdminPlanMigrationDto,
  ) {
    const payload: ChangePlanDto = {
      organizationId: orgId,
      planCode: dto.planCode,
    };

    if (dto.effectiveAt) {
      const parsed = new Date(dto.effectiveAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Fecha effectiveAt invalida');
      }
      payload.effectiveImmediately = parsed <= new Date();
    }

    this.logger.log(
      `Admin plan migration requested org=${orgId} plan=${dto.planCode} effectiveAt=${dto.effectiveAt}`,
    );

    return this.subscriptionsService.requestPlanChange(payload);
  }
}
