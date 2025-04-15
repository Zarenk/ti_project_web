import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException } from '@nestjs/common';

import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @ApiOperation({summary: 'Create a client'})    // Swagger 
  create(@Body() createClientDto: CreateClientDto) {
    const formattedClientDto = {
      ...createClientDto,
      type: createClientDto.type || '', // Ensure 'type' is always a string
      typeNumber: createClientDto.typeNumber || '', // Ensure 'typeNumber' is always a string
    };
    return this.clientService.create(formattedClientDto);
  }

  @Post('verify-or-create-products')
  async verifyOrCreateProducts(
    @Body() clients: { name: string; type?: string; typerNumber?: string; userId: number }[],
  ) {
    // Mapea las propiedades para que coincidan con el tipo esperado
    const formattedClients = clients.map((client) => ({
      name: client.name,
      type: client.type || '', // Proporciona un valor predeterminado si es opcional
      typeNumber: client.typerNumber || '', // Proporciona un valor predeterminado si es opcional
      idUser: client.userId, // Asegúrate de usar idUser
    }));
    return this.clientService.verifyOrCreateClients(formattedClients);
  }

  @Get()
  @ApiResponse({status: 200, description: 'Return all clients'}) // Swagger 
  findAll() {
    return this.clientService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const numericId = parseInt(id, 10); // Convierte el ID a un número entero
    if (isNaN(numericId)) {
    throw new BadRequestException('El ID debe ser un número válido.');
    }
    return this.clientService.findOne(numericId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientService.update(+id, updateClientDto);
  }

  @Patch()
  @ApiOperation({ summary: 'Update multiple client with the same values' }) // Swagger
  @ApiResponse({ status: 200, description: 'Clients updated successfully' }) // Swagger
  async updateMany(@Body() updateClientsDto: UpdateClientDto[]) {

    if (!Array.isArray(updateClientsDto) || updateClientsDto.length === 0) {
      throw new BadRequestException('No se proporcionaron clientes para actualizar.');
    }

    // Delegar la lógica al servicio
    return this.clientService.updateMany(updateClientsDto);
  }

  // clients.controller.ts
  @Post("check")
  async checkClient(@Body("typeNumber") name: string) {
    if (!name) {
      throw new BadRequestException("El Nro de documento del cliente es obligatorio.");
    }

    const exists = await this.clientService.checkIfExists(name);
    return { exists };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientService.remove(+id);
  }

  @Delete()
  async removes(@Body('ids') ids: number[]) {
    return this.clientService.removes(ids);
  }
}
