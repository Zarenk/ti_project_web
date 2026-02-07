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
import { RestaurantTablesService } from './restaurant-tables.service';
import { CreateRestaurantTableDto } from './dto/create-restaurant-table.dto';
import { UpdateRestaurantTableDto } from './dto/update-restaurant-table.dto';

@Controller('restaurant-tables')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class RestaurantTablesController {
  constructor(private readonly service: RestaurantTablesService) {}

  @Post()
  @ApiOperation({ summary: 'Create restaurant table' })
  create(
    @Body() dto: CreateRestaurantTableDto,
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
    @Body() dto: UpdateRestaurantTableDto,
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
