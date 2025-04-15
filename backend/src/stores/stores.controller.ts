import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @ApiOperation({summary: 'Create a store'})    // Swagger 
  create(@Body() createStoreDto: CreateStoreDto) {
    return this.storesService.create(createStoreDto);
  }

  @Get()
  @ApiResponse({status: 200, description: 'Return all stores'}) // Swagger 
  findAll() {
    return this.storesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const numericId = parseInt(id, 10); // Convierte el ID a un número entero
    if (isNaN(numericId)) {
    throw new BadRequestException('El ID debe ser un número válido.');
    }
    return this.storesService.findOne(numericId);
  }

  // stores.controller.ts
  @Post("check")
  async checkStore(@Body("name") name: string) {
    if (!name) {
      throw new BadRequestException("El nombre de la tienda es obligatorio.");
    }

    const exists = await this.storesService.checkIfExists(name);
    return { exists };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto) {
    return this.storesService.update(+id, updateStoreDto);
  }

  @Patch()
  @ApiOperation({ summary: 'Update multiple stores with the same values' }) // Swagger
  @ApiResponse({ status: 200, description: 'Stores updated successfully' }) // Swagger
  async updateMany(@Body() updateStoresDto: UpdateStoreDto[]) {

    if (!Array.isArray(updateStoresDto) || updateStoresDto.length === 0) {
      throw new BadRequestException('No se proporcionaron tiendas para actualizar.');
    }

    // Delegar la lógica al servicio
    return this.storesService.updateMany(updateStoresDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storesService.remove(+id);
  }

  @Delete()
  async removes(@Body('ids') ids: number[]) {
    return this.storesService.removes(ids);
  }
}
