import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { resolveBackendPath } from '../utils/path-utils';
import { CurrentTenant } from '../tenancy/tenant-context.decorator';
import sharp from 'sharp';

function ensureCatalogDir(): string {
  const dir = resolveBackendPath('uploads', 'catalog');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function buildPdfVariantRelativePath(relativePath: string): string {
  const extension = extname(relativePath);
  const base = relativePath.slice(0, relativePath.length - extension.length);
  return `${base}-pdf${extension}`;
}

async function createPdfReadyVariant(
  sourceAbsolutePath: string,
  targetAbsolutePath: string,
) {
  try {
    await sharp(sourceAbsolutePath)
      .modulate({ brightness: 0.45, saturation: 0.6 })
      .linear(0.9, -24)
      .toFile(targetAbsolutePath);
  } catch (error) {
    console.error(
      '[catalog-cover] Failed to create PDF-friendly variant',
      error,
    );
  }
}

@Controller('catalog/cover')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogCoverController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getActiveCover(
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (organizationId === null) {
      return { cover: null };
    }

    const cover = await this.prisma.catalogCover.findFirst({
      where: {
        isActive: true,
        organizationId,
        companyId: companyId ?? null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!cover) {
      return { cover: null };
    }
    const baseUrl =
      process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const pdfRelativePath = buildPdfVariantRelativePath(cover.imagePath);
    const pdfAbsolutePath = resolveBackendPath(
      ...pdfRelativePath.replace(/^\//, '').split('/'),
    );
    const pdfImageUrl = existsSync(pdfAbsolutePath)
      ? `${baseUrl}${pdfRelativePath}`
      : undefined;
    return {
      cover: {
        ...cover,
        imageUrl: cover.imagePath.startsWith('http')
          ? cover.imagePath
          : `${baseUrl}${cover.imagePath}`,
        pdfImageUrl,
      },
    };
  }

  @Post()
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          try {
            const dir = ensureCatalogDir();
            cb(null, dir);
          } catch (error) {
            return cb(error as Error, '');
          }
        },
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png)$/)) {
          return cb(
            new BadRequestException('Solo se permiten imagenes JPG o PNG'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadCover(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar una imagen');
    }
    if (organizationId === null) {
      throw new BadRequestException(
        'Debes seleccionar una organizacion valida antes de actualizar la caratula.',
      );
    }

    const relativePath = `/uploads/catalog/${file.filename}`;
    const absolutePath = file.path;
    const pdfRelativePath = buildPdfVariantRelativePath(relativePath);
    const pdfAbsolutePath = resolveBackendPath(
      ...pdfRelativePath.replace(/^\//, '').split('/'),
    );

    await createPdfReadyVariant(absolutePath, pdfAbsolutePath);

    const cover = await this.prisma.$transaction(async (tx) => {
      await tx.catalogCover.updateMany({
        where: {
          isActive: true,
          organizationId,
          companyId: companyId ?? null,
        },
        data: { isActive: false },
      });
      return tx.catalogCover.create({
        data: {
          imagePath: relativePath,
          originalName: file.originalname,
          mimeType: file.mimetype,
          isActive: true,
          organizationId,
          companyId: companyId ?? null,
        },
      });
    });

    const baseUrl =
      process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const pdfImageUrl = existsSync(pdfAbsolutePath)
      ? `${baseUrl}${pdfRelativePath}`
      : undefined;
    return {
      cover: {
        ...cover,
        imageUrl: `${baseUrl}${relativePath}`,
        pdfImageUrl,
      },
    };
  }

  @Delete()
  @Roles('ADMIN')
  async removeCover(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (organizationId === null) {
      throw new BadRequestException(
        'Debes seleccionar una organizacion valida antes de eliminar la caratula.',
      );
    }

    await this.prisma.catalogCover.updateMany({
      where: {
        isActive: true,
        organizationId,
        companyId: companyId ?? null,
      },
      data: { isActive: false },
    });

    return { cover: null };
  }
}

