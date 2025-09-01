import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntriesRepository } from './services/entries.repository';
import {
  AccEntryStatus as EntryStatus,
  AccPeriodStatus as PeriodStatus,
} from '@prisma/client';

export interface EntryLine {
  account: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface Entry {
  id: number;
  period: string;
  date: Date;
  description?: string;
  provider?: string;
  serie?: string;
  correlativo?: string;
  lines: EntryLine[];
  status: EntryStatus;
  totalDebit: number;
  totalCredit: number;
}

@Injectable()
export class EntriesService {
  constructor(private readonly repo: EntriesRepository) {}

  private async getPeriodStatus(period: string): Promise<PeriodStatus> {
    const p = await this.repo.getPeriod(period);
    return p?.status ?? PeriodStatus.OPEN;
  }

  async findAll(params: {
    period?: string;
    from?: Date;
    to?: Date;
    page?: number;
    size?: number;
  }): Promise<{ data: Entry[]; total: number }> {
    const { period, from, to, page = 1, size = 25 } = params;
    const { data, total } = await this.repo.findAll({
      period,
      from,
      to,
      skip: (page - 1) * size,
      take: size,
    });
    return {
      data: data.map((e) => ({
        id: e.id,
        period: e.period.name,
        date: e.date,
        description: (e as any).description ?? undefined,
        provider: (e as any).provider ?? undefined,
        serie: (e as any).serie ?? undefined,
        correlativo: (e as any).correlativo ?? undefined,
        status: e.status,
        totalDebit: e.totalDebit,
        totalCredit: e.totalCredit,
        lines: e.lines.map((l) => ({
          account: l.account,
          description: l.description ?? undefined,
          debit: l.debit,
          credit: l.credit,
        })),
      })),
      total,
    };
  }

  async findOne(id: number): Promise<Entry> {
    const entry = await this.repo.findOne(id);
    if (!entry) {
      throw new NotFoundException(`Entry ${id} not found`);
    }
    return {
      id: entry.id,
      period: entry.period.name,
      date: entry.date,
      description: (entry as any).description ?? undefined,
      provider: (entry as any).provider ?? undefined,
      serie: (entry as any).serie ?? undefined,
      correlativo: (entry as any).correlativo ?? undefined,
      status: entry.status,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      lines: entry.lines.map((l) => ({
        account: l.account,
        description: l.description ?? undefined,
        debit: l.debit,
        credit: l.credit,
      })),
    };
  }

  async createDraft(data: { period: string; date: Date; lines: EntryLine[] }): Promise<Entry> {
    const period = await this.repo.ensurePeriod(data.period);
    if (period.status === PeriodStatus.LOCKED) {
      throw new BadRequestException('Period is locked');
    }
    const totalDebit = data.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = data.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException('Unbalanced entry');
    }
    const entry = await this.repo.createEntry({
      periodId: period.id,
      date: data.date,
      totalDebit,
      totalCredit,
      lines: data.lines,
    });
    return {
      id: entry.id,
      period: entry.period.name,
      date: entry.date,
      description: (entry as any).description ?? undefined,
      provider: (entry as any).provider ?? undefined,
      serie: (entry as any).serie ?? undefined,
      correlativo: (entry as any).correlativo ?? undefined,
      status: entry.status,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      lines: entry.lines.map((l) => ({
        account: l.account,
        description: l.description ?? undefined,
        debit: l.debit,
        credit: l.credit,
      })),
    };
  }

  async post(id: number): Promise<Entry> {
    const entry = await this.repo.findOne(id);
    if (!entry) {
      throw new NotFoundException(`Entry ${id} not found`);
    }
    const period = await this.repo.getPeriod(entry.period.name);
    if (period && period.status === PeriodStatus.LOCKED) {
      throw new BadRequestException('Period is locked');
    }
    if (entry.status !== EntryStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT entries can be posted');
    }
    const updated = await this.repo.updateStatus(id, EntryStatus.POSTED);
    return {
      id: updated.id,
      period: updated.period.name,
      date: updated.date,
      description: (updated as any).description ?? undefined,
      provider: (updated as any).provider ?? undefined,
      serie: (updated as any).serie ?? undefined,
      correlativo: (updated as any).correlativo ?? undefined,
      status: updated.status,
      totalDebit: updated.totalDebit,
      totalCredit: updated.totalCredit,
      lines: updated.lines.map((l) => ({
        account: l.account,
        description: l.description ?? undefined,
        debit: l.debit,
        credit: l.credit,
      })),
    };
  }

  async void(id: number): Promise<Entry> {
    const entry = await this.repo.findOne(id);
    if (!entry) {
      throw new NotFoundException(`Entry ${id} not found`);
    }
    const period = await this.repo.getPeriod(entry.period.name);
    if (period && period.status === PeriodStatus.LOCKED) {
      throw new BadRequestException('Period is locked');
    }
    if (entry.status === EntryStatus.VOID) {
      throw new BadRequestException('Entry already voided');
    }
    const updated = await this.repo.updateStatus(id, EntryStatus.VOID);
    return {
      id: updated.id,
      period: updated.period.name,
      date: updated.date,
      description: (updated as any).description ?? undefined,
      provider: (updated as any).provider ?? undefined,
      serie: (updated as any).serie ?? undefined,
      correlativo: (updated as any).correlativo ?? undefined,
      status: updated.status,
      totalDebit: updated.totalDebit,
      totalCredit: updated.totalCredit,
      lines: updated.lines.map((l) => ({
        account: l.account,
        description: l.description ?? undefined,
        debit: l.debit,
        credit: l.credit,
      })),
    };
  }
}

export { EntryStatus, PeriodStatus };