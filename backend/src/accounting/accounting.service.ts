import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { zonedTimeToUtc } from 'date-fns-tz';
import { endOfDay, startOfDay, parse, endOfMonth } from 'date-fns';

const LIMA_TZ = 'America/Lima';

function toUtc(date: string, end = false): Date {
  const time = end ? 'T23:59:59.999' : 'T00:00:00';
  return zonedTimeToUtc(`${date}${time}`, LIMA_TZ);
}

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async getLedger(params: {
    accountCode?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }) {
    const prisma: any = this.prisma;
    const { accountCode, from, to, page = 1, size = 20 } = params;

    const where: any = {};
    if (accountCode) where.accountCode = accountCode;
    if (from || to) {
      const date: any = {};
      if (from) date.gte = toUtc(from);
      if (to) date.lte = toUtc(to, true);
      where.date = date;
    }

    const lines: any[] = await (prisma.journalLine?.findMany
      ? prisma.journalLine.findMany({
          where,
          orderBy: [{ date: 'asc' }, { id: 'asc' }],
        })
      : []);

    let running = 0;
    const withBalance = lines.map((l) => {
      running += (l.debit ?? 0) - (l.credit ?? 0);
      return { ...l, balance: running };
    });

    const offset = (Number(page) - 1) * Number(size);
    const data = withBalance.slice(offset, offset + Number(size));

    return { data, total: withBalance.length };
  }

  async getTrialBalance(period: string) {
    const prisma: any = this.prisma;
    if (!period) return [];

    const base = parse(`${period}-01`, 'yyyy-MM-dd', new Date());
    const start = zonedTimeToUtc(startOfDay(base), LIMA_TZ);
    const end = zonedTimeToUtc(endOfDay(endOfMonth(base)), LIMA_TZ);

    const accounts: any[] = await (prisma.account?.findMany
      ? prisma.account.findMany({ orderBy: { code: 'asc' } })
      : []);

    const results: any[] = [];
    for (const acc of accounts) {
      const lines: any[] = await prisma.journalLine.findMany({
        where: { accountCode: acc.code },
      });
      let opening = 0;
      let debit = 0;
      let credit = 0;
      for (const l of lines) {
        const d = new Date(l.date);
        if (d < start) {
          opening += (l.debit ?? 0) - (l.credit ?? 0);
        } else if (d <= end) {
          debit += l.debit ?? 0;
          credit += l.credit ?? 0;
        }
      }
      const closing = opening + debit - credit;
      results.push({
        accountCode: acc.code,
        accountName: acc.name,
        opening,
        debit,
        credit,
        closing,
      });
    }

    return results;
  }
}
