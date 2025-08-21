import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

enum EntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOID = 'VOID',
}

enum PeriodStatus {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED',
}

interface EntryLine {
  account: string;
  description?: string;
  debit: number;
  credit: number;
}

interface Entry {
  id: number;
  period: string;
  date: Date;
  lines: EntryLine[];
  status: EntryStatus;
  totalDebit: number;
  totalCredit: number;
}

@Injectable()
export class EntriesService {
  private entries: Entry[] = [];
  private periods: Record<string, PeriodStatus> = {};
  private idSeq = 1;

  private getPeriodStatus(period: string): PeriodStatus {
    return this.periods[period] ?? PeriodStatus.OPEN;
  }

  findAll(params: { period?: string; from?: Date; to?: Date; page?: number; size?: number }): { data: Entry[]; total: number } {
    const { period, from, to, page = 1, size = 25 } = params;
    let filtered = this.entries;
    if (period) {
      filtered = filtered.filter((e) => e.period === period);
    }
    if (from) {
      filtered = filtered.filter((e) => e.date >= from);
    }
    if (to) {
      filtered = filtered.filter((e) => e.date <= to);
    }
    const total = filtered.length;
    const start = (page - 1) * size;
    const data = filtered.slice(start, start + size);
    return { data, total };
  }

  findOne(id: number): Entry {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) {
      throw new NotFoundException(`Entry ${id} not found`);
    }
    return entry;
  }

  createDraft(data: { period: string; date: Date; lines: EntryLine[] }): Entry {
    if (this.getPeriodStatus(data.period) === PeriodStatus.LOCKED) {
      throw new BadRequestException('Period is locked');
    }
    const totalDebit = data.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = data.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException('Unbalanced entry');
    }
    const entry: Entry = {
      id: this.idSeq++,
      period: data.period,
      date: data.date,
      lines: data.lines,
      status: EntryStatus.DRAFT,
      totalDebit,
      totalCredit,
    };
    this.entries.push(entry);
    return entry;
  }

  post(id: number): Entry {
    const entry = this.findOne(id);
    if (this.getPeriodStatus(entry.period) === PeriodStatus.LOCKED) {
      throw new BadRequestException('Period is locked');
    }
    if (entry.status !== EntryStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT entries can be posted');
    }
    entry.status = EntryStatus.POSTED;
    return entry;
  }

  void(id: number): Entry {
    const entry = this.findOne(id);
    if (this.getPeriodStatus(entry.period) === PeriodStatus.LOCKED) {
      throw new BadRequestException('Period is locked');
    }
    if (entry.status === EntryStatus.VOID) {
      throw new BadRequestException('Entry already voided');
    }
    entry.status = EntryStatus.VOID;
    return entry;
  }
}

export { EntryStatus, PeriodStatus, Entry, EntryLine };