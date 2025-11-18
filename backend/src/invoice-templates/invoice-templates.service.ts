import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Provider } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import { CreateInvoiceTemplateDto } from './dto/create-invoice-template.dto';
import { UpdateInvoiceTemplateDto } from './dto/update-invoice-template.dto';

@Injectable()
export class InvoiceTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private tenantContext() {
    const ctx = this.tenant.getContext();
    return {
      organizationId: ctx.organizationId,
      companyId: ctx.companyId,
      userId: ctx.userId,
    };
  }

  private baseWhere(includeInactive = false) {
    const ctx = this.tenantContext();
    const where: Prisma.InvoiceTemplateWhereInput = {};
    if (ctx.organizationId !== null) {
      where.organizationId = ctx.organizationId;
    }
    if (ctx.companyId !== null) {
      where.companyId = ctx.companyId;
    }
    if (!includeInactive) {
      where.isActive = true;
    }
    return where;
  }

  async findAll(includeInactive = false) {
    return this.prisma.invoiceTemplate.findMany({
      where: this.baseWhere(includeInactive),
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(id: number) {
    const template = await this.prisma.invoiceTemplate.findFirst({
      where: { id, ...this.baseWhere(true) },
    });
    if (!template) {
      throw new NotFoundException('Invoice template not found');
    }
    return template;
  }

  private async ensureProvider(
    providerId: number | undefined,
  ): Promise<Pick<Provider, 'id' | 'name'> | null> {
    if (!providerId) return null;
    const ctx = this.tenantContext();
    const provider = await this.prisma.provider.findFirst({
      where: {
        id: providerId,
        ...(ctx.organizationId !== null
          ? { organizationId: ctx.organizationId }
          : {}),
      },
      select: { id: true, name: true },
    });
    if (!provider) {
      throw new BadRequestException(
        'The selected provider does not belong to your organization.',
      );
    }
    return provider;
  }

  private async resolveNextVersion(params: {
    providerId: number | null;
    documentType: string;
  }) {
    const ctx = this.tenantContext();
    const latest = await this.prisma.invoiceTemplate.findFirst({
      where: {
        documentType: params.documentType,
        providerId: params.providerId ?? null,
        organizationId: ctx.organizationId ?? null,
        companyId: ctx.companyId ?? null,
      },
      orderBy: { version: 'desc' },
    });
    return (latest?.version ?? 0) + 1;
  }

  async create(dto: CreateInvoiceTemplateDto) {
    const ctx = this.tenantContext();
    const provider = await this.ensureProvider(dto.providerId);
    const version =
      dto.version ??
      (await this.resolveNextVersion({
        providerId: provider?.id ?? null,
        documentType: dto.documentType,
      }));

    const payload: Prisma.InvoiceTemplateCreateInput = {
      documentType: dto.documentType.trim(),
      version,
      priority: dto.priority ?? 100,
      isActive: dto.isActive ?? true,
      checksum: dto.checksum,
      regexRules: dto.regexRules,
      fieldMappings: dto.fieldMappings,
      extractionHints: dto.extractionHints,
      sampleFilename: dto.sampleFilename,
      notes: dto.notes,
      providerName: dto.providerName ?? provider?.name ?? null,
      organization:
        ctx.organizationId !== null
          ? { connect: { id: ctx.organizationId } }
          : undefined,
      company:
        ctx.companyId !== null
          ? { connect: { id: ctx.companyId } }
          : undefined,
      provider: provider ? { connect: { id: provider.id } } : undefined,
      createdBy:
        ctx.userId !== null ? { connect: { id: ctx.userId } } : undefined,
      updatedBy:
        ctx.userId !== null ? { connect: { id: ctx.userId } } : undefined,
    };

    return this.prisma.invoiceTemplate.create({ data: payload });
  }

  async update(id: number, dto: UpdateInvoiceTemplateDto) {
    const template = await this.findOne(id);
    const provider = await this.ensureProvider(dto.providerId);

    const updateData: Prisma.InvoiceTemplateUpdateInput = {
      documentType: dto.documentType?.trim(),
      priority: dto.priority,
      version: dto.version,
      isActive: dto.isActive,
      checksum: dto.checksum,
      regexRules: dto.regexRules,
      fieldMappings: dto.fieldMappings,
      extractionHints: dto.extractionHints,
      sampleFilename: dto.sampleFilename,
      notes: dto.notes,
      providerName: dto.providerName ?? provider?.name,
      updatedAt: new Date(),
    };

    if (dto.providerId !== undefined) {
      updateData.provider = provider
        ? { connect: { id: provider.id } }
        : { disconnect: true };
    } else if (provider?.id !== template.providerId) {
      updateData.provider = provider
        ? { connect: { id: provider.id } }
        : undefined;
    }

    const ctx = this.tenantContext();
    if (ctx.userId !== null) {
      updateData.updatedBy = { connect: { id: ctx.userId } };
    }

    return this.prisma.invoiceTemplate.update({
      where: { id: template.id },
      data: updateData,
    });
  }
}
