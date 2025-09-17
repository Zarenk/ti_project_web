import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EntriesService, Entry, EntryLine } from './entries.service';

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
  ): Promise<{ data: Entry[]; total: number }> {
    const { data, total } = await this.service.findAll({
      period,
      from,
      to,
      tz,
      page: Number(page),
      size: Number(size),
    });
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
      })),
      total,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Entry> {
    const e = await this.service.findOne(Number(id));
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
  ): Promise<Entry> {
    return this.service.createDraft({
      period: body.period,
      date: new Date(body.date),
      lines: body.lines,
      providerId: body.providerId,
      serie: body.serie,
      correlativo: body.correlativo,
      invoiceUrl: body.invoiceUrl,
    });
  }

  @Post(':id/post')
  post(@Param('id') id: string): Promise<Entry> {
    return this.service.post(Number(id));
  }

  @Post(':id/void')
  void(@Param('id') id: string): Promise<Entry> {
    return this.service.void(Number(id));
  }
}
