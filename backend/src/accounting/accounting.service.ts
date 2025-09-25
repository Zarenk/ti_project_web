import { Injectable } from '@nestjs/common';
import { AccEntryStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { zonedTimeToUtc } from 'date-fns-tz';
import { endOfDay, startOfDay, parse, endOfMonth, format } from 'date-fns';

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

// === Helpers robustos y flags ===
const toNum = (v: any, def = 0): number => {
  if (v == null) return def;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }
  if (typeof v === 'object' && typeof (v as any).toNumber === 'function') {
    const n = (v as any).toNumber();
    return Number.isFinite(n) ? n : def;
  }
  const val = (v as any).valueOf?.();
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
};
const r2 = (n: number) => Math.round(n * 100) / 100;
const REQUIRE_INVOICE_TO_RECOGNIZE_TAX =
  (process.env.REQUIRE_INVOICE_TO_RECOGNIZE_TAX ?? 'true') !== 'false';
const IGV_SUSPENSE_ACCOUNT = process.env.IGV_SUSPENSE_ACCOUNT ?? '4091';

// 1) helper chico para formatear cantidades como ya haces en el front
const formatInventoryQuantity = (value: unknown): string => {
  const n = typeof value === 'string' ? Number(value.replace(/,/g, '.')) : Number(value);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, '');
};

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

  async createJournalForInventoryEntry(entryId: number) {
  await this.prisma.$transaction(async (prisma) => {
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      include: {
        details: { include: { product: true, series: true } },
        invoice: true,
        provider: true,
      },
    });
    if (!entry) return;

    const existing = await prisma.accEntry.findFirst({
      where: { source: 'inventory_entry', sourceId: entryId },
    });
    if (existing) return;

    const provider = await prisma.provider.findFirst({
      where: { name: entry.provider?.name },
    });

    const igvRate = toNum((entry as any).igvRate, 0.18);
    let totalGross = toNum((entry as any).totalGross, 0);
    if (totalGross <= 0) {
      totalGross = entry.details.reduce((s: number, d: any) => {
        const pu = toNum(d.priceInSoles, NaN);
        const unit = Number.isFinite(pu) ? pu : toNum(d.price, 0);
        return s + unit * toNum(d.quantity, 0);
      }, 0);
    }
    if (totalGross <= 0 && entry.invoice?.total != null) {
      totalGross = toNum(entry.invoice.total, 0);
    }
    const amount = r2(totalGross);
    if (amount <= 0) return; // evita asientos vacíos
    const net = r2(amount / (1 + igvRate));
    const igv = r2(amount - net);

    const invoiceSerie = (entry as any).serie ?? entry.invoice?.serie ?? null;
    const invoiceCorr  = (entry as any).correlativo ?? entry.invoice?.nroCorrelativo ?? null;
    const invoiceCode  = invoiceSerie && invoiceCorr ? `${invoiceSerie}-${invoiceCorr}` : '';

    // 🔹 NUEVO: construir resumen con TODOS los ítems: "<cant>x <nombre>"
    const detailSummaries: string[] = entry.details
      .map((d: any) => {
        const name =
          d?.product?.name ??
          d?.item?.productName ??
          d?.item?.name ??
          d?.product_name ??
          d?.name ??
          d?.itemName ??
          d?.descripcion ??
          d?.description ??
          '';
        const q = formatInventoryQuantity(d?.quantity ?? d?.cantidad ?? d?.qty ?? d?.amount ?? d?.stockChange);
        const nm = typeof name === 'string' ? name.trim().replace(/\s{2,}/g, ' ') : '';
        if (!nm) return undefined;
        return q ? `${q}x ${nm}` : nm;
      })
      .filter((s: any): s is string => typeof s === 'string' && s.length > 0);

    // Si por algún motivo no hay nombres, caemos al primer ítem (compatibilidad)
    const firstDetail = entry.details[0];
    const fallbackItemName = firstDetail?.product?.name ?? '';
    const inventorySummary = detailSummaries.length > 0
      ? detailSummaries.join(', ')
      : fallbackItemName;

    // series únicas (como ya hacías)
    const allSeries = entry.details.flatMap((detail: any) =>
      Array.isArray(detail?.series)
        ? detail.series
            .map((serie: any) =>
              typeof serie === 'string'
                ? serie
                : (serie as any)?.serial ?? undefined,
            )
            .map((value: any) =>
              value != null ? String(value).trim() : undefined,
            )
            .filter((value: any): value is string =>
              typeof value === 'string' && value.length > 0,
            )
        : [],
    );
    const uniqueSeries = Array.from(new Set(allSeries));
    const seriesText = uniqueSeries.length > 0 ? ` (${uniqueSeries.join(', ')})` : '';

    const extraItems = Math.max(entry.details.length - 1, 0);
    const totalQty = entry.details.reduce((s: number, d: any) => s + (toNum(d.quantity, 0)), 0);

    // cuenta para el haber según forma de pago / crédito (igual que antes)
    let creditAccount = '1011';
    if ((entry as any).paymentTerm === 'CREDIT') {
      creditAccount = '4211';
    } else if (/transfer|yape|plin/i.test((entry as any).paymentMethod ?? '')) {
      creditAccount = '1041';
    }

    const entryDate = new Date(entry.date);
    const periodName = format(entryDate, 'yyyy-MM');
    let period = await prisma.accPeriod.findUnique({ where: { name: periodName } });
    if (!period) {
      period = await prisma.accPeriod.create({ data: { name: periodName } });
    }

    // Evitar duplicados por misma factura dentro del periodo
    let duplicateSuffix = '';
    if (invoiceSerie && invoiceCorr) {
      const duplicates = await prisma.accEntry.count({
        where: { periodId: period.id, serie: invoiceSerie, correlativo: invoiceCorr },
      });
      if (duplicates > 0) {
        duplicateSuffix = ` · Registro ${duplicates + 1}`;
      }
    }

    // 🔹 NUEVO: glosa base del inventario usando el RESUMEN COMPLETO (sin " + n ítems")
    //    Se conserva series cuando aplique y la parte de "Compra <voucher|sin comprobante>"
    const baseDesc = `Ingreso ${inventorySummary}${seriesText} – Compra ${invoiceCode || '(sin comprobante)'}`.trim();
    const inventoryDesc = `${baseDesc}${duplicateSuffix}`.trim();

    const igvDesc = `IGV Compra ${invoiceCode}`.trim();
    const paymentDesc = `Pago Compra ${invoiceCode}`.trim();
    const igvDescWithSuffix = `${igvDesc}${duplicateSuffix}`.trim();
    const paymentDescWithSuffix = `${paymentDesc}${duplicateSuffix}`.trim();

    let linesToCreate: any[] = [];
    if (invoiceSerie && invoiceCorr) {
      // Con comprobante: 2011 + 4011 + 1011/1041/4211
      linesToCreate = [
        { account: '2011', description: inventoryDesc, debit: net, credit: 0, quantity: totalQty },
        { account: '4011', description: igvDescWithSuffix, debit: igv, credit: 0, quantity: null },
        { account: creditAccount, description: paymentDescWithSuffix, debit: 0, credit: amount, quantity: null },
      ];
    } else {
      if (REQUIRE_INVOICE_TO_RECOGNIZE_TAX) {
        const withoutInvoiceBase = `Ingreso ${inventorySummary}${seriesText} – Compra (sin comprobante)`;
        const withoutInvoiceDesc = `${withoutInvoiceBase}${duplicateSuffix}`.trim();
        const paymentWithoutInvoiceBase = `Pago Compra (sin comprobante)`;
        const paymentWithoutInvoiceDesc = `${paymentWithoutInvoiceBase}${duplicateSuffix}`.trim();
        linesToCreate = [
          { account: '2011', description: withoutInvoiceDesc, debit: amount, credit: 0, quantity: totalQty },
          { account: creditAccount, description: paymentWithoutInvoiceDesc, debit: 0, credit: amount, quantity: null },
        ];
      } else {
        const withoutInvoiceBase = `Ingreso ${inventorySummary}${seriesText} – Compra (sin comprobante)`;
        const withoutInvoiceDesc = `${withoutInvoiceBase}${duplicateSuffix}`.trim();
        const paymentWithoutInvoiceBase = `Pago Compra (sin comprobante)`;
        const paymentWithoutInvoiceDesc = `${paymentWithoutInvoiceBase}${duplicateSuffix}`.trim();
        const suspenseBase = `IGV por sustentar (sin comprobante)`;
        const suspenseDesc = `${suspenseBase}${duplicateSuffix}`.trim();
        linesToCreate = [
          { account: '2011', description: withoutInvoiceDesc, debit: net, credit: 0, quantity: totalQty },
          { account: IGV_SUSPENSE_ACCOUNT, description: suspenseDesc, debit: igv, credit: 0, quantity: null },
          { account: creditAccount, description: paymentWithoutInvoiceDesc, debit: 0, credit: amount, quantity: null },
        ];
      }
    }

    await prisma.accEntry.create({
      data: {
        periodId: period.id,
        date: zonedTimeToUtc(entryDate, 'America/Lima'),
        status: invoiceSerie && invoiceCorr ? AccEntryStatus.POSTED : AccEntryStatus.DRAFT,
        totalDebit: amount,
        totalCredit: amount,
        providerId: (entry as any).providerId ?? provider?.id ?? undefined,
        serie: invoiceSerie ?? undefined,
        correlativo: invoiceCorr ?? undefined,
        invoiceUrl: (entry as any).pdfUrl ?? undefined,
        source: 'inventory_entry',
        sourceId: entryId,
        lines: { create: linesToCreate as any },
      },
    });
  });
}
}




