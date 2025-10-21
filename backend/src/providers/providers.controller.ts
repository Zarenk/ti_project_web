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
  Query,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { Request } from 'express';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';

@ModulePermission(['inventory', 'purchases'])
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a provider' })
  create(
    @Body() createProviderDto: CreateProviderDto,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.providersService.create(
      createProviderDto,
      req,
      organizationId === undefined ? undefined : organizationId,
    );
  }

  // providers.controller.ts
  @Post('check')
  async checkProvider(
    @Body('documentNumber') documentNumber: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    if (!documentNumber) {
      throw new BadRequestException("El Nombre y el Ruc son obligatorios.");
    }

    const exists = await this.providersService.checkIfExists(
      documentNumber,
      organizationId === undefined ? undefined : organizationId,
    );
    return { exists };
  }

  @Get()
  @ApiResponse({status: 200, description: 'Return all providers'}) // Swagger
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @Query('search') search?: string,
  ) {
    const trimmedSearch = typeof search === 'string' ? search.trim() : undefined;
    const hasSearch = Boolean(trimmedSearch);

    if (organizationId === undefined && !hasSearch) {
      return this.providersService.findAll();
    }

    return this.providersService.findAll({
      ...(organizationId === undefined ? {} : { organizationId }),
      ...(hasSearch ? { search: trimmedSearch } : {}),
    });
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    const numericId = parseInt(id, 10); // Convierte el ID a un número entero
    if (isNaN(numericId)) {
    throw new BadRequestException('El ID debe ser un número válido.');
    }
    return this.providersService.findOne(
      numericId,
      organizationId === undefined ? undefined : organizationId,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @Req() req: Request,
  ) {
    return this.providersService.update(
      +id,
      updateProviderDto,
      req,
      organizationId === undefined ? undefined : organizationId,
    );
  }

  @Patch()
  @ApiOperation({ summary: 'Update multiple providers with the same values' }) // Swagger
  @ApiResponse({ status: 200, description: 'Providers updated successfully' }) // Swagger
  async updateMany(
    @Body() updateProvidersDto: UpdateProviderDto[],
    @CurrentTenant('organizationId') organizationId: number | null,
    @Req() req: Request,
  ) {

    if (!Array.isArray(updateProvidersDto) || updateProvidersDto.length === 0) {
      throw new BadRequestException('No se proporcionaron proveedores para actualizar.');
    }

    // Delegar la lógica al servicio
    return this.providersService.updateMany(
      updateProvidersDto,
      req,
      organizationId === undefined ? undefined : organizationId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @Req() req: Request,
  ) {
    return this.providersService.remove(
      +id,
      req,
      organizationId === undefined ? undefined : organizationId,
    );
  }

  @Delete()
  async removes(
    @Body('ids') ids: number[],
    @CurrentTenant('organizationId') organizationId: number | null,
    @Req() req: Request,
  ) {
    return this.providersService.removes(
      ids,
      req,
      organizationId === undefined ? undefined : organizationId,
    );
  }
}