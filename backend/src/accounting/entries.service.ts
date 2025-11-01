import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { zonedTimeToUtc } from 'date-fns-tz';
import { EntriesRepository } from './services/entries.repository';
import {
  AccEntryStatus as EntryStatus,
  AccPeriodStatus as PeriodStatus,
} from '@prisma/client';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

export interface EntryLine {
  account: string;
  description?: string;
  debit: number;
  credit: number;
  quantity?: number | null;
}

export interface Entry {
  id: number;
  period: string;
  date: Date;
  description?: string;
  provider?: string;
  serie?: string;
  correlativo?: string;
  invoiceUrl?: string;
  lines: EntryLine[];
  status: EntryStatus;
  totalDebit: number;
  totalCredit: number;
  source?: string;
  sourceId?: number;
  organizationId?: number | null;
  companyId?: number | null;
}

@Injectable()
export class EntriesService {
  constructor(private readonly repo: EntriesRepository) {}

  private normalizeInvoiceUrl(value?: string | null): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private getInventorySourceId(entry: any): number | undefined {
    if (!entry) {
      return undefined;
    }
    const source = entry.source;
    if (source !== 'inventory_entry') {
      return undefined;
    }
    const sourceId = Number(entry.sourceId);
    return Number.isInteger(sourceId) ? sourceId : undefined;
  }

  private buildInvoiceUrlFromEntry(
    entry: any,
    inventoryInvoices?: Map<number, string | undefined>,
  ): string | undefined {
    const direct = this.normalizeInvoiceUrl(entry?.invoiceUrl ?? undefined);
    if (direct) {
      return direct;
    }
    const sourceId = this.getInventorySourceId(entry);
    if (sourceId == null) {
      return undefined;
    }
    const fallback = inventoryInvoices?.get(sourceId);
    return this.normalizeInvoiceUrl(fallback);
  }

  private async getPeriodStatus(period: string): Promise<PeriodStatus> {
    const p = await this.repo.getPeriod(period);
    return p?.status ?? PeriodStatus.OPEN;
  }

  private resolveOrganizationFilter(
    tenant?: TenantContext | null,
  ): number | null | undefined {
    return tenant == null ? undefined : (tenant.organizationId ?? null);
  }

  private resolveCompanyFilter(
    tenant?: TenantContext | null,
  ): number | null | undefined {
    return tenant == null ? undefined : (tenant.companyId ?? null);
  }

  async findAll(
    params: {
      period?: string;
      from?: string;
      to?: string;
      tz?: string;
      page?: number;
      size?: number;
    },
    tenant?: TenantContext | null,
  ): Promise<{ data: Entry[]; total: number }> {
    const {
      period,
      from,
      to,
      tz = 'America/Lima',
      page = 1,
      size = 25,
    } = params;

    const organizationFilter = this.resolveOrganizationFilter(tenant);
    const companyFilter = this.resolveCompanyFilter(tenant);

    // Normaliza YYYY-MM-DD a rango del dia en tz; si viene ISO, se usa tal cual
    const toDayStart = (d: string | undefined) =>
      d && d.length === 10 ? `${d}T00:00:00` : d;
    const toDayEnd = (d: string | undefined) =>
      d && d.length === 10 ? `${d}T23:59:59.999` : d;

    const fromIso = toDayStart(from ?? undefined);
    const toIso = toDayEnd(to ?? from ?? undefined);

    const fromUtc = fromIso ? zonedTimeToUtc(fromIso, tz) : undefined;
    const toUtc = toIso ? zonedTimeToUtc(toIso, tz) : undefined;

    const { data, total } = await this.repo.findAll({
      period,
      from: fromUtc,
      to: toUtc,
      skip: (page - 1) * size,
      take: size,
      organizationId: organizationFilter,
      companyId: companyFilter,
    });

    const entriesNeedingInvoice = data.filter(
      (entry) =>
        !this.normalizeInvoiceUrl((entry as any)?.invoiceUrl ?? undefined) &&
        this.getInventorySourceId(entry) !== undefined,
    );

    const inventorySourceIds = Array.from(
      new Set(
        entriesNeedingInvoice
          .map((entry) => this.getInventorySourceId(entry))
          .filter(
            (id): id is number =>
              typeof id === 'number' && Number.isInteger(id) && id > 0,
          ),
      ),
    );

    const inventoryInvoices =
      inventorySourceIds.length > 0
        ? await this.repo.findInventoryPdfUrls(inventorySourceIds)
        : undefined;

    return {
      data: data.map((e) => ({
        id: e.id,
        period: e.period.name,
        date: e.date,
        description: (e as any).description ?? undefined,
        provider: (e.provider as any)?.name ?? undefined,
        serie: (e as any).serie ?? undefined,
        correlativo: (e as any).correlativo ?? undefined,
        invoiceUrl: this.buildInvoiceUrlFromEntry(e, inventoryInvoices),
        source: (e as any).source ?? undefined,
        sourceId: (e as any).sourceId ?? undefined,
        status: e.status,
        totalDebit: e.totalDebit,
        totalCredit: e.totalCredit,
        organizationId: (e as any).organizationId ?? null,
        companyId: (e as any).companyId ?? null,
        lines: e.lines.map((l) => ({
          account: l.account,
          description: l.description ?? undefined,
          debit: Number((l as any).debit ?? 0),
          credit: Number((l as any).credit ?? 0),
          quantity: (l as any).quantity ?? undefined,
        })),
      })),
      total,
    };
  }

