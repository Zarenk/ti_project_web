import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerticalConfigService } from 'src/tenancy/vertical-config.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';

@Injectable()
export class LegalDocumentsService {
  private readonly logger = new Logger(LegalDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verticalConfig: VerticalConfigService,
  ) {}

  private async ensureLegalFeatureEnabled(
    companyId?: number | null,
  ): Promise<void> {
    if (companyId == null) return;
    const config = await this.verticalConfig.getConfig(companyId);
    if (config.features.projectTracking === false) {
      throw new ForbiddenException(
        'El modulo legal no esta habilitado para esta empresa.',
      );
    }
  }

  async findAll(
    organizationId?: number | null,
    companyId?: number | null,
    filters?: { type?: string; search?: string },
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const where: Prisma.LegalDocumentWhereInput = {
      matter: buildOrganizationFilter(
        organizationId,
        companyId,
      ) as Prisma.LegalMatterWhereInput,
    };

    if (filters?.type) {
      where.type = filters.type as any;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { fileName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.legalDocument.findMany({
      where,
      include: {
        matter: { select: { id: true, title: true, internalCode: true } },
        uploadedBy: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(
    matterId: number,
    file: Express.Multer.File,
    metadata: {
      title: string;
      description?: string;
      type?: string;
    },
    organizationId?: number | null,
    companyId?: number | null,
    uploadedById?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    // Verify matter exists and belongs to tenant
    const matter = await this.prisma.legalMatter.findFirst({
      where: {
        id: matterId,
        ...(buildOrganizationFilter(
          organizationId,
          companyId,
        ) as Prisma.LegalMatterWhereInput),
      },
    });

    if (!matter) {
      throw new NotFoundException('Expediente no encontrado.');
    }

    // Calculate SHA-256 hash for chain of custody
    const fileBuffer = await import('fs').then((fs) =>
      fs.promises.readFile(file.path),
    );
    const sha256Hash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    return this.prisma.legalDocument.create({
      data: {
        matterId,
        organizationId: matter.organizationId,
        title: metadata.title,
        description: metadata.description ?? null,
        type: (metadata.type as any) ?? 'OTRO',
        filePath: file.path,
        fileUrl: `/uploads/legal-documents/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        sha256Hash,
        uploadedById: uploadedById ?? null,
      },
      include: {
        uploadedBy: { select: { id: true, username: true } },
      },
    });
  }

  async findByMatter(
    matterId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    return this.prisma.legalDocument.findMany({
      where: {
        matterId,
        matter: buildOrganizationFilter(
          organizationId,
          companyId,
        ) as Prisma.LegalMatterWhereInput,
      },
      include: {
        uploadedBy: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMetadata(
    id: number,
    data: { title?: string; description?: string; type?: string },
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const doc = await this.prisma.legalDocument.findFirst({
      where: {
        id,
        matter: buildOrganizationFilter(
          organizationId,
          companyId,
        ) as Prisma.LegalMatterWhereInput,
      },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');

    const update: Prisma.LegalDocumentUpdateInput = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;
    if (data.type !== undefined) update.type = data.type as any;

    return this.prisma.legalDocument.update({
      where: { id },
      data: update,
      include: {
        uploadedBy: { select: { id: true, username: true } },
      },
    });
  }

  async findOne(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const doc = await this.prisma.legalDocument.findFirst({
      where: {
        id,
        matter: buildOrganizationFilter(
          organizationId,
          companyId,
        ) as Prisma.LegalMatterWhereInput,
      },
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado.');
    }

    return doc;
  }

  async remove(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const doc = await this.prisma.legalDocument.findFirst({
      where: {
        id,
        matter: buildOrganizationFilter(
          organizationId,
          companyId,
        ) as Prisma.LegalMatterWhereInput,
      },
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado.');
    }

    // Delete file from disk
    if (doc.filePath) {
      try {
        const fs = await import('fs');
        await fs.promises.unlink(doc.filePath);
      } catch {
        this.logger.warn(`Could not delete file at ${doc.filePath}`);
      }
    }

    await this.prisma.legalDocument.delete({ where: { id } });
    return { deleted: true, id };
  }
}
