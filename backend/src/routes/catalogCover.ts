import {
  BadRequestException,
  Controller,
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

function ensureCatalogDir(): string {
  const dir = resolveBackendPath('uploads', 'catalog');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

@Controller('catalog/cover')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogCoverController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getActiveCover(@Req() req: Request) {
    const cover = await this.prisma.catalogCover.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!cover) {
      return { cover: null };
    }
    const baseUrl =
      process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    return {
      cover: {
        ...cover,
        imageUrl: cover.imagePath.startsWith('http')
          ? cover.imagePath
          : `${baseUrl}${cover.imagePath}`,
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
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar una imagen');
    }

    const relativePath = `/uploads/catalog/${file.filename}`;

    const cover = await this.prisma.$transaction(async (tx) => {
      await tx.catalogCover.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      return tx.catalogCover.create({
        data: {
          imagePath: relativePath,
          originalName: file.originalname,
          mimeType: file.mimetype,
          isActive: true,
        },
      });
    });

    const baseUrl =
      process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    return {
      cover: {
        ...cover,
        imageUrl: `${baseUrl}${relativePath}`,
      },
    };
  }
}
