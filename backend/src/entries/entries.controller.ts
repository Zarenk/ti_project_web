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
  Query,
} from '@nestjs/common';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntryPaymentMethod, PaymentTerm } from '@prisma/client';
import { multerConfig } from 'src/config/multer.config';
import pdfParse from 'pdf-parse';
import { diskStorage } from 'multer';
import path from 'path';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';

@ModulePermission('inventory')
@Controller('entries')
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  // Endpoint para crear una nueva entrada
  @Post()
  async createEntry(
    @Body()
    body: {
      storeId: number;
      userId: number;
      providerId: number;
      date: Date;
      description?: string;
      tipoMoneda?: string;
      tipoCambioId?: number;
      paymentMethod?: EntryPaymentMethod;
      paymentTerm?: PaymentTerm;
      serie?: string;
      correlativo?: string;
      providerName?: string;
      totalGross?: number;
      igvRate?: number;
      details: {
        productId: number;
        name: string;
        quantity: number;
        price: number;
        priceInSoles: number;
      }[];
      invoice?: {
        serie: string;
        nroCorrelativo: string;
        tipoComprobante: string;
        tipoMoneda: string;
        total: number;
        fechaEmision: Date;
      };
    },
  ) {
    if (
      body.paymentTerm &&
      !Object.values(PaymentTerm).includes(body.paymentTerm)
    ) {
      throw new BadRequestException('paymentTerm inválido.');
    }
    if (body.totalGross !== undefined && typeof body.totalGross !== 'number') {
      throw new BadRequestException('totalGross debe ser un número.');
    }
    if (body.igvRate !== undefined && typeof body.igvRate !== 'number') {
      throw new BadRequestException('igvRate debe ser un número.');
    }
    return this.entriesService.createEntry(body);
  }

  // Endpoint para registrar historial de inventario
  @Post('history')
  async createHistory(
    @Body()
    body: {
      inventoryId: number;
      userId: number;
      action: string;
      description?: string;
      stockchange: number;
      previousStock: number;
      newStock: number;
    },
  ) {
    return this.entriesService.createHistory(body);
  }

  // ENDPOINT PARA CREAR PDFS
  @Post('process-pdf')
  @UseInterceptors(FileInterceptor('file', multerConfig)) // Interceptor para manejar la carga del archivo
  async processPDF(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó un archivo PDF.');
    }

    try {
      const pdfData = await pdfParse(file.buffer); // Procesa el archivo PDF
      return { text: pdfData.text }; // Devuelve el texto extraído
    } catch (error) {
      console.error('Error al procesar el archivo PDF:', error);
      throw new BadRequestException('Error al procesar el archivo PDF.');
    }
  }

  // Endpoint para actualizar una entrada con un PDF
  @Post(':id/upload-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/invoices', // Carpeta donde se guardarán los PDFs
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(pdf)$/)) {
          return cb(
            new BadRequestException('Solo se permiten archivos PDF'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )

  async uploadPdf(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó un archivo PDF.');
    }

    const pdfUrl = `/uploads/invoices/${file.filename}`;
    return this.entriesService.updateEntryPdf(Number(id), pdfUrl);
  }

   // Endpoint para actualizar una entrada con un PDF GUIA
  @Post(':id/upload-pdf-guia')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/guides', // Carpeta donde se guardarán los PDFs
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(pdf)$/)) {
          return cb(
            new BadRequestException('Solo se permiten archivos PDF'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadGuidePdf(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó un archivo PDF.');
    }

    const pdfUrl = `/uploads/guides/${file.filename}`;
    return this.entriesService.updateEntryPdfGuia(Number(id), pdfUrl);
  }

  // Endpoint para listar todas las entradas
  @Get()
  async findAllEntries() {
    return this.entriesService.findAllEntries();
  }

  // Endpoint para obtener una entrada específica por ID
  @Get('by-id/:id')
  async findEntryById(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(
        'El ID de la entrada debe ser un número válido.',
      );
    }
    return this.entriesService.findEntryById(numericId);
  }

  // Alias para compatibilidad: GET /entries/:id
  @Get('id/:id')
  async findEntryAlias(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(
        'El ID de la entrada debe ser un número válido.',
      );
    }
    return this.entriesService.findEntryById(numericId);
  }

  @Get('store/:storeId')
  findAllByStore(@Param('storeId') storeId: string) {
    const numericStoreId = parseInt(storeId, 10);
    if (isNaN(numericStoreId)) {
      throw new BadRequestException(
        'El ID de la tienda debe ser un número válido.',
      );
    }
    return this.entriesService.findAllByStore(numericStoreId);
  }

  @Delete(':id')
    remove(@Param('id') id: string) {
      return this.entriesService.deleteEntry(+id);
  }

  @Delete()
  async deleteEntries(@Body('ids') ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron IDs válidos para eliminar.',
      );
    }

    return this.entriesService.deleteEntries(ids);
  }

  @Get('recent')
  async findRecent(@Query('limit') limit = '5') {
    const take = parseInt(limit, 10);
    return this.entriesService.findRecentEntries(isNaN(take) ? 5 : take);
  }
  
}
