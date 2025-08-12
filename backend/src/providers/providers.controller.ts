import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, Req } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { Request } from 'express';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @ApiOperation({summary: 'Create a provider'})    // Swagger
  create(@Body() createProviderDto: CreateProviderDto, @Req() req: Request) {
    return this.providersService.create(createProviderDto, req);
  }

  // providers.controller.ts
  @Post("check")
  async checkProvider(@Body("documentNumber") documentNumber: string) {
    if (!documentNumber) {
      throw new BadRequestException("El Nombre y el Ruc son obligatorios.");
    }

    const exists = await this.providersService.checkIfExists(documentNumber);
    return { exists };
  }

  @Get()
  @ApiResponse({status: 200, description: 'Return all providers'}) // Swagger 
  findAll() {
    return this.providersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const numericId = parseInt(id, 10); // Convierte el ID a un número entero
    if (isNaN(numericId)) {
    throw new BadRequestException('El ID debe ser un número válido.');
    }
    return this.providersService.findOne(numericId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
    @Req() req: Request,
  ) {
    return this.providersService.update(+id, updateProviderDto, req);
  }

  @Patch()
  @ApiOperation({ summary: 'Update multiple providers with the same values' }) // Swagger
  @ApiResponse({ status: 200, description: 'Providers updated successfully' }) // Swagger
  async updateMany(@Body() updateProvidersDto: UpdateProviderDto[], @Req() req: Request) {

    if (!Array.isArray(updateProvidersDto) || updateProvidersDto.length === 0) {
      throw new BadRequestException('No se proporcionaron proveedores para actualizar.');
    }

    // Delegar la lógica al servicio
    return this.providersService.updateMany(updateProvidersDto, req);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.providersService.remove(+id, req);
  }

  @Delete()
  async removes(@Body('ids') ids: number[], @Req() req: Request) {
    return this.providersService.removes(ids, req);
  }
}