  async findOne(id: number, tenant?: TenantContext | null): Promise<Entry> {
    const organizationFilter = this.resolveOrganizationFilter(tenant);
    const companyFilter = this.resolveCompanyFilter(tenant);
    const entry = await this.repo.findOne(id, {
      organizationId: organizationFilter,
      companyId: companyFilter,
    });
    if (!entry) {
      throw new NotFoundException(`Entry ${id} not found`);
    }

    const sourceId = this.getInventorySourceId(entry);
    const needsInventoryLookup =
      !this.normalizeInvoiceUrl((entry as any)?.invoiceUrl ?? undefined) &&
      sourceId !== undefined;
    const inventoryInvoices =
      needsInventoryLookup && sourceId !== undefined
        ? await this.repo.findInventoryPdfUrls([sourceId])
        : undefined;
    const invoiceUrl = this.buildInvoiceUrlFromEntry(entry, inventoryInvoices);

    return {
      id: entry.id,
      period: entry.period.name,
      date: entry.date,
      description: (entry as any).description ?? undefined,
      provider: (entry.provider as any)?.name ?? undefined,
      serie: (entry as any).serie ?? undefined,
      correlativo: (entry as any).correlativo ?? undefined,
      invoiceUrl,
      source: (entry as any).source ?? undefined,
      sourceId: (entry as any).sourceId ?? undefined,
      status: entry.status,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      lines: entry.lines.map((l) => ({
        account: l.account,
        description: l.description ?? undefined,
        debit: Number((l as any).debit ?? 0),
        credit: Number((l as any).credit ?? 0),
        quantity: (l as any).quantity ?? undefined,
      })),
    };
  }

  async findByInvoice(
    serie: string,
    correlativo: string,
    tenant?: TenantContext | null,
  ): Promise<Entry | null> {
    const organizationFilter = this.resolveOrganizationFilter(tenant);
    const companyFilter = this.resolveCompanyFilter(tenant);
    const entry = await this.repo.findByInvoice(serie, correlativo, {
      organizationId: organizationFilter,
      companyId: companyFilter,
    });
    if (!entry) {
      return null;
    }

    const sourceId = this.getInventorySourceId(entry);
    const needsInventoryLookup =
      !this.normalizeInvoiceUrl((entry as any)?.invoiceUrl ?? undefined) &&
      sourceId !== undefined;
    const inventoryInvoices =
      needsInventoryLookup && sourceId !== undefined
        ? await this.repo.findInventoryPdfUrls([sourceId])
        : undefined;
    const invoiceUrl = this.buildInvoiceUrlFromEntry(entry, inventoryInvoices);

    return {
      id: entry.id,
      period: entry.period.name,
      date: entry.date,
      description: (entry as any).description ?? undefined,
      provider: (entry.provider as any)?.name ?? undefined,
      serie: (entry as any).serie ?? undefined,
      correlativo: (entry as any).correlativo ?? undefined,
      invoiceUrl,
      status: entry.status,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      organizationId: (entry as any).organizationId ?? null,
      companyId: (entry as any).companyId ?? null,
      lines: entry.lines.map((l) => ({
        account: l.account,
        description: l.description ?? undefined,
        debit: Number((l as any).debit ?? 0),
        credit: Number((l as any).credit ?? 0),
        quantity: (l as any).quantity ?? undefined,
      })),
    };
  }

