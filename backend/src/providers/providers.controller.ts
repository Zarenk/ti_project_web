import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @ApiOperation({summary: 'Create a provider'})    // Swagger 
  create(@Body() createProviderDto: CreateProviderDto) {
    return this.providersService.create(createProviderDto);
  }

  // providers.controller.ts
  @Post("check")
  async checkProvider(@Body("name") name: string) {
    if (!name) {
      throw new BadRequestException("El nombre del proveedor es obligatorio.");
    }

    const exists = await this.providersService.checkIfExists(name);
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
  update(@Param('id') id: string, @Body() updateProviderDto: UpdateProviderDto) {
    return this.providersService.update(+id, updateProviderDto);
  }

  @Patch()
  @ApiOperation({ summary: 'Update multiple providers with the same values' }) // Swagger
  @ApiResponse({ status: 200, description: 'Providers updated successfully' }) // Swagger
  async updateMany(@Body() updateProvidersDto: UpdateProviderDto[]) {

    if (!Array.isArray(updateProvidersDto) || updateProvidersDto.length === 0) {
      throw new BadRequestException('No se proporcionaron proveedores para actualizar.');
    }

    // Delegar la lógica al servicio
    return this.providersService.updateMany(updateProvidersDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.providersService.remove(+id);
  }

  @Delete()
  async removes(@Body('ids') ids: number[]) {
    return this.providersService.removes(ids);
  }
}