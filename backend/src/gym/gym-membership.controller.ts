import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { GymMembershipService } from './gym-membership.service';
import { CreateGymMembershipDto } from './dto/create-gym-membership.dto';
import { MembershipActionDto } from './dto/membership-action.dto';

@Controller('gym/memberships')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class GymMembershipController {
  constructor(private readonly service: GymMembershipService) {}

  @Post()
  create(
    @Body() dto: CreateGymMembershipDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.create(dto, organizationId, companyId);
  }

  @Get()
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('memberId') memberId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findAll(organizationId, companyId, {
      memberId: memberId ? parseInt(memberId, 10) : undefined,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.findOne(id, organizationId, companyId);
  }

  @Get(':id/events')
  getValidEvents(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.getValidEvents(id, organizationId, companyId);
  }

  @Post(':id/transition')
  applyEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MembershipActionDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.applyEvent(id, dto.event, organizationId, companyId);
  }
}
