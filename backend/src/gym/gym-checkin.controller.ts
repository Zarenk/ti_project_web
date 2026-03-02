import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { GymCheckinService } from './gym-checkin.service';
import { CreateGymCheckinDto } from './dto/create-gym-checkin.dto';

@Controller('gym/checkins')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class GymCheckinController {
  constructor(private readonly service: GymCheckinService) {}

  @Post()
  checkin(
    @Body() dto: CreateGymCheckinDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.checkin(dto, organizationId, companyId);
  }

  @Patch(':id/checkout')
  checkout(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.checkout(id, organizationId, companyId);
  }

  @Get()
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('memberId') memberId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findAll(organizationId, companyId, {
      memberId: memberId ? parseInt(memberId, 10) : undefined,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('active')
  getActive(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.getActiveCheckins(organizationId, companyId);
  }
}
