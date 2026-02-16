// backend/src/clients/clients.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @ApiOperation({ summary: 'Create a client' })
  create(
    @Body() createClientDto: CreateClientDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const clientData = {
      name: createClientDto.name,
      type: createClientDto.type || '',
      typeNumber: createClientDto.typeNumber || '',
      userId: createClientDto.userId,
      image: createClientDto.image ?? undefined,
      organizationId: createClientDto.organizationId ?? organizationId ?? null,
      companyId: createClientDto.companyId ?? companyId ?? null,
    };
    return this.clientService.create(
      clientData,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Post('self-register')
  @ApiOperation({ summary: 'Self register client' })
  selfRegister(
    @Body() createClientDto: CreateClientDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const clientData = {
      name: createClientDto.name,
      type: createClientDto.type ?? undefined,
      typeNumber: createClientDto.typeNumber ?? undefined,
      userId: createClientDto.userId,
      image: createClientDto.image ?? undefined,
      organizationId: createClientDto.organizationId ?? organizationId ?? null,
      companyId: createClientDto.companyId ?? companyId ?? null,
    };
    return this.clientService.selfRegister(
      clientData,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Post('guest')
  @ApiOperation({ summary: 'Create guest client' })
  createGuest(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.clientService.createGuest(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Post('verify-or-create-products')
  async verifyOrCreateProducts(
    @Body()
    clients: {
      name: string;
      type?: string;
      typerNumber?: string;
      userId: number;
      organizationId?: number | null;
      companyId?: number | null;
    }[],
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const formatted = clients.map((c) => ({
      name: c.name,
      type: c.type || '',
      typeNumber: c.typerNumber || '',
      idUser: c.userId,
      organizationId: c.organizationId ?? organizationId ?? null,
      companyId: c.companyId ?? companyId ?? null,
    }));
    return this.clientService.verifyOrCreateClients(
      formatted,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Return all clients' })
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!organizationId && !companyId) {
      throw new BadRequestException(
        'Contexto de tenant no disponible para listar clientes.',
      );
    }
    return this.clientService.findAll(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('registered')
  findRegistered(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!organizationId && !companyId) {
      throw new BadRequestException(
        'Contexto de tenant no disponible para listar clientes.',
      );
    }
    return this.clientService.findRegistered(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('chat')
  findAllForChat(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!organizationId && !companyId) {
      throw new BadRequestException(
        'Contexto de tenant no disponible para listar clientes.',
      );
    }
    return this.clientService.findAllForChat(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un número válido.');
    }
    return this.clientService.findOne(
      numericId,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.clientService.update(
      +id,
      updateClientDto,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
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
          return cb(
            new BadRequestException('Solo se permiten imagenes'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file)
      throw new BadRequestException('No se proporcionó ninguna imagen');
    const baseUrl =
      process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    return { url: `${baseUrl}/uploads/clients/${file.filename}` };
  }

  @Patch()
  @ApiOperation({ summary: 'Update multiple client with the same values' })
  @ApiResponse({ status: 200, description: 'Clients updated successfully' })
  async updateMany(
    @Body() updateClientsDto: UpdateClientDto[],
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!Array.isArray(updateClientsDto) || updateClientsDto.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron clientes para actualizar.',
      );
    }
    return this.clientService.updateMany(
      updateClientsDto,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Post('check')
  async checkClient(@Body('typeNumber') typeNumber: string) {
    if (!typeNumber)
      throw new BadRequestException(
        'El Nro de documento del cliente es obligatorio.',
      );
    const exists = await this.clientService.checkIfExists(typeNumber);
    return { exists };
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.clientService.remove(
      +id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Delete()
  async removes(
    @Body('ids') ids: number[],
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.clientService.removes(
      ids,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }
}
