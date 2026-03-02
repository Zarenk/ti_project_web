import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { RolesGuard } from 'src/users/roles.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { Roles } from 'src/users/roles.decorator';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { LegalDocumentsService } from './legal-documents.service';

const LEGAL_ALLOWED_ROLES = [
  'ADMIN',
  'EMPLOYEE',
  'SUPER_ADMIN_GLOBAL',
  'SUPER_ADMIN_ORG',
];

const UPLOAD_DEST = './uploads/legal-documents';

@Controller('legal-documents')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(...LEGAL_ALLOWED_ROLES)
@ModulePermission('legal')
export class LegalDocumentsController {
  constructor(private readonly service: LegalDocumentsService) {}

  @Get()
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      organizationId ?? undefined,
      companyId ?? undefined,
      {
        type: type?.trim().toUpperCase() || undefined,
        search: search?.trim() || undefined,
      },
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          if (!existsSync(UPLOAD_DEST)) {
            mkdirSync(UPLOAD_DEST, { recursive: true });
          }
          cb(null, UPLOAD_DEST);
        },
        filename: (req, file, cb) => {
          const orgId =
            (req as any).tenantContext?.organizationId ?? 'org';
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `legal-${orgId}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = /\.(pdf|doc|docx|odt|txt|xlsx|xls|jpg|jpeg|png)$/i;
        if (!file.originalname.match(allowed)) {
          return cb(
            new BadRequestException(
              'Solo se permiten archivos PDF, Word, Excel, ODT, TXT o imagenes.',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('matterId') matterIdStr: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('type') type: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
  ) {
    if (!file) {
      throw new BadRequestException('No se proporciono un archivo.');
    }

    const matterId = parseInt(matterIdStr, 10);
    if (isNaN(matterId)) {
      throw new BadRequestException('matterId es requerido.');
    }

    if (!title?.trim()) {
      throw new BadRequestException('El titulo del documento es requerido.');
    }

    return this.service.uploadDocument(
      matterId,
      file,
      {
        title: title.trim(),
        description: description?.trim(),
        type: type?.trim(),
      },
      organizationId ?? undefined,
      companyId ?? undefined,
      req.user?.userId ?? null,
    );
  }

  @Get('matter/:matterId')
  findByMatter(
    @Param('matterId', ParseIntPipe) matterId: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.findByMatter(
      matterId,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get(':id/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    const doc = await this.service.findOne(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );

    if (!doc.filePath || !existsSync(doc.filePath)) {
      throw new BadRequestException('Archivo no disponible en el servidor.');
    }

    const contentType = doc.mimeType || 'application/octet-stream';
    const fileName = doc.fileName || `document-${id}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileName)}"`,
    );
    if (doc.fileSize) {
      res.setHeader('Content-Length', doc.fileSize);
    }

    return new StreamableFile(createReadStream(doc.filePath));
  }

  @Patch(':id')
  updateMetadata(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; description?: string; type?: string },
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.updateMetadata(
      id,
      body,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.remove(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }
}
