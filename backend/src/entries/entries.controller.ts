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
  UseGuards,
  Req,
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
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { InvoiceExtractionService } from 'src/invoice-extraction/invoice-extraction.service';
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import type { Request } from 'express';

@ModulePermission('inventory')
@Controller('entries')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class EntriesController {
  constructor(
    private readonly entriesService: EntriesService,
    private readonly invoiceExtraction: InvoiceExtractionService,
  ) {}

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
      guide?: {
        serie?: string;
        correlativo?: string;
        fechaEmision?: string;
        fechaEntregaTransportista?: string;
        motivoTraslado?: string;
        puntoPartida?: string;
        puntoLlegada?: string;
        destinatario?: string;
        pesoBrutoUnidad?: string;
        pesoBrutoTotal?: string;
        transportista?: string;
      };
    },
    @CurrentTenant('organizationId') organizationId: number | null | undefined,
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
    return this.entriesService.createEntry(
      body,
      organizationId === undefined ? undefined : organizationId,
    );
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
      organizationId?: number | null;
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
    const entryId = Number(id);
    await this.registerInvoiceSample(entryId, file);
    return this.entriesService.updateEntryPdf(entryId, pdfUrl);
  }

  @Post('draft/upload-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const target = './uploads/entries-drafts/invoices';
          if (!existsSync(target)) {
            mkdirSync(target, { recursive: true });
          }
          cb(null, target);
        },
        filename: (req, file, cb) => {
          const orgId = (req as any).tenantContext?.organizationId ?? 'org';
          const userId = (req as any).user?.userId ?? 'user';
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `draft-${orgId}-${userId}-${uniqueSuffix}${ext}`);
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
  async uploadDraftPdf(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó un archivo PDF.');
    }
    const userId = (req as any).user?.userId ?? null;
    if (!userId) {
      throw new BadRequestException('Usuario inválido.');
    }
    const draftId = file.filename;
    return {
      draftId,
      url: `/uploads/entries-drafts/invoices/${draftId}`,
      organizationId,
      userId,
    };
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

  @Post('draft/upload-pdf-guia')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const target = './uploads/entries-drafts/guides';
          if (!existsSync(target)) {
            mkdirSync(target, { recursive: true });
          }
          cb(null, target);
        },
        filename: (req, file, cb) => {
          const orgId = (req as any).tenantContext?.organizationId ?? 'org';
          const userId = (req as any).user?.userId ?? 'user';
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `draft-${orgId}-${userId}-${uniqueSuffix}${ext}`);
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
  async uploadDraftGuidePdf(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó un archivo PDF.');
    }
    const userId = (req as any).user?.userId ?? null;
    if (!userId) {
      throw new BadRequestException('Usuario inválido.');
    }
    const draftId = file.filename;
    return {
      draftId,
      url: `/uploads/entries-drafts/guides/${draftId}`,
      organizationId,
      userId,
    };
  }

  @Post(':id/attach-draft-pdf')
  async attachDraftPdf(
    @Param('id') id: string,
    @Body('draftId') draftId: string,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    if (!draftId || typeof draftId !== 'string') {
      throw new BadRequestException('draftId inválido.');
    }
    const userId = (req as any).user?.userId ?? null;
    if (!userId) {
      throw new BadRequestException('Usuario inválido.');
    }
    const orgPart = organizationId ?? 'org';
    if (!draftId.startsWith(`draft-${orgPart}-${userId}-`)) {
      throw new BadRequestException('draftId no autorizado.');
    }

    const sourceDir = './uploads/entries-drafts/invoices';
    const targetDir = './uploads/invoices';
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    const sourcePath = path.resolve(sourceDir, draftId);
    const targetPath = path.resolve(targetDir, draftId);

    await fs.rename(sourcePath, targetPath);

    const pdfUrl = `/uploads/invoices/${draftId}`;
    const entryId = Number(id);
    const stats = await fs.stat(targetPath);
    await this.registerInvoiceSample(entryId, {
      destination: targetDir,
      filename: draftId,
      path: targetPath,
      originalname: draftId,
      mimetype: 'application/pdf',
      size: stats.size,
      fieldname: 'file',
      encoding: '7bit',
      stream: null as any,
      buffer: null as any,
    } as Express.Multer.File);
    return this.entriesService.updateEntryPdf(entryId, pdfUrl);
  }

  @Post(':id/attach-draft-pdf-guia')
  async attachDraftGuidePdf(
    @Param('id') id: string,
    @Body('draftId') draftId: string,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    if (!draftId || typeof draftId !== 'string') {
      throw new BadRequestException('draftId inválido.');
    }
    const userId = (req as any).user?.userId ?? null;
    if (!userId) {
      throw new BadRequestException('Usuario inválido.');
    }
    const orgPart = organizationId ?? 'org';
    if (!draftId.startsWith(`draft-${orgPart}-${userId}-`)) {
      throw new BadRequestException('draftId no autorizado.');
    }

    const sourceDir = './uploads/entries-drafts/guides';
    const targetDir = './uploads/guides';
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    const sourcePath = path.resolve(sourceDir, draftId);
    const targetPath = path.resolve(targetDir, draftId);

    await fs.rename(sourcePath, targetPath);

    const pdfUrl = `/uploads/guides/${draftId}`;
    return this.entriesService.updateEntryPdfGuia(Number(id), pdfUrl);
  }

  // Endpoint para listar todas las entradas
  @Get()
  async findAllEntries(
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.entriesService.findAllEntries(organizationId ?? undefined);
  }

  // Endpoint para obtener una entrada específica por ID
  @Get('by-id/:id')
  async findEntryById(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(
        'El ID de la entrada debe ser un número válido.',
      );
    }
    return this.entriesService.findEntryById(
      numericId,
      organizationId ?? undefined,
    );
  }

  // Alias para compatibilidad: GET /entries/:id
  @Get('id/:id')
  async findEntryAlias(
    @Param('id') id: string,
    @CurrentTenant('organizationId') orgId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new BadRequestException('ID inválido.');
    return this.entriesService.findEntryById(numericId, orgId ?? undefined);
  }

  @Get('store/:storeId')
  findAllByStore(
    @Param('storeId') storeId: string,
    @CurrentTenant('organizationId') orgId: number | null,
  ) {
    const numericStoreId = parseInt(storeId, 10);
    if (isNaN(numericStoreId))
      throw new BadRequestException('Store ID inválido.');
    return this.entriesService.findAllByStore(
      numericStoreId,
      orgId ?? undefined,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentTenant('organizationId') orgId: number | null,
  ) {
    return this.entriesService.deleteEntry(+id, orgId ?? undefined);
  }

  @Delete()
  async deleteEntries(
    @Body('ids') ids: number[],
    @CurrentTenant('organizationId') orgId: number | null,
  ) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron IDs válidos para eliminar.',
      );
    }

    return this.entriesService.deleteEntries(ids, orgId ?? undefined);
  }

  @Get('recent')
  async findRecent(
    @Query('limit') limit = '5',
    @CurrentTenant('organizationId') orgId: number | null,
  ) {
    const take = parseInt(limit, 10);
    return this.entriesService.findRecentEntries(
      isNaN(take) ? 5 : take,
      orgId ?? undefined,
    );
  }

  private async registerInvoiceSample(
    entryId: number,
    file: Express.Multer.File,
  ) {
    try {
      const destination =
        file.destination ??
        (file.path ? path.dirname(file.path) : './uploads/invoices');
      const absolutePath = path.resolve(destination, file.filename);

      if (!(await this.fileExists(absolutePath))) {
        console.warn(
          `No se encontr�� el archivo para registrar muestra: ${absolutePath}`,
        );
        return;
      }

      const sha256 = await this.computeSha256(absolutePath);
      const storagePath = path.posix.join(
        'uploads',
        'invoices',
        file.filename.replace(/\\/g, '/'),
      );

      const sample = await this.invoiceExtraction.recordSample({
        entryId,
        originalFilename: file.originalname,
        storagePath,
        mimeType: file.mimetype,
        fileSize: file.size,
        sha256,
      });

      await this.invoiceExtraction.appendLog(sample.id, 'INFO', 'PDF subido', {
        storagePath,
      });

      this.invoiceExtraction
        .processSample(sample.id)
        .catch((error) =>
          console.error(`Error al procesar la muestra ${sample.id}:`, error),
        );
    } catch (error) {
      console.error('Error registrando la muestra de factura:', error);
    }
  }

  private async computeSha256(filePath: string) {
    const buffer = await fs.readFile(filePath);
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async fileExists(filePath: string) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
