import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { KitchenStationsService } from './kitchen-stations.service';
import { CreateKitchenStationDto } from './dto/create-kitchen-station.dto';
import { UpdateKitchenStationDto } from './dto/update-kitchen-station.dto';

@Controller('kitchen-stations')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class KitchenStationsController {
  constructor(private readonly service: KitchenStationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create kitchen station' })
  create(
    @Body() dto: CreateKitchenStationDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.create(
      dto,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Get()
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.findAll(
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un numero valido.');
    }
    return this.service.findOne(
      numericId,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateKitchenStationDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un numero valido.');
    }
    return this.service.update(
      numericId,
      dto,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un numero valido.');
    }
    return this.service.remove(
      numericId,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }
}
