import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
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
    const clientData = {
      name: createClientDto.name,
      type: createClientDto.type || '',
      typeNumber: createClientDto.typeNumber || '',
      userId: createClientDto.userId,
    };
    return this.clientService.create(clientData);
  }

  // Registro público sin validaciones de documento
  @Post('self-register')
  @ApiOperation({ summary: 'Self register client' })
  selfRegister(@Body() createClientDto: CreateClientDto) {
    const clientData = {
      name: createClientDto.name,
      type: createClientDto.type ?? undefined,
      typeNumber: createClientDto.typeNumber ?? undefined,
      userId: createClientDto.userId,
      image: createClientDto.image ?? undefined,
    };
    return this.clientService.selfRegister(clientData);
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

  @Get('registered')
  findRegistered() {
    return this.clientService.findRegistered();
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

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/clients',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new BadRequestException('Solo se permiten imagenes'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ninguna imagen');
    }
    const baseUrl =
      process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    return { url: `${baseUrl}/uploads/clients/${file.filename}` };
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
