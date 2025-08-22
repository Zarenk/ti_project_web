import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { zonedTimeToUtc } from 'date-fns-tz';
import { endOfDay, startOfDay, parse, endOfMonth } from 'date-fns';

export interface AccountNode {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  children?: AccountNode[];
}

const LIMA_TZ = 'America/Lima';

function toUtc(date: string, end = false): Date {
  const time = end ? 'T23:59:59.999' : 'T00:00:00';
  return zonedTimeToUtc(`${date}${time}`, LIMA_TZ);
}

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async getAccounts(): Promise<AccountNode[]> {
    const accounts = await this.prisma.account.findMany({
      orderBy: { code: 'asc' },
    });

    const map = new Map<number, AccountNode>();
    for (const acc of accounts) {
      map.set(acc.id, {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        parentId: acc.parentId,
        children: [],
      });
    }

    const roots: AccountNode[] = [];
    for (const node of map.values()) {
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) {
          parent.children!.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    const clean = (node: AccountNode) => {
      if (node.children && node.children.length === 0) {
        delete node.children;
      } else {
        node.children?.forEach(clean);
      }
    };

    roots.forEach(clean);
    return roots;
  }

  async createAccount(data: {
    code: string;
    name: string;
    parentId?: number | null;
  }): Promise<AccountNode> {
    const account = await this.prisma.account.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ?? null,
        level: data.code.length,
        isPosting: data.code.length >= 4,
      },
    });
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      parentId: account.parentId,
    };
  }

  async updateAccount(
    id: number,
    data: { code: string; name: string; parentId?: number | null },
  ): Promise<AccountNode> {
    const account = await this.prisma.account.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ?? null,
        level: data.code.length,
        isPosting: data.code.length >= 4,
      },
    });
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      parentId: account.parentId,
    };
  }

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

    let lines: any[] = [];
    try {
      lines = await (prisma.journalLine?.findMany
        ? prisma.journalLine.findMany({
            where,
            orderBy: [{ date: 'asc' }, { id: 'asc' }],
          })
        : []);
    } catch (error) {
      console.error('Error retrieving ledger', error);
      return { data: [], total: 0, message: 'No se pudo obtener el libro mayor' };
    }

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
