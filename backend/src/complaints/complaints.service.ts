import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MenuConfigService } from 'src/menu-config/menu-config.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
import { Prisma } from '@prisma/client';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { RespondComplaintDto } from './dto/respond-complaint.dto';
import { ComplaintFiltersDto } from './dto/complaint-filters.dto';
import { addBusinessDays, getRemainingBusinessDays } from './utils/business-days';
import { generateTrackingCode } from './utils/tracking-code';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly menuConfigService: MenuConfigService,
  ) {}

  // ── Public: Submit complaint ──────────────────────────────────

  async submitPublic(dto: CreateComplaintDto) {
    if (!dto.signatureConfirmed) {
      throw new BadRequestException(
        'Debe confirmar la declaración para enviar el reclamo.',
      );
    }

    // 1. Resolve company from slug
    const tenant = await this.menuConfigService.findTenantBySlug(dto.slug);
    if (!tenant || !tenant.companyId || !tenant.organizationId) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const { organizationId, companyId } = tenant;

    // 2. Get company data for provider snapshot
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        legalName: true,
        name: true,
        sunatRuc: true,
        taxId: true,
        sunatAddress: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const now = new Date();
    const year = now.getFullYear();

    // 3. Generate tracking code (with retry for uniqueness)
    let trackingCode = generateTrackingCode();
    let retries = 0;
    while (retries < 5) {
      const exists = await this.prisma.complaint_book.findUnique({
        where: { trackingCode },
        select: { id: true },
      });
      if (!exists) break;
      trackingCode = generateTrackingCode();
      retries++;
    }

    // 4. Atomic: correlative + record creation
    const complaint = await this.prisma.$transaction(async (tx) => {
      // Allocate correlative
      let sequence = await tx.companyDocumentSequence.findUnique({
        where: {
          companyId_documentType: {
            companyId,
            documentType: 'LIBRO_RECLAMACIONES',
          },
        },
      });

      if (!sequence) {
        sequence = await tx.companyDocumentSequence.create({
          data: {
            companyId,
            documentType: 'LIBRO_RECLAMACIONES',
            serie: '',
            nextCorrelative: 1,
            correlativeLength: 9,
          },
        });
      }

      const updated = await tx.companyDocumentSequence.update({
        where: { id: sequence.id },
        data: { nextCorrelative: { increment: 1 } },
        select: { nextCorrelative: true, correlativeLength: true },
      });

      const issuedNumber = updated.nextCorrelative - 1;
      const padding = updated.correlativeLength ?? 9;
      const correlativeNumber = `${String(issuedNumber).padStart(padding, '0')}-${year}`;

      // Calculate deadline: 15 business days
      const deadlineDate = addBusinessDays(now, 15);

      return tx.complaint_book.create({
        data: {
          organizationId,
          companyId,
          correlativeNumber,
          year,
          trackingCode,
          status: 'PENDING',

          // Section 1: Consumer
          consumerName: dto.consumerName,
          consumerDocType: dto.consumerDocType,
          consumerDocNumber: dto.consumerDocNumber,
          consumerAddress: dto.consumerAddress,
          consumerPhone: dto.consumerPhone,
          consumerEmail: dto.consumerEmail,
          isMinor: dto.isMinor ?? false,
          parentName: dto.parentName,
          parentDocType: dto.parentDocType,
          parentDocNumber: dto.parentDocNumber,

          // Section 2: Good
          goodType: dto.goodType,
          claimedAmount: dto.claimedAmount,
          amountCurrency: dto.amountCurrency ?? 'PEN',
          goodDescription: dto.goodDescription,

          // Section 3: Detail
          complaintType: dto.complaintType,
          detail: dto.detail,
          consumerRequest: dto.consumerRequest,

          // Signature
          signatureConfirmed: true,
          signatureTimestamp: now,

          // Deadline
          deadlineDate,

          // Provider snapshot
          providerLegalName: company.legalName || company.name,
          providerRuc: company.sunatRuc || company.taxId || '',
          providerAddress: company.sunatAddress || '',
        },
      });
    });

    this.logger.log(
      `Complaint ${complaint.correlativeNumber} submitted for company ${companyId}`,
    );

    return {
      id: complaint.id,
      correlativeNumber: complaint.correlativeNumber,
      trackingCode: complaint.trackingCode,
      createdAt: complaint.createdAt,
      deadlineDate: complaint.deadlineDate,
    };
  }

  // ── Public: Lookup by tracking code ──────────────────────────

  async lookupByTrackingCode(trackingCode: string) {
    const complaint = await this.prisma.complaint_book.findUnique({
      where: { trackingCode },
      select: {
        correlativeNumber: true,
        trackingCode: true,
        status: true,
        complaintType: true,
        createdAt: true,
        deadlineDate: true,
        responseText: true,
        responseDate: true,
        providerLegalName: true,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Reclamo no encontrado con ese código.');
    }

    return {
      ...complaint,
      remainingBusinessDays: getRemainingBusinessDays(complaint.deadlineDate),
    };
  }

  // ── Public: Get company info for form pre-fill ────────────────

  async getCompanyForComplaint(slug: string) {
    const tenant = await this.menuConfigService.findTenantBySlug(slug);
    if (!tenant || !tenant.companyId) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: tenant.companyId },
      select: {
        name: true,
        legalName: true,
        sunatRuc: true,
        taxId: true,
        sunatAddress: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    return {
      name: company.legalName || company.name,
      ruc: company.sunatRuc || company.taxId || '',
      address: company.sunatAddress || '',
    };
  }

  // ── Admin: List with filters + pagination ─────────────────────

  async findAll(
    organizationId: number | null,
    companyId: number | null,
    filters: ComplaintFiltersDto,
  ) {
    if (!organizationId) return { data: [], total: 0, page: 1, pageSize: 20 };

    const tenantFilter = buildOrganizationFilter(organizationId, companyId);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const where: Prisma.complaint_bookWhereInput = {
      ...tenantFilter,
      ...(filters.status && { status: filters.status }),
      ...(filters.complaintType && { complaintType: filters.complaintType }),
      ...(filters.dateFrom && {
        createdAt: { gte: new Date(filters.dateFrom) },
      }),
      ...(filters.dateTo && {
        createdAt: {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          lte: new Date(filters.dateTo),
        },
      }),
      ...(filters.search && {
        OR: [
          { consumerName: { contains: filters.search, mode: 'insensitive' } },
          { consumerDocNumber: { contains: filters.search } },
          { correlativeNumber: { contains: filters.search } },
          { trackingCode: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.complaint_book.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.complaint_book.count({ where }),
    ]);

    const enriched = data.map((c) => ({
      ...c,
      remainingBusinessDays: getRemainingBusinessDays(c.deadlineDate),
    }));

    return { data: enriched, total, page, pageSize };
  }

  // ── Admin: Detail ─────────────────────────────────────────────

  async findById(
    organizationId: number | null,
    companyId: number | null,
    id: number,
  ) {
    const tenantFilter = buildOrganizationFilter(organizationId, companyId);

    const complaint = await this.prisma.complaint_book.findFirst({
      where: { id, ...tenantFilter },
      include: {
        respondedBy: { select: { id: true, username: true, email: true } },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Reclamo no encontrado.');
    }

    return {
      ...complaint,
      remainingBusinessDays: getRemainingBusinessDays(complaint.deadlineDate),
    };
  }

  // ── Admin: Respond ────────────────────────────────────────────

  async respond(
    organizationId: number | null,
    companyId: number | null,
    id: number,
    dto: RespondComplaintDto,
    userId: number,
  ) {
    const tenantFilter = buildOrganizationFilter(organizationId, companyId);

    const complaint = await this.prisma.complaint_book.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!complaint) {
      throw new NotFoundException('Reclamo no encontrado.');
    }

    if (complaint.status === 'RESPONDED') {
      throw new BadRequestException('Este reclamo ya fue respondido.');
    }

    const now = new Date();

    const updated = await this.prisma.complaint_book.update({
      where: { id },
      data: {
        responseText: dto.responseText,
        responseDate: now,
        respondedByUserId: userId,
        status: 'RESPONDED',
        businessDaysUsed: getRemainingBusinessDays(complaint.deadlineDate) <= 0
          ? 15 + Math.abs(getRemainingBusinessDays(complaint.deadlineDate))
          : 15 - getRemainingBusinessDays(complaint.deadlineDate),
      },
    });

    this.logger.log(`Complaint ${complaint.correlativeNumber} responded by user ${userId}`);

    return updated;
  }

  // ── Admin: Reclassify QUEJA → RECLAMO ─────────────────────────

  async reclassify(
    organizationId: number | null,
    companyId: number | null,
    id: number,
    userId: number,
  ) {
    const tenantFilter = buildOrganizationFilter(organizationId, companyId);

    const complaint = await this.prisma.complaint_book.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!complaint) {
      throw new NotFoundException('Reclamo no encontrado.');
    }

    if (complaint.complaintType !== 'QUEJA') {
      throw new BadRequestException('Solo se pueden reclasificar quejas.');
    }

    return this.prisma.complaint_book.update({
      where: { id },
      data: {
        complaintType: 'RECLAMO',
        reclassified: true,
        reclassifiedAt: new Date(),
        reclassifiedBy: userId,
      },
    });
  }

  // ── Admin: Stats ──────────────────────────────────────────────

  async getStats(organizationId: number | null, companyId: number | null) {
    if (!organizationId) {
      return { total: 0, pending: 0, responded: 0, overdue: 0 };
    }

    const tenantFilter = buildOrganizationFilter(organizationId, companyId);

    const [total, pending, responded, overdue] = await Promise.all([
      this.prisma.complaint_book.count({ where: tenantFilter }),
      this.prisma.complaint_book.count({
        where: { ...tenantFilter, status: 'PENDING' },
      }),
      this.prisma.complaint_book.count({
        where: { ...tenantFilter, status: 'RESPONDED' },
      }),
      this.prisma.complaint_book.count({
        where: { ...tenantFilter, status: 'OVERDUE' },
      }),
    ]);

    return { total, pending, responded, overdue };
  }

  // ── Admin: Export CSV ─────────────────────────────────────────

  async exportCsv(
    organizationId: number | null,
    companyId: number | null,
    filters: ComplaintFiltersDto,
  ): Promise<string> {
    const tenantFilter = buildOrganizationFilter(organizationId, companyId);

    const where: Prisma.complaint_bookWhereInput = {
      ...tenantFilter,
      ...(filters.status && { status: filters.status }),
      ...(filters.complaintType && { complaintType: filters.complaintType }),
      ...(filters.dateFrom && { createdAt: { gte: new Date(filters.dateFrom) } }),
      ...(filters.dateTo && {
        createdAt: {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          lte: new Date(filters.dateTo),
        },
      }),
    };

    const complaints = await this.prisma.complaint_book.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const headers = [
      'Correlativo',
      'Fecha',
      'Tipo',
      'Estado',
      'Consumidor',
      'Doc. Tipo',
      'Doc. Número',
      'Email',
      'Teléfono',
      'Bien',
      'Monto',
      'Moneda',
      'Descripción Bien',
      'Detalle',
      'Pedido',
      'Fecha Respuesta',
      'Respuesta',
    ].join(',');

    const rows = complaints.map((c) => {
      const fields = [
        c.correlativeNumber,
        c.createdAt.toISOString().split('T')[0],
        c.complaintType,
        c.status,
        `"${c.consumerName.replace(/"/g, '""')}"`,
        c.consumerDocType,
        c.consumerDocNumber,
        c.consumerEmail,
        c.consumerPhone || '',
        c.goodType,
        c.claimedAmount ?? '',
        c.amountCurrency,
        `"${c.goodDescription.replace(/"/g, '""')}"`,
        `"${c.detail.replace(/"/g, '""')}"`,
        `"${c.consumerRequest.replace(/"/g, '""')}"`,
        c.responseDate ? c.responseDate.toISOString().split('T')[0] : '',
        c.responseText ? `"${c.responseText.replace(/"/g, '""')}"` : '',
      ];
      return fields.join(',');
    });

    return [headers, ...rows].join('\n');
  }
}
