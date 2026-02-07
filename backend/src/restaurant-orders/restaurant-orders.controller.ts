import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { RestaurantOrdersService } from './restaurant-orders.service';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { UpdateRestaurantOrderDto } from './dto/update-restaurant-order.dto';
import { UpdateRestaurantOrderItemDto } from './dto/update-restaurant-order-item.dto';

@Controller('restaurant-orders')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class RestaurantOrdersController {
  constructor(private readonly service: RestaurantOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create restaurant order' })
  create(
    @Body() dto: CreateRestaurantOrderDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
  ) {
    return this.service.create(
      dto,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
      req.user?.userId ?? null,
    );
  }

  @Get()
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('status') status?: string,
  ) {
    const normalized =
      status && typeof status === 'string'
        ? status.trim().toUpperCase()
        : undefined;
    return this.service.findAll(
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
      normalized as any,
    );
  }

  @Get('kitchen')
  findKitchenQueue(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('stationId') stationId?: string,
  ) {
    const parsedStationId = stationId ? Number(stationId) : undefined;
    if (stationId && Number.isNaN(parsedStationId)) {
      throw new BadRequestException('stationId debe ser numerico.');
    }
    return this.service.findKitchenQueue(
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
      parsedStationId,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantOrderDto,
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
}

@Controller('restaurant-order-items')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class RestaurantOrderItemsController {
  constructor(private readonly service: RestaurantOrdersService) {}

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantOrderItemDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un numero valido.');
    }
    return this.service.updateItem(
      numericId,
      dto,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }
}
