import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccEntryStatus, Prisma } from '@prisma/client';

@Injectable()
export class EntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    period?: string;
    from?: Date;
    to?: Date;
    skip: number;
    take: number;
  }) {
    const where: Prisma.AccEntryWhereInput = {};
    if (params.period) {
      where.period = { name: params.period };
    }
    if (params.from || params.to) {
      where.date = {};
      if (params.from) (where.date as any).gte = params.from;
      if (params.to) (where.date as any).lte = params.to;
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.accEntry.findMany({
        where,
        include: { lines: true, period: true },
        skip: params.skip,
        take: params.take,
        orderBy: { date: 'asc' },
      }),
      this.prisma.accEntry.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(id: number) {
    return this.prisma.accEntry.findUnique({
      where: { id },
      include: { lines: true, period: true },
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
    lines: { account: string; description?: string; debit: number; credit: number }[];
  }) {
    return this.prisma.accEntry.create({
      data: {
        periodId: data.periodId,
        date: data.date,
        totalDebit: data.totalDebit,
        totalCredit: data.totalCredit,
        lines: {
          create: data.lines.map((l) => ({
            account: l.account,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
      include: { lines: true, period: true },
    });
  }

  async updateStatus(id: number, status: AccEntryStatus) {
    return this.prisma.accEntry.update({
      where: { id },
      data: { status },
      include: { lines: true, period: true },
    });
  }
}