  async createDraft(
    data: {
      period: string;
      date: Date;
      lines: EntryLine[];
      providerId?: number;
      serie?: string;
      correlativo?: string;
      invoiceUrl?: string;
    },
    tenant?: TenantContext | null,
  ): Promise<Entry> {
    const organizationFilter = this.resolveOrganizationFilter(tenant);
    const companyFilter = this.resolveCompanyFilter(tenant);
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
      providerId: data.providerId,
      serie: data.serie,
      correlativo: data.correlativo,
      invoiceUrl: data.invoiceUrl,
      lines: data.lines.map((line) => ({
        ...line,
        quantity: line.quantity ?? undefined,
      })),
      organizationId:
        organizationFilter !== undefined ? organizationFilter : undefined,
      companyId: companyFilter !== undefined ? companyFilter : undefined,
    });
    return {
      id: entry.id,
      period: entry.period.name,
      date: entry.date,
      description: (entry as any).description ?? undefined,
      provider: (entry.provider as any)?.name ?? undefined,
      serie: (entry as any).serie ?? undefined,
      correlativo: (entry as any).correlativo ?? undefined,
      invoiceUrl: (entry as any).invoiceUrl ?? undefined,
      status: entry.status,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      organizationId: (entry as any).organizationId ?? null,
      companyId: (entry as any).companyId ?? null,
      lines: entry.lines.map((l) => ({
        account: l.account,
        description: l.description ?? undefined,
        debit: l.debit,
        credit: l.credit,
        quantity: (l as any).quantity ?? undefined,
      })),
    };
  }

  async post(id: number, tenant?: TenantContext | null): Promise<Entry> {
    const organizationFilter = this.resolveOrganizationFilter(tenant);
    const companyFilter = this.resolveCompanyFilter(tenant);
    const entry = await this.repo.findOne(id, {
      organizationId: organizationFilter,
      companyId: companyFilter,
    });
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
      provider: (updated.provider as any)?.name ?? undefined,
      serie: (updated as any).serie ?? undefined,
      correlativo: (updated as any).correlativo ?? undefined,
      invoiceUrl: (updated as any).invoiceUrl ?? undefined,
      status: updated.status,
      totalDebit: updated.totalDebit,
      totalCredit: updated.totalCredit,
      organizationId: (updated as any).organizationId ?? null,
      companyId: (updated as any).companyId ?? null,
      lines: updated.lines.map((l) => ({
        account: l.account,
        description: l.description ?? undefined,
        debit: Number((l as any).debit ?? 0),
        credit: Number((l as any).credit ?? 0),
        quantity: (l as any).quantity ?? undefined,
      })),
    };
  }

  async void(id: number, tenant?: TenantContext | null): Promise<Entry> {
    const organizationFilter = this.resolveOrganizationFilter(tenant);
    const companyFilter = this.resolveCompanyFilter(tenant);
    const entry = await this.repo.findOne(id, {
      organizationId: organizationFilter,
      companyId: companyFilter,
    });
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
      provider: (updated.provider as any)?.name ?? undefined,
      serie: (updated as any).serie ?? undefined,
      correlativo: (updated as any).correlativo ?? undefined,
      invoiceUrl: (updated as any).invoiceUrl ?? undefined,
      status: updated.status,
      totalDebit: updated.totalDebit,
      totalCredit: updated.totalCredit,
      organizationId: (updated as any).organizationId ?? null,
      companyId: (updated as any).companyId ?? null,
      lines: updated.lines.map((l) => ({
        account: l.account,
        description: l.description ?? undefined,
        debit: Number((l as any).debit ?? 0),
        credit: Number((l as any).credit ?? 0),
        quantity: (l as any).quantity ?? undefined,
      })),
    };
  }
}

export { EntryStatus, PeriodStatus };
