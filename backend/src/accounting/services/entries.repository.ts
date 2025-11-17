import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccEntryStatus, Prisma } from '@prisma/client';

type EntryWithRelations = Prisma.AccEntryGetPayload<{
  include: { lines: true; period: true; provider: true };
}>;

@Injectable()
export class EntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    period?: string;
    from?: Date;
    to?: Date;
    skip: number;
    take: number;
    organizationId?: number | null;
    companyId?: number | null;
  }): Promise<{ data: EntryWithRelations[]; total: number }> {
    const where: Prisma.AccEntryWhereInput = {};
    if (params.period) {
      where.period = { name: params.period };
    }
    if (params.from || params.to) {
      where.date = {};
      if (params.from) (where.date as any).gte = params.from;
      if (params.to) (where.date as any).lte = params.to;
    }
    if (params.organizationId !== undefined) {
      where.organizationId = params.organizationId;
    }
    if (params.companyId !== undefined) {
      where.companyId = params.companyId;
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.accEntry.findMany({
        where,
        include: { lines: true, period: true, provider: true },
        skip: params.skip,
        take: params.take,
        orderBy: { date: 'asc' },
      }),
      this.prisma.accEntry.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(
    id: number,
    filters?: { organizationId?: number | null; companyId?: number | null },
  ): Promise<EntryWithRelations | null> {
    const where: Prisma.AccEntryWhereInput = { id };
    if (filters?.organizationId !== undefined) {
      where.organizationId = filters.organizationId;
    }
    if (filters?.companyId !== undefined) {
      where.companyId = filters.companyId;
    }
    return this.prisma.accEntry.findFirst({
      where,
      include: { lines: true, period: true, provider: true },
    });
  }

  async findByInvoice(
    serie: string,
    correlativo: string,
    filters?: { organizationId?: number | null; companyId?: number | null },
  ): Promise<EntryWithRelations | null> {
    const where: Prisma.AccEntryWhereInput = { serie, correlativo };
    if (filters?.organizationId !== undefined) {
      where.organizationId = filters.organizationId;
    }
    if (filters?.companyId !== undefined) {
      where.companyId = filters.companyId;
    }
    return this.prisma.accEntry.findFirst({
      where,
      include: { lines: true, period: true, provider: true },
    });
  }

  async getPeriod(name: string) {
    return this.prisma.accPeriod.findUnique({ where: { name } });
  }

  async ensurePeriod(name: string) {
    return this.prisma.accPeriod.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  async createEntry(data: {
    periodId: number;
    date: Date;
    totalDebit: number;
    totalCredit: number;
    providerId?: number;
    serie?: string;
    correlativo?: string;
    invoiceUrl?: string;
    lines: {
      account: string;
      description?: string;
      debit: number;
      credit: number;
      quantity?: number;
    }[];
    organizationId?: number | null;
    companyId?: number | null;
  }): Promise<EntryWithRelations> {
    return this.prisma.accEntry.create({
      data: {
        periodId: data.periodId,
        date: data.date,
        totalDebit: data.totalDebit,
        totalCredit: data.totalCredit,
        providerId: data.providerId,
        serie: data.serie,
        correlativo: data.correlativo,
        invoiceUrl: data.invoiceUrl,
        organizationId: data.organizationId ?? null,
        companyId: data.companyId ?? null,
        lines: {
          create: data.lines.map((l) => ({
            account: l.account,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
            quantity: (l as any).quantity,
          })),
        },
      },
      include: { lines: true, period: true, provider: true },
    });
  }

  async findByReferenceId(
    referenceId: string,
    filters?: { organizationId?: number | null; companyId?: number | null },
  ): Promise<EntryWithRelations | null> {
    const where: Prisma.AccEntryWhereInput = { referenceId };
    if (filters?.organizationId !== undefined) {
      where.organizationId = filters.organizationId;
    }
    if (filters?.companyId !== undefined) {
      where.companyId = filters.companyId;
    }
    return this.prisma.accEntry.findFirst({
      where,
      include: { lines: true, period: true, provider: true },
    });
  }

  async findInventoryPdfUrls(
    entryIds: number[],
  ): Promise<Map<number, string | undefined>> {
    if (!entryIds || entryIds.length === 0) {
      return new Map();
    }

    const uniqueIds = Array.from(
      new Set(
        entryIds.map((id) => Number(id)).filter((id) => Number.isInteger(id)),
      ),
    );

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const entries = await this.prisma.entry.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, pdfUrl: true },
    });

    return new Map(
      entries.map((entry) => [entry.id, entry.pdfUrl?.trim() || undefined]),
    );
  }

  async updateStatus(id: number, status: AccEntryStatus) {
    return this.prisma.accEntry.update({
      where: { id },
      data: { status },
      include: { lines: true, period: true, provider: true },
    });
  }
}
