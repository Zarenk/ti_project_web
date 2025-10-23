import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { QueryActivityDto } from './dto/query-activity.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query() query: QueryActivityDto) {
    return this.activityService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('stats')
  stats() {
    return this.activityService.stats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activityService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/:userId')
  findAllByUser(@Param('userId') userId: string) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
      throw new BadRequestException(
        'El ID del usuario debe ser un número válido',
      );
    }
    return this.activityService.findAllByUser(id);
  }
}
