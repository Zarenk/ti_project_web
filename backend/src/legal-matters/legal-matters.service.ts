import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerticalConfigService } from 'src/tenancy/vertical-config.service';
import {
  buildOrganizationFilter,
  resolveCompanyId,
} from 'src/tenancy/organization.utils';
import {
  CreateLegalMatterDto,
  CreateLegalMatterPartyDto,
  UpdateLegalMatterPartyDto,
} from './dto/create-legal-matter.dto';
import { UpdateLegalMatterDto } from './dto/update-legal-matter.dto';

@Injectable()
export class LegalMattersService {
  private readonly logger = new Logger(LegalMattersService.name);

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

  private buildTenantFilter(
    organizationId?: number | null,
    companyId?: number | null,
  ): Prisma.LegalMatterWhereInput {
    return buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.LegalMatterWhereInput;
  }

  async findAll(
    organizationId?: number | null,
    companyId?: number | null,
    filters?: {
      status?: string;
      area?: string;
      assignedToId?: number;
      clientId?: number;
      search?: string;
    },
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const where: Prisma.LegalMatterWhereInput = {
      ...this.buildTenantFilter(organizationId, companyId),
    };

    if (filters?.status) {
      where.status = filters.status as any;
    }
    if (filters?.area) {
      where.area = filters.area as any;
    }
    if (filters?.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }
    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { internalCode: { contains: filters.search, mode: 'insensitive' } },
        { externalCode: { contains: filters.search, mode: 'insensitive' } },
        { court: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.legalMatter.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, username: true, email: true },
        },
        client: {
          select: { id: true, name: true, typeNumber: true },
        },
        _count: {
          select: {
            documents: true,
            events: true,
            parties: true,
            notes: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const matter = await this.prisma.legalMatter.findFirst({
      where: {
        id,
        ...this.buildTenantFilter(organizationId, companyId),
      },
      include: {
        assignedTo: {
          select: { id: true, username: true, email: true },
        },
        client: {
          select: { id: true, name: true, typeNumber: true, phone: true, email: true },
        },
        createdBy: {
          select: { id: true, username: true },
        },
        parties: { orderBy: { createdAt: 'asc' } },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, username: true } },
          },
        },
        events: {
          orderBy: { scheduledAt: 'asc' },
          include: {
            assignedTo: { select: { id: true, username: true } },
          },
        },
        timeEntries: {
          orderBy: { date: 'desc' },
          include: {
            user: { select: { id: true, username: true } },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!matter) {
      throw new NotFoundException('Expediente no encontrado.');
    }

    return matter;
  }

  async create(
    dto: CreateLegalMatterDto,
    organizationId?: number | null,
    companyId?: number | null,
    createdById?: number | null,
  ) {
    const resolvedOrgId = organizationId ?? dto.organizationId ?? null;
    const resolvedCompanyId = resolveCompanyId({
      provided: dto.companyId ?? null,
      fallbacks: [companyId ?? null],
      mismatchError:
        'La compania proporcionada no coincide con el contexto.',
    });

    await this.ensureLegalFeatureEnabled(resolvedCompanyId);

    return this.prisma.legalMatter.create({
      data: {
        organizationId: resolvedOrgId,
        companyId: resolvedCompanyId,
        title: dto.title,
        internalCode: dto.internalCode ?? null,
        externalCode: dto.externalCode ?? null,
        description: dto.description ?? null,
        area: (dto.area as any) ?? 'CIVIL',
        priority: (dto.priority as any) ?? 'MEDIUM',
        court: dto.court ?? null,
        judge: dto.judge ?? null,
        jurisdiction: dto.jurisdiction ?? null,
        caseValue: dto.caseValue ?? null,
        currency: dto.currency ?? 'PEN',
        assignedToId: dto.assignedToId ?? createdById ?? null,
        clientId: dto.clientId ?? null,
        createdById: createdById ?? null,
        parties: dto.parties?.length
          ? {
              createMany: {
                data: dto.parties.map((p) => ({
                  name: p.name,
                  role: (p.role as any) ?? 'OTRO',
                  documentType: p.documentType ?? null,
                  documentNumber: p.documentNumber ?? null,
                  email: p.email ?? null,
                  phone: p.phone ?? null,
                  address: p.address ?? null,
                  lawyerName: p.lawyerName ?? null,
                  notes: p.notes ?? null,
                })),
              },
            }
          : undefined,
      },
      include: {
        assignedTo: { select: { id: true, username: true } },
        client: { select: { id: true, name: true } },
        parties: true,
      },
    });
  }

  async update(
    id: number,
    dto: UpdateLegalMatterDto,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalMatter.findFirst({
      where: {
        id,
        ...this.buildTenantFilter(organizationId, companyId),
      },
    });

    if (!existing) {
      throw new NotFoundException('Expediente no encontrado.');
    }

    const data: Prisma.LegalMatterUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.internalCode !== undefined) data.internalCode = dto.internalCode;
    if (dto.externalCode !== undefined) data.externalCode = dto.externalCode;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.area !== undefined) data.area = dto.area as any;
    if (dto.status !== undefined) data.status = dto.status as any;
    if (dto.priority !== undefined) data.priority = dto.priority as any;
    if (dto.court !== undefined) data.court = dto.court;
    if (dto.judge !== undefined) data.judge = dto.judge;
    if (dto.jurisdiction !== undefined) data.jurisdiction = dto.jurisdiction;
    if (dto.caseValue !== undefined) data.caseValue = dto.caseValue;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.nextDeadline !== undefined) {
      data.nextDeadline = dto.nextDeadline ? new Date(dto.nextDeadline) : null;
    }
    if (dto.assignedToId !== undefined) {
      data.assignedTo = dto.assignedToId
        ? { connect: { id: dto.assignedToId } }
        : { disconnect: true };
    }
    if (dto.clientId !== undefined) {
      data.client = dto.clientId
        ? { connect: { id: dto.clientId } }
        : { disconnect: true };
    }

    return this.prisma.legalMatter.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, username: true } },
        client: { select: { id: true, name: true } },
        parties: true,
      },
    });
  }

  async remove(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalMatter.findFirst({
      where: {
        id,
        ...this.buildTenantFilter(organizationId, companyId),
      },
    });

    if (!existing) {
      throw new NotFoundException('Expediente no encontrado.');
    }

    await this.prisma.legalMatter.delete({ where: { id } });
    return { deleted: true, id };
  }

  async getStats(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const tenantFilter = this.buildTenantFilter(organizationId, companyId);

    const [total, active, closed, upcomingEvents] = await Promise.all([
      this.prisma.legalMatter.count({ where: tenantFilter }),
      this.prisma.legalMatter.count({
        where: { ...tenantFilter, status: 'ACTIVE' },
      }),
      this.prisma.legalMatter.count({
        where: {
          ...tenantFilter,
          status: { in: ['CLOSED', 'WON', 'LOST', 'SETTLED'] },
        },
      }),
      this.prisma.legalEvent.count({
        where: {
          matter: tenantFilter,
          status: 'PENDING',
          scheduledAt: { gte: new Date() },
        },
      }),
    ]);

    return { total, active, closed, upcomingEvents };
  }

  // ── Parties ──────────────────────────────────────────

  async addParty(
    matterId: number,
    dto: CreateLegalMatterPartyDto,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const matter = await this.prisma.legalMatter.findFirst({
      where: { id: matterId, ...this.buildTenantFilter(organizationId, companyId) },
    });
    if (!matter) throw new NotFoundException('Expediente no encontrado.');

    return this.prisma.legalMatterParty.create({
      data: {
        matterId,
        name: dto.name,
        role: (dto.role as any) ?? 'OTRO',
        documentType: dto.documentType ?? null,
        documentNumber: dto.documentNumber ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        lawyerName: dto.lawyerName ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async updateParty(
    matterId: number,
    partyId: number,
    dto: UpdateLegalMatterPartyDto,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalMatterParty.findFirst({
      where: {
        id: partyId,
        matterId,
        matter: this.buildTenantFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Parte no encontrada.');

    const data: Prisma.LegalMatterPartyUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role as any;
    if (dto.documentType !== undefined) data.documentType = dto.documentType;
    if (dto.documentNumber !== undefined) data.documentNumber = dto.documentNumber;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.lawyerName !== undefined) data.lawyerName = dto.lawyerName;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.legalMatterParty.update({
      where: { id: partyId },
      data,
    });
  }

  async removeParty(
    matterId: number,
    partyId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalMatterParty.findFirst({
      where: {
        id: partyId,
        matterId,
        matter: this.buildTenantFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Parte no encontrada.');

    await this.prisma.legalMatterParty.delete({ where: { id: partyId } });
    return { deleted: true, id: partyId };
  }
}
