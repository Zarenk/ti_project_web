import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JurisprudenceEmbeddingService } from './jurisprudence-embedding.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { TenantRequiredGuard } from '../common/guards/tenant-required.guard';
import { Roles } from '../users/roles.decorator';
import { ModulePermission } from '../common/decorators/module-permission.decorator';
import { UserRole, JurisprudenceProcessingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JurisprudenceTextExtractorService } from './jurisprudence-text-extractor.service';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import * as path from 'path';
import { Response } from 'express';

@Controller('jurisprudence-documents')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@ModulePermission('legal')
export class JurisprudenceDocumentsController {
  private readonly STORAGE_PATH = process.env.JURISPRUDENCE_STORAGE_PATH || './uploads/jurisprudence';

  constructor(
    private readonly embeddingService: JurisprudenceEmbeddingService,
    private readonly textExtractor: JurisprudenceTextExtractorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /jurisprudence-documents
   * List documents with pagination and filters
   */
  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async listDocuments(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('court') court?: string,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('status') status?: JurisprudenceProcessingStatus,
  ) {
    const { organizationId, companyId } = req.tenantContext;
    const pageNum = page || 1;
    const limitNum = limit || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      organizationId,
      companyId,
      deletedAt: null,
    };

    if (court) where.court = court;
    if (year) where.year = year;
    if (status) where.processingStatus = status;

    const [documents, total] = await Promise.all([
      this.prisma.jurisprudenceDocument.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              pages: true,
              embeddings: true,
            },
          },
        },
      }),
      this.prisma.jurisprudenceDocument.count({ where }),
    ]);

    return {
      success: true,
      documents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * POST /jurisprudence-documents/upload
   * Manual upload of PDF document
   */
  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN_GLOBAL, UserRole.SUPER_ADMIN_ORG)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.JURISPRUDENCE_STORAGE_PATH || './uploads/jurisprudence',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `jurisprudence-${uniqueSuffix}.pdf`);
        },
      }),
      limits: {
        fileSize: parseInt(process.env.JURISPRUDENCE_MAX_FILE_SIZE || '52428800', 10), // 50MB default
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        }
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      title: string;
      court: string;
      chamber?: string;
      expediente: string;
      year: string;
      publishDate?: string;
    },
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const { organizationId, companyId } = req.tenantContext;
    const userId = req.user?.userId;

    // Calculate file hash
    const fileBuffer = await fs.readFile(file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Create document record
    const document = await this.prisma.jurisprudenceDocument.create({
      data: {
        organizationId,
        companyId,
        title: body.title,
        court: body.court,
        chamber: body.chamber,
        expediente: body.expediente,
        year: parseInt(body.year, 10),
        publishDate: body.publishDate ? new Date(body.publishDate) : new Date(),
        sourceType: 'MANUAL',
        pdfPath: file.path,
        fileName: file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash,
        uploadedById: userId,
        processingStatus: JurisprudenceProcessingStatus.PENDING,
      },
    });

    // Extract text and generate embeddings in background
    this.textExtractor.extractAndProcess(document.id).catch((err) => {
      console.error(`Background text extraction failed for doc ${document.id}:`, err.message);
    });

    return {
      success: true,
      document,
      message: 'Document uploaded successfully and processing started',
    };
  }

  /**
   * GET /jurisprudence-documents/:id/download
   * Download the PDF file
   * NOTE: Must be declared BEFORE :id to avoid route collision
   */
  @Get(':id/download')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { organizationId } = req.tenantContext;

    const document = await this.prisma.jurisprudenceDocument.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new BadRequestException('Documento no encontrado');
    }

    if (!document.pdfPath || !existsSync(document.pdfPath)) {
      throw new BadRequestException('Archivo PDF no disponible en el servidor');
    }

    const contentType = document.mimeType || 'application/pdf';
    const fileName = document.fileName || `jurisprudencia-${id}.pdf`;

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileName)}"`,
    );
    if (document.fileSize) {
      res.setHeader('Content-Length', document.fileSize);
    }

    return new StreamableFile(createReadStream(document.pdfPath));
  }

  /**
   * GET /jurisprudence-documents/:id/text
   * Get extracted text content for a document
   * NOTE: Must be declared BEFORE :id to avoid route collision
   */
  @Get(':id/text')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async getDocumentText(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const { organizationId } = req.tenantContext;

    const document = await this.prisma.jurisprudenceDocument.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        title: true,
        expediente: true,
        processingStatus: true,
        pages: {
          orderBy: { pageNumber: 'asc' },
          select: {
            pageNumber: true,
            rawText: true,
            hasText: true,
            ocrRequired: true,
          },
        },
        sections: {
          select: {
            structureType: true,
            sectionName: true,
            startPage: true,
            endPage: true,
            sectionText: true,
          },
        },
        _count: {
          select: { embeddings: true },
        },
      },
    });

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    return { success: true, document };
  }

  /**
   * GET /jurisprudence-documents/:id
   * Get document details
   * NOTE: Generic :id route must come AFTER specific sub-routes (:id/download, :id/text)
   */
  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async getDocument(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const { organizationId } = req.tenantContext;

    const document = await this.prisma.jurisprudenceDocument.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        sections: true,
        _count: {
          select: {
            embeddings: true,
          },
        },
      },
    });

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }

    return {
      success: true,
      document,
    };
  }

  /**
   * DELETE /jurisprudence-documents/:id
   * Soft delete a document
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN_GLOBAL, UserRole.SUPER_ADMIN_ORG)
  async deleteDocument(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const { organizationId } = req.tenantContext;

    const document = await this.prisma.jurisprudenceDocument.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }

    await this.prisma.jurisprudenceDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  /**
   * POST /jurisprudence-documents/:id/process
   * Manually trigger processing of a document
   */
  @Post(':id/process')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN_GLOBAL, UserRole.SUPER_ADMIN_ORG)
  async processDocument(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const { organizationId } = req.tenantContext;

    const document = await this.prisma.jurisprudenceDocument.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }

    // Trigger embedding generation
    try {
      await this.embeddingService.processDocument(id);

      return {
        success: true,
        message: 'Document processed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
