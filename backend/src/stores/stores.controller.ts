import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @ApiOperation({ summary: 'Create a store' })
  create(
    @Body() createStoreDto: CreateStoreDto,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.storesService.create(
      createStoreDto,
      req,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Return all stores' })
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.storesService.findAll(
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
    return this.storesService.findOne(
      numericId,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Post('check')
  async checkStore(
    @Body('name') name: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!name) {
      throw new BadRequestException('El nombre de la tienda es obligatorio.');
    }

    const exists = await this.storesService.checkIfExists(
      name,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
    return { exists };
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStoreDto: UpdateStoreDto,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.storesService.update(
      +id,
      updateStoreDto,
      req,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Patch()
  @ApiOperation({ summary: 'Update multiple stores with the same values' })
  @ApiResponse({ status: 200, description: 'Stores updated successfully' })
  async updateMany(
    @Body() updateStoresDto: UpdateStoreDto[],
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!Array.isArray(updateStoresDto) || updateStoresDto.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron tiendas para actualizar.',
      );
    }

    return this.storesService.updateMany(
      updateStoresDto,
      req,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.storesService.remove(
      +id,
      req,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Delete()
  async removes(
    @Body('ids') ids: number[],
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.storesService.removes(
      ids,
      req,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }
}
