import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EntriesService, Entry, EntryLine } from './entries.service';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

@Controller('accounting/entries')
export class EntriesController {
  constructor(private readonly service: EntriesService) {}

  @Get()
  async findAll(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tz') tz = 'America/Lima',
    @Query('page') page = '1',
    @Query('size') size = '25',
    @CurrentTenant() tenant: TenantContext | null = null,
  ): Promise<{ data: Entry[]; total: number }> {
    const { data, total } = await this.service.findAll({
      period,
      from,
      to,
      tz,
      page: Number(page),
      size: Number(size),
    }, tenant);
    return {
      data: data.map((e) => ({
        id: e.id,
        period: e.period,
        date: e.date,
        description: e.description,
        provider: e.provider,
        serie: e.serie,
        correlativo: e.correlativo,
        invoiceUrl: e.invoiceUrl,
        status: e.status,
        totalDebit: e.totalDebit,
        totalCredit: e.totalCredit,
        lines: e.lines,
        organizationId: e.organizationId ?? null,
        companyId: e.companyId ?? null,
      })),
      total,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null = null,
  ): Promise<Entry> {
    const e = await this.service.findOne(Number(id), tenant);
    return {
      id: e.id,
      period: e.period,
      date: e.date,
      description: e.description,
      provider: e.provider,
      serie: e.serie,
      correlativo: e.correlativo,
      invoiceUrl: e.invoiceUrl,
      status: e.status,
      totalDebit: e.totalDebit,
      totalCredit: e.totalCredit,
      lines: e.lines,
      organizationId: e.organizationId ?? null,
      companyId: e.companyId ?? null,
    };
  }

  @Post()
  create(
    @Body()
    body: {
      period: string;
      date: string;
      lines: EntryLine[];
      providerId?: number;
      serie?: string;
      correlativo?: string;
      invoiceUrl?: string;
    },
    @CurrentTenant() tenant: TenantContext | null = null,
  ): Promise<Entry> {
    return this.service.createDraft({
      period: body.period,
      date: new Date(body.date),
      lines: body.lines,
      providerId: body.providerId,
      serie: body.serie,
      correlativo: body.correlativo,
      invoiceUrl: body.invoiceUrl,
    }, tenant);
  }

  @Post(':id/post')
  post(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null = null,
  ): Promise<Entry> {
    return this.service.post(Number(id), tenant);
  }

  @Post(':id/void')
  void(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null = null,
  ): Promise<Entry> {
    return this.service.void(Number(id), tenant);
  }
}
