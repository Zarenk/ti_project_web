import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { format } from 'date-fns';

/**
 * Servicio para exportar Libros Electrónicos en formato PLE (SUNAT)
 */
@Injectable()
export class PleExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportLibroDiario(
    period: { from: Date; to: Date },
    tenant: TenantContext | null
  ): Promise<string> {
    if (!tenant?.organizationId) {
      throw new Error('Se requiere un tenant válido');
    }

    const company = await this.prisma.company.findFirst({
      where: { id: tenant.companyId ?? undefined },
      select: { sunatRuc: true },
    });

    const ruc = company?.sunatRuc || '00000000000';

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        organizationId: tenant.organizationId,
        status: 'POSTED',
        date: { gte: period.from, lte: period.to },
      },
      include: { lines: { include: { account: true } } },
      orderBy: [{ date: 'asc' }, { correlativo: 'asc' }],
    });

    const lines: string[] = [];
    const periodStr = format(period.from, 'yyyyMM');

    for (const entry of entries) {
      const dateStr = format(entry.date, 'dd/MM/yyyy');
      for (const line of entry.lines) {
        const parts = [
          ruc, periodStr, entry.cuo, entry.correlativo, dateStr,
          entry.description || '', line.description || '', line.account.code,
          line.debit.toFixed(2), line.credit.toFixed(2), '', entry.sunatStatus,
        ];
        lines.push(parts.join('|'));
      }
    }
    return lines.join('\n');
  }

  async exportLibroMayor(period: { from: Date; to: Date }, tenant: TenantContext | null): Promise<string> {
    if (!tenant?.organizationId) throw new Error('Se requiere un tenant válido');
    
    const company = await this.prisma.company.findFirst({
      where: { id: tenant.companyId ?? undefined },
      select: { sunatRuc: true },
    });
    const ruc = company?.sunatRuc || '00000000000';
    const periodStr = format(period.from, 'yyyyMM');
    
    const accounts = await this.prisma.account.findMany({
      where: { organizationId: tenant.organizationId, isPosting: true },
      orderBy: { code: 'asc' },
    });
    
    const lines: string[] = [];
    for (const account of accounts) {
      const initial = await this.prisma.journalLine.aggregate({
        where: { accountId: account.id, entry: { organizationId: tenant.organizationId, status: 'POSTED', date: { lt: period.from } } },
        _sum: { debit: true, credit: true },
      });
      const movement = await this.prisma.journalLine.aggregate({
        where: { accountId: account.id, entry: { organizationId: tenant.organizationId, status: 'POSTED', date: { gte: period.from, lte: period.to } } },
        _sum: { debit: true, credit: true },
      });
      
      const iD = Number(initial._sum.debit || 0);
      const iC = Number(initial._sum.credit || 0);
      const mD = Number(movement._sum.debit || 0);
      const mC = Number(movement._sum.credit || 0);
      
      if (mD > 0 || mC > 0 || iD > iC || iC > iD) {
        lines.push([ruc, periodStr, account.code, 
          (iD > iC ? iD - iC : 0).toFixed(2), (iC > iD ? iC - iD : 0).toFixed(2),
          mD.toFixed(2), mC.toFixed(2),
          ((iD + mD) > (iC + mC) ? (iD + mD) - (iC + mC) : 0).toFixed(2),
          ((iC + mC) > (iD + mD) ? (iC + mC) - (iD + mD) : 0).toFixed(2), '1'
        ].join('|'));
      }
    }
    return lines.join('\n');
  }
}
