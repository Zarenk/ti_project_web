import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EntriesService, Entry, EntryLine } from './entries.service';

@Controller('accounting/entries')
export class EntriesController {
  constructor(private readonly service: EntriesService) {}

  @Get()
  findAll(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('size') size = '25',
  ): Promise<{ data: Entry[]; total: number }> {
    return this.service.findAll({
      period,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: Number(page),
      size: Number(size),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Entry> {
    return this.service.findOne(Number(id));
  }

  @Post()
  create(@Body() body: { period: string; date: string; lines: EntryLine[] }): Promise<Entry> {
    return this.service.createDraft({
      period: body.period,
      date: new Date(body.date),
      lines: body.lines,
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