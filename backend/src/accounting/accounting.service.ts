import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AccEntryStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { zonedTimeToUtc } from 'date-fns-tz';
import { endOfDay, startOfDay, parse, endOfMonth, format } from 'date-fns';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import { VerticalConfigService } from 'src/tenancy/vertical-config.service';
import { JournalEntryService } from './services/journal-entry.service';
import { AccountBootstrapService } from './services/account-bootstrap.service';

export interface AccountNode {
  id: number;
  code: string;
  name: string;
  accountType?: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
  parentId: number | null;
  children?: AccountNode[];
  balance?: number;
  updatedAt?: string;
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
  if (typeof v === 'object' && typeof v.toNumber === 'function') {
    const n = v.toNumber();
    return Number.isFinite(n) ? n : def;
  }
  const val = v.valueOf?.();
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
};
const r2 = (n: number) => Math.round(n * 100) / 100;
const REQUIRE_INVOICE_TO_RECOGNIZE_TAX =
  (process.env.REQUIRE_INVOICE_TO_RECOGNIZE_TAX ?? 'true') !== 'false';
const IGV_SUSPENSE_ACCOUNT = process.env.IGV_SUSPENSE_ACCOUNT ?? '4091';

// 1) helper chico para formatear cantidades como ya haces en el front
const formatInventoryQuantity = (value: unknown): string => {
  const n =
    typeof value === 'string'
      ? Number(value.replace(/,/g, '.'))
      : Number(value);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, '');
};

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private prisma: PrismaService,
    private readonly verticalConfig: VerticalConfigService,
    private readonly journalEntryService: JournalEntryService,
    private readonly accountBootstrap: AccountBootstrapService,
  ) {}

  private async ensureAccountingFeatureEnabled(
    companyId?: number | null,
  ): Promise<void> {
    if (companyId == null) {
      return;
    }

    const config = await this.verticalConfig.getConfig(companyId);
    if (config.features.accounting === false) {
      throw new ForbiddenException(
        'El modulo de contabilidad no esta habilitado para esta empresa.',
      );
    }
  }

  private emitTenantLog(
    operation: string,
    tenantContext?: TenantContext | null,
    metadata?: Record<string, unknown>,
    overrides?: { organizationId?: number | null; companyId?: number | null },
  ) {
    const organizationId =
      overrides?.organizationId ?? tenantContext?.organizationId ?? null;
    const companyId = overrides?.companyId ?? tenantContext?.companyId ?? null;

    logOrganizationContext({
      service: AccountingService.name,
      operation,
      organizationId,
      companyId,
      metadata,
    });

    return { organizationId, companyId };
  }

  async getAccounts(
    tenantContext?: TenantContext | null,
  ): Promise<AccountNode[]> {
    await this.ensureAccountingFeatureEnabled(tenantContext?.companyId ?? null);

    this.emitTenantLog('getAccounts', tenantContext);

    const organizationId = tenantContext?.organizationId ?? null;

    const accounts = await this.prisma.account.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { code: 'asc' },
    });

    const map = new Map<number, AccountNode>();
    for (const acc of accounts) {
      map.set(acc.id, {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        accountType: acc.accountType,
        parentId: acc.parentId,
        updatedAt: acc.updatedAt.toISOString(),
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

  async createAccount(
    data: {
      code: string;
      name: string;
      accountType: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
      parentId?: number | null;
    },
    tenantContext?: TenantContext | null,
  ): Promise<AccountNode> {
    await this.ensureAccountingFeatureEnabled(tenantContext?.companyId ?? null);

    const organizationId = tenantContext?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID is required to create an account');
    }

    this.emitTenantLog('createAccount', tenantContext, {
      code: data.code,
      accountType: data.accountType,
      parentId: data.parentId ?? null,
    });

    const account = await this.prisma.account.create({
      data: {
        code: data.code,
        name: data.name,
        accountType: data.accountType,
        parentId: data.parentId ?? null,
        organizationId,
        companyId: tenantContext?.companyId ?? null,
        level: data.code.length,
        isPosting: data.code.length >= 4,
      },
    });
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      parentId: account.parentId,
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  async updateAccount(
    id: number,
    data: {
      code: string;
      name: string;
      accountType?: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
      parentId?: number | null;
    },
    tenantContext?: TenantContext | null,
  ): Promise<AccountNode> {
    await this.ensureAccountingFeatureEnabled(tenantContext?.companyId ?? null);

    this.emitTenantLog('updateAccount', tenantContext, {
      id,
      code: data.code,
      accountType: data.accountType,
      parentId: data.parentId ?? null,
    });

    const updateData: any = {
      code: data.code,
      name: data.name,
      parentId: data.parentId ?? null,
      level: data.code.length,
      isPosting: data.code.length >= 4,
    };

    if (data.accountType) {
      updateData.accountType = data.accountType;
    }

    const account = await this.prisma.account.update({
      where: { id },
      data: updateData,
    });
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      parentId: account.parentId,
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  async getLedger(
    params: {
      accountCode?: string;
      from?: string;
      to?: string;
      page?: number;
      size?: number;
    },
    tenantContext?: TenantContext | null,
  ) {
    await this.ensureAccountingFeatureEnabled(tenantContext?.companyId ?? null);

    this.emitTenantLog('getLedger.request', tenantContext, {
      accountCode: params.accountCode ?? null,
      from: params.from ?? null,
      to: params.to ?? null,
      page: params.page ?? 1,
      size: params.size ?? 20,
    });

    const { accountCode, from, to, page = 1, size = 20 } = params;

    const organizationFilter =
      tenantContext == null
        ? undefined
        : (tenantContext.organizationId ?? null);
    const companyFilter =
      tenantContext == null ? undefined : (tenantContext.companyId ?? null);

    const entryWhere: Record<string, unknown> = {};
    if (from || to) {
      entryWhere.date = {};
      if (from) (entryWhere.date as any).gte = toUtc(from);
      if (to) (entryWhere.date as any).lte = toUtc(to, true);
    }
    if (organizationFilter !== undefined) {
      entryWhere.organizationId = organizationFilter;
    }
    if (companyFilter !== undefined) {
      entryWhere.companyId = companyFilter;
    }

    const where: Record<string, unknown> = {};
    if (accountCode) {
      where.account = accountCode;
    }
    if (Object.keys(entryWhere).length > 0) {
      where.entry = entryWhere;
    }

    let lines: {
      id: number;
      entryId: number;
      account: string;
      description: string | null;
      debit: any;
      credit: any;
      quantity: number | null;
      entry?: {
        id: number;
        date: Date;
        organizationId: number | null;
        companyId: number | null;
      };
    }[] = [];

    try {
      lines = await this.prisma.accEntryLine.findMany({
        where,
        include: {
          entry: {
            select: {
              id: true,
              date: true,
              organizationId: true,
              companyId: true,
            },
          },
        },
        orderBy: [{ entry: { date: 'asc' } }, { id: 'asc' }],
      });
    } catch (error) {
      console.error('Error retrieving ledger', error);
      return {
        data: [],
        total: 0,
        message: 'No se pudo obtener el libro mayor',
      };
    }

    let running = 0;
    const withBalance = lines.map((line) => {
      const debit = toNum(line.debit, 0);
      const credit = toNum(line.credit, 0);
      running += debit - credit;
      return {
        id: line.id,
        entryId: line.entryId,
        account: line.account,
        description: line.description ?? undefined,
        debit,
        credit,
        quantity: line.quantity ?? undefined,
        date: line.entry?.date ?? null,
        organizationId: line.entry?.organizationId ?? null,
        companyId: line.entry?.companyId ?? null,
        balance: running,
      };
    });

    const offset = (Number(page) - 1) * Number(size);
    const data = withBalance.slice(offset, offset + Number(size));

    return { data, total: withBalance.length };
  }

  async getTrialBalance(period: string, tenantContext?: TenantContext | null) {
    await this.ensureAccountingFeatureEnabled(tenantContext?.companyId ?? null);

    this.emitTenantLog('getTrialBalance.request', tenantContext, {
      period,
    });

    if (!period) return [];

    const organizationFilter =
      tenantContext == null
        ? undefined
        : (tenantContext.organizationId ?? null);
    const companyFilter =
      tenantContext == null ? undefined : (tenantContext.companyId ?? null);

    const base = parse(`${period}-01`, 'yyyy-MM-dd', new Date());
    const start = zonedTimeToUtc(startOfDay(base), LIMA_TZ);
    const end = zonedTimeToUtc(endOfDay(endOfMonth(base)), LIMA_TZ);

    const accounts = await this.prisma.account.findMany({
      orderBy: { code: 'asc' },
    });

    const entryFilterBase: Record<string, unknown> = {};
    if (organizationFilter !== undefined) {
      entryFilterBase.organizationId = organizationFilter;
    }
    if (companyFilter !== undefined) {
      entryFilterBase.companyId = companyFilter;
    }

    const results: {
      accountCode: string;
      accountName: string;
      opening: number;
      debit: number;
      credit: number;
      closing: number;
    }[] = [];
    for (const acc of accounts) {
      const lines = await this.prisma.accEntryLine.findMany({
        where: {
          account: acc.code,
          ...(Object.keys(entryFilterBase).length > 0
            ? { entry: entryFilterBase }
            : {}),
        },
        include: { entry: { select: { date: true } } },
      });

      let opening = 0;
      let debit = 0;
      let credit = 0;

      for (const line of lines) {
        const entryDate = line.entry?.date ?? null;
        if (!entryDate) {
          continue;
        }
        const debitValue = toNum(line.debit, 0);
        const creditValue = toNum(line.credit, 0);

        if (entryDate < start) {
          opening += debitValue - creditValue;
        } else if (entryDate <= end) {
          debit += debitValue;
          credit += creditValue;
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

  async createJournalForInventoryEntry(
    entryId: number,
    tenantContext?: TenantContext | null,
  ) {
    this.emitTenantLog('createJournalForInventoryEntry.start', tenantContext, {
      entryId,
    });

    await this.prisma.$transaction(async (prisma) => {
      const entry = await prisma.entry.findUnique({
        where: { id: entryId },
        include: {
          details: { include: { product: true, series: true } },
          invoice: true,
          provider: true,
          store: { select: { companyId: true, organizationId: true } },
        },
      });
      if (!entry) return;

      const entryOrganizationId =
        (entry as any).organizationId ??
        (entry.store as any)?.organizationId ??
        null;
      const entryCompanyId = (entry.store as any)?.companyId ?? null;

      await this.ensureAccountingFeatureEnabled(entryCompanyId);

      this.emitTenantLog(
        'createJournalForInventoryEntry.entryLoaded',
        tenantContext,
        {
          entryId,
          entryOrganizationId,
          entryCompanyId,
          providerId: entry.provider?.id ?? null,
        },
        {
          organizationId: entryOrganizationId,
          companyId: entryCompanyId,
        },
      );

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
      const invoiceCorr =
        (entry as any).correlativo ?? entry.invoice?.nroCorrelativo ?? null;
      const invoiceCode =
        invoiceSerie && invoiceCorr ? `${invoiceSerie}-${invoiceCorr}` : '';

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
          const q = formatInventoryQuantity(
            d?.quantity ?? d?.cantidad ?? d?.qty ?? d?.amount ?? d?.stockChange,
          );
          const nm =
            typeof name === 'string' ? name.trim().replace(/\s{2,}/g, ' ') : '';
          if (!nm) return undefined;
          return q ? `${q}x ${nm}` : nm;
        })
        .filter((s: any): s is string => typeof s === 'string' && s.length > 0);

      // Si por algún motivo no hay nombres, caemos al primer ítem (compatibilidad)
      const firstDetail = entry.details[0];
      const fallbackItemName = firstDetail?.product?.name ?? '';
      const inventorySummary =
        detailSummaries.length > 0
          ? detailSummaries.join(', ')
          : fallbackItemName;

      // series únicas (como ya hacías)
      const allSeries = entry.details.flatMap((detail: any) =>
        Array.isArray(detail?.series)
          ? detail.series
              .map((serie: any) =>
                typeof serie === 'string'
                  ? serie
                  : (serie?.serial ?? undefined),
              )
              .map((value: any) =>
                value != null ? String(value).trim() : undefined,
              )
              .filter(
                (value: any): value is string =>
                  typeof value === 'string' && value.length > 0,
              )
          : [],
      );
      const uniqueSeries = Array.from(new Set(allSeries));
      const seriesText =
        uniqueSeries.length > 0 ? ` (${uniqueSeries.join(', ')})` : '';

      const extraItems = Math.max(entry.details.length - 1, 0);
      const totalQty = entry.details.reduce(
        (s: number, d: any) => s + toNum(d.quantity, 0),
        0,
      );

      // cuenta para el haber según forma de pago / crédito (igual que antes)
      let creditAccount = '1011';
      if ((entry as any).paymentTerm === 'CREDIT') {
        creditAccount = '4211';
      } else if (
        /transfer|yape|plin/i.test((entry as any).paymentMethod ?? '')
      ) {
        creditAccount = '1041';
      }

      const entryDate = new Date(entry.date);
      const periodName = format(entryDate, 'yyyy-MM');
      let period = await prisma.accPeriod.findUnique({
        where: { name: periodName },
      });
      if (!period) {
        period = await prisma.accPeriod.create({ data: { name: periodName } });
      }

      // Evitar duplicados por misma factura dentro del periodo
      let duplicateSuffix = '';
      if (invoiceSerie && invoiceCorr) {
        const duplicates = await prisma.accEntry.count({
          where: {
            periodId: period.id,
            serie: invoiceSerie,
            correlativo: invoiceCorr,
          },
        });
        if (duplicates > 0) {
          duplicateSuffix = ` · Registro ${duplicates + 1}`;
        }
      }

      // 🔹 NUEVO: glosa base del inventario usando el RESUMEN COMPLETO (sin " + n ítems")
      //    Se conserva series cuando aplique y la parte de "Compra <voucher|sin comprobante>"
      const baseDesc =
        `Ingreso ${inventorySummary}${seriesText} – Compra ${invoiceCode || '(sin comprobante)'}`.trim();
      const inventoryDesc = `${baseDesc}${duplicateSuffix}`.trim();

      const igvDesc = `IGV Compra ${invoiceCode}`.trim();
      const paymentDesc = `Pago Compra ${invoiceCode}`.trim();
      const igvDescWithSuffix = `${igvDesc}${duplicateSuffix}`.trim();
      const paymentDescWithSuffix = `${paymentDesc}${duplicateSuffix}`.trim();

      let linesToCreate: any[] = [];
      if (invoiceSerie && invoiceCorr) {
        // Con comprobante: 2011 + 4011 + 1011/1041/4211
        linesToCreate = [
          {
            account: '2011',
            description: inventoryDesc,
            debit: net,
            credit: 0,
            quantity: totalQty,
          },
          {
            account: '4011',
            description: igvDescWithSuffix,
            debit: igv,
            credit: 0,
            quantity: null,
          },
          {
            account: creditAccount,
            description: paymentDescWithSuffix,
            debit: 0,
            credit: amount,
            quantity: null,
          },
        ];
      } else {
        if (REQUIRE_INVOICE_TO_RECOGNIZE_TAX) {
          const withoutInvoiceBase = `Ingreso ${inventorySummary}${seriesText} – Compra (sin comprobante)`;
          const withoutInvoiceDesc =
            `${withoutInvoiceBase}${duplicateSuffix}`.trim();
          const paymentWithoutInvoiceBase = `Pago Compra (sin comprobante)`;
          const paymentWithoutInvoiceDesc =
            `${paymentWithoutInvoiceBase}${duplicateSuffix}`.trim();
          linesToCreate = [
            {
              account: '2011',
              description: withoutInvoiceDesc,
              debit: amount,
              credit: 0,
              quantity: totalQty,
            },
            {
              account: creditAccount,
              description: paymentWithoutInvoiceDesc,
              debit: 0,
              credit: amount,
              quantity: null,
            },
          ];
        } else {
          const withoutInvoiceBase = `Ingreso ${inventorySummary}${seriesText} – Compra (sin comprobante)`;
          const withoutInvoiceDesc =
            `${withoutInvoiceBase}${duplicateSuffix}`.trim();
          const paymentWithoutInvoiceBase = `Pago Compra (sin comprobante)`;
          const paymentWithoutInvoiceDesc =
            `${paymentWithoutInvoiceBase}${duplicateSuffix}`.trim();
          const suspenseBase = `IGV por sustentar (sin comprobante)`;
          const suspenseDesc = `${suspenseBase}${duplicateSuffix}`.trim();
          linesToCreate = [
            {
              account: '2011',
              description: withoutInvoiceDesc,
              debit: net,
              credit: 0,
              quantity: totalQty,
            },
            {
              account: IGV_SUSPENSE_ACCOUNT,
              description: suspenseDesc,
              debit: igv,
              credit: 0,
              quantity: null,
            },
            {
              account: creditAccount,
              description: paymentWithoutInvoiceDesc,
              debit: 0,
              credit: amount,
              quantity: null,
            },
          ];
        }
      }

      await prisma.accEntry.create({
        data: {
          periodId: period.id,
          date: zonedTimeToUtc(entryDate, 'America/Lima'),
          status:
            invoiceSerie && invoiceCorr
              ? AccEntryStatus.POSTED
              : AccEntryStatus.DRAFT,
          totalDebit: amount,
          totalCredit: amount,
          providerId: (entry as any).providerId ?? provider?.id ?? undefined,
          serie: invoiceSerie ?? undefined,
          correlativo: invoiceCorr ?? undefined,
          invoiceUrl: (entry as any).pdfUrl ?? undefined,
          source: 'inventory_entry',
          sourceId: entryId,
          organizationId: entryOrganizationId,
          companyId: entryCompanyId,
          lines: { create: linesToCreate as any },
        },
      });
    });

    // Crear también JournalEntry para que aparezca en la sección unificada de asientos
    await this.createJournalEntryForPurchase(entryId, tenantContext);
  }

  /**
   * Crea un JournalEntry a partir de una compra/entrada de inventario.
   * Se ejecuta DESPUÉS del AccEntry para no romper el flujo existente.
   * Fallos aquí se loguean pero NO bloquean la operación principal.
   */
  private async createJournalEntryForPurchase(
    entryId: number,
    tenantContext?: TenantContext | null,
  ) {
    try {
      // Verificar si ya existe un JournalEntry para esta compra
      const existing = await this.prisma.journalEntry.findFirst({
        where: {
          source: 'PURCHASE',
          description: { contains: `[entry:${entryId}]` },
        },
      });
      if (existing) return;

      const entry = await this.prisma.entry.findUnique({
        where: { id: entryId },
        include: {
          details: { include: { product: true, series: true } },
          invoice: true,
          provider: true,
          store: { select: { companyId: true, organizationId: true } },
        },
      });
      if (!entry) return;

      const entryOrganizationId =
        (entry as any).organizationId ??
        (entry.store as any)?.organizationId ??
        null;
      const entryCompanyId = (entry.store as any)?.companyId ?? null;

      if (!entryOrganizationId) {
        this.logger.warn(
          `Skipping JournalEntry for entry ${entryId}: no organizationId`,
        );
        return;
      }

      // Asegurar que existan las cuentas PCGE por defecto
      await this.accountBootstrap.ensureDefaults(entryOrganizationId);

      // Calcular montos (misma lógica que AccEntry)
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
      if (amount <= 0) return;

      const net = r2(amount / (1 + igvRate));
      const igv = r2(amount - net);

      const invoiceSerie = (entry as any).serie ?? entry.invoice?.serie ?? null;
      const invoiceCorr =
        (entry as any).correlativo ?? entry.invoice?.nroCorrelativo ?? null;
      const invoiceCode =
        invoiceSerie && invoiceCorr ? `${invoiceSerie}-${invoiceCorr}` : '';

      // Cuenta crédito según forma de pago
      let creditAccountCode = '1011';
      if ((entry as any).paymentTerm === 'CREDIT') {
        creditAccountCode = '4211';
      } else if (
        /transfer|yape|plin/i.test((entry as any).paymentMethod ?? '')
      ) {
        creditAccountCode = '1041';
      }

      // Construir líneas con códigos de cuenta
      type CodeLine = { code: string; desc: string; debit: number; credit: number };
      const codeLines: CodeLine[] = [];

      const providerName = entry.provider?.name || 'Sin proveedor';
      const detailSummaries = entry.details
        .map((d: any) => {
          const name = d?.product?.name ?? '';
          const q = formatInventoryQuantity(d?.quantity);
          return q && name ? `${q}x ${name}` : name;
        })
        .filter((s: any): s is string => typeof s === 'string' && s.length > 0);
      const summary = detailSummaries.length > 0 ? detailSummaries.join(', ') : 'Productos';

      if (invoiceSerie && invoiceCorr) {
        codeLines.push(
          { code: '2011', desc: `Inventario – ${summary}`, debit: net, credit: 0 },
          { code: '4011', desc: `IGV compra ${invoiceCode}`, debit: igv, credit: 0 },
          { code: creditAccountCode, desc: `Pago compra ${invoiceCode}`, debit: 0, credit: amount },
        );
      } else if (REQUIRE_INVOICE_TO_RECOGNIZE_TAX) {
        codeLines.push(
          { code: '2011', desc: `Inventario – ${summary} (sin comprobante)`, debit: amount, credit: 0 },
          { code: creditAccountCode, desc: `Pago compra (sin comprobante)`, debit: 0, credit: amount },
        );
      } else {
        codeLines.push(
          { code: '2011', desc: `Inventario – ${summary} (sin comprobante)`, debit: net, credit: 0 },
          { code: IGV_SUSPENSE_ACCOUNT, desc: `IGV por sustentar`, debit: igv, credit: 0 },
          { code: creditAccountCode, desc: `Pago compra (sin comprobante)`, debit: 0, credit: amount },
        );
      }

      // Resolver códigos de cuenta → IDs
      const uniqueCodes = [...new Set(codeLines.map((l) => l.code))];
      const accounts = await this.prisma.account.findMany({
        where: {
          code: { in: uniqueCodes },
          organizationId: entryOrganizationId,
        },
        select: { id: true, code: true },
      });

      const codeToId = new Map(accounts.map((a) => [a.code, a.id]));
      const missing = uniqueCodes.filter((c) => !codeToId.has(c));
      if (missing.length > 0) {
        this.logger.warn(
          `Skipping JournalEntry for entry ${entryId}: missing accounts ${missing.join(', ')}`,
        );
        return;
      }

      const journalLines = codeLines.map(({ code, desc, debit, credit }) => ({
        accountId: codeToId.get(code)!,
        description: desc,
        debit,
        credit,
      }));

      // Descripción con tag de trazabilidad
      const paymentMethod = (entry as any).paymentTerm === 'CREDIT' ? 'Crédito' : 'Contado';
      const description = `Compra -${invoiceCode || entryId} | ${providerName} | ${paymentMethod} [entry:${entryId}]`;

      const effectiveTenant: TenantContext = {
        organizationId: entryOrganizationId,
        companyId: entryCompanyId,
        organizationUnitId: null,
        userId: tenantContext?.userId ?? null,
        isGlobalSuperAdmin: tenantContext?.isGlobalSuperAdmin ?? false,
        isOrganizationSuperAdmin: tenantContext?.isOrganizationSuperAdmin ?? false,
        isSuperAdmin: tenantContext?.isSuperAdmin ?? false,
        allowedOrganizationIds: tenantContext?.allowedOrganizationIds?.length
          ? tenantContext.allowedOrganizationIds
          : [entryOrganizationId],
        allowedCompanyIds: tenantContext?.allowedCompanyIds ?? [],
        allowedOrganizationUnitIds: tenantContext?.allowedOrganizationUnitIds ?? [],
      };

      const journalEntry = await this.journalEntryService.create(
        {
          date: new Date(entry.date),
          description,
          source: 'PURCHASE',
          moneda: 'PEN',
          tipoCambio: undefined,
          lines: journalLines,
        },
        effectiveTenant,
      );

      this.logger.log(
        `JournalEntry ${journalEntry.id} created for entry ${entryId} (source=PURCHASE)`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to create JournalEntry for entry ${entryId}, AccEntry was created successfully`,
        (err as Error).message,
      );
    }
  }
}
