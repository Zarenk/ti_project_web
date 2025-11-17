import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Param,
  Res,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

import { SunatService } from './sunat.service';
import { resolveBackendPath } from 'src/utils/path-utils';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantContextGuard } from 'src/tenancy/tenant-context.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

const SUPPORTED_DOCUMENT_TYPES = ['invoice', 'boleta', 'creditNote'] as const;
type SunatDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number];

interface SendDocumentBody {
  documentType?: SunatDocumentType | string;
  companyId?: number;
  sunatEnvironment?: string;
  privateKeyPath?: string;
  certificatePath?: string;
  [key: string]: unknown;
}

@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('sunat')
export class SunatController {
  constructor(private readonly sunatService: SunatService) {}

  @Post('send-document')
  async sendDocument(
    @Body() body: SendDocumentBody,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    if (!body) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacio.',
      );
    }

    const {
      documentType,
      companyId,
      sunatEnvironment,
      privateKeyPath,
      certificatePath,
      ...documentData
    } = body;

    const normalizedType =
      typeof documentType === 'string' ? documentType.trim() : '';
    if (
      !SUPPORTED_DOCUMENT_TYPES.includes(normalizedType as SunatDocumentType)
    ) {
      throw new BadRequestException(
        'Tipo de documento no soportado. Use "invoice", "boleta" o "creditNote".',
      );
    }

    const resolvedCompanyId = this.resolveCompanyId(companyId, tenant);

    try {
      const response = await this.sunatService.sendDocument({
        documentData,
        documentType: normalizedType as SunatDocumentType,
        companyId: resolvedCompanyId,
        privateKeyPathOverride:
          typeof privateKeyPath === 'string' ? privateKeyPath : undefined,
        certificatePathOverride:
          typeof certificatePath === 'string' ? certificatePath : undefined,
        environmentOverride:
          typeof sunatEnvironment === 'string'
            ? sunatEnvironment.toUpperCase()
            : undefined,
      });

      return {
        message: 'Documento enviado a la SUNAT exitosamente.',
        response,
      };
    } catch (error: any) {
      console.error('Error al enviar el documento a la SUNAT:', error?.message);
      throw new BadRequestException('Error al enviar el documento a la SUNAT.');
    }
  }

  @Post('generar-y-enviar')
  async generarYEnviarDocumento(
    @Body() data: { documentType?: string; companyId?: number },
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    if (!data?.documentType) {
      throw new BadRequestException('El campo "documentType" es obligatorio.');
    }

    const resolvedCompanyId = this.resolveCompanyId(data.companyId, tenant);

    try {
      const respuesta = await this.sunatService.generarYEnviarConSerie(
        data.documentType,
        resolvedCompanyId ?? undefined,
      );
      return {
        mensaje: 'Serie y numero correlativo generado correctamente.',
        respuesta,
      };
    } catch (error: any) {
      console.error('Error en el endpoint /sunat/generar-y-enviar:', error);
      throw new BadRequestException(
        'Error al extraer la serie y el nro. correlativo.',
      );
    }
  }

  @Post('upload-pdf')
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const tmpDir = resolveBackendPath('uploads', 'sunat', 'pdf', 'tmp');
          fs.mkdirSync(tmpDir, { recursive: true });
          cb(null, tmpDir);
        },
        filename: (_req, file, cb) => {
          const safeName =
            file.originalname?.replace(/\s+/g, '_') || 'sunat-pdf.pdf';
          cb(null, safeName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.includes('pdf')) {
          return cb(
            new BadRequestException('Solo se permiten archivos PDF.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadPdf(
    @Body('tipo') tipoInput: string | undefined,
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    if (!file) {
      throw new BadRequestException('No se subio ningun archivo PDF.');
    }

    const organizationId = tenant?.organizationId ?? undefined;
    const companyId = tenant?.companyId ?? undefined;

    if (!organizationId || !companyId) {
      throw new BadRequestException(
        'No se pudo determinar la organizacion o empresa activa.',
      );
    }

    const normalizedType =
      typeof tipoInput === 'string' && tipoInput.length > 0
        ? tipoInput.toLowerCase()
        : undefined;
    const effectiveType =
      normalizedType === 'factura' || normalizedType === 'boleta'
        ? normalizedType
        : file.originalname.includes('-01-')
          ? 'factura'
          : 'boleta';

    const tenantAwarePath = path.join(
      'comprobantes',
      'pdf',
      `org-${organizationId}`,
      `company-${companyId}`,
      effectiveType,
    );

    const destination = resolveBackendPath(tenantAwarePath);
    fs.mkdirSync(destination, { recursive: true });
    const finalPath = path.join(destination, file.filename);
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }
    fs.renameSync(file.path, finalPath);

    const relativePath = path
      .relative(resolveBackendPath(), finalPath)
      .replace(/\\/g, '/');

    await this.sunatService.registerStoredPdf({
      organizationId,
      companyId,
      type: effectiveType,
      filename: file.filename,
      relativePath,
      userId: tenant?.userId ?? null,
    });

    return {
      message: 'PDF guardado correctamente en el servidor.',
      filename: file.filename,
      path: relativePath,
    };
  }

  @Get('pdf/:tipo/:filename')
  async getComprobantePdf(
    @Param('tipo') tipo: 'boleta' | 'factura',
    @Param('filename') filename: string,
    @CurrentTenant() tenant: TenantContext | null,
    @Res() res: Response,
  ) {
    const record = await this.sunatService.getStoredPdfForTenant({
      filename,
      type: tipo,
      tenant: tenant ?? null,
    });

    try {
      const filePath = this.sunatService.getComprobantePdfPath(
        tipo,
        record.filename,
        record.relativePath,
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath);
    } catch (error: any) {
      throw new NotFoundException(error?.message ?? 'Archivo no encontrado');
    }
  }

  @Get('pdfs')
  async listStoredPdfs(@CurrentTenant() tenant: TenantContext | null) {
    return this.sunatService.listStoredPdfsForTenant(tenant ?? null);
  }

  @Post('transmissions/:id/retry')
  async retryTransmission(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    const response = await this.sunatService.retryTransmission(
      id,
      tenant ?? null,
    );
    return {
      message: 'Reintento iniciado.',
      response,
    };
  }

  private resolveCompanyId(
    input: unknown,
    tenant: TenantContext | null,
  ): number {
    if (typeof input === 'number' && Number.isFinite(input)) {
      return input;
    }
    if (typeof input === 'string' && input.trim().length > 0) {
      const parsed = Number(input);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    if (tenant?.companyId && Number.isFinite(tenant.companyId)) {
      return tenant.companyId;
    }
    throw new BadRequestException(
      'Debes indicar una empresa valida para enviar documentos a la SUNAT.',
    );
  }
}
