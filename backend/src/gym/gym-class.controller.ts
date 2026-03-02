import {
  Body,
  Controller,
  Delete,
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
import { GymClassService } from './gym-class.service';
import { CreateGymClassDto } from './dto/create-gym-class.dto';
import { UpdateGymClassDto } from './dto/update-gym-class.dto';
import { CreateGymScheduleDto } from './dto/create-gym-schedule.dto';
import { CreateGymBookingDto } from './dto/create-gym-booking.dto';

@Controller('gym/classes')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class GymClassController {
  constructor(private readonly service: GymClassService) {}

  // ── Class endpoints ─────────────────────────────────────────────────────

  @Post()
  createClass(
    @Body() dto: CreateGymClassDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.createClass(dto, organizationId, companyId);
  }

  @Get()
  findAllClasses(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findAllClasses(organizationId, companyId, {
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  findOneClass(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.findOneClass(id, organizationId, companyId);
  }

  @Patch(':id')
  updateClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGymClassDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.updateClass(id, dto, organizationId, companyId);
  }
}

@Controller('gym/schedules')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class GymScheduleController {
  constructor(private readonly service: GymClassService) {}

  @Post()
  createSchedule(
    @Body() dto: CreateGymScheduleDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.createSchedule(dto, organizationId, companyId);
  }

  @Get()
  findAllSchedules(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('classId') classId?: string,
    @Query('trainerId') trainerId?: string,
    @Query('dayOfWeek') dayOfWeek?: string,
  ) {
    return this.service.findAllSchedules(organizationId, companyId, {
      classId: classId ? parseInt(classId, 10) : undefined,
      trainerId: trainerId ? parseInt(trainerId, 10) : undefined,
      dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek, 10) : undefined,
    });
  }

  @Delete(':id')
  deleteSchedule(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.deleteSchedule(id, organizationId, companyId);
  }
}

@Controller('gym/bookings')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class GymBookingController {
  constructor(private readonly service: GymClassService) {}

  @Post()
  createBooking(
    @Body() dto: CreateGymBookingDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.createBooking(dto, organizationId, companyId);
  }

  @Get()
  findBookings(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('scheduleId') scheduleId?: string,
    @Query('memberId') memberId?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findBookings(organizationId, companyId, {
      scheduleId: scheduleId ? parseInt(scheduleId, 10) : undefined,
      memberId: memberId ? parseInt(memberId, 10) : undefined,
      date,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Patch(':id/cancel')
  cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.cancelBooking(id, organizationId, companyId);
  }

  @Patch(':id/attendance')
  markAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'ATTENDED' | 'NO_SHOW',
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.markAttendance(id, status, organizationId, companyId);
  }
}
