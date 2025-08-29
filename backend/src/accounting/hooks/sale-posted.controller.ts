import { Body, Controller, HttpCode, Post, Logger } from '@nestjs/common';
import { SalePostedDto } from './dto/sale-posted.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntriesService } from '../entries.service';
import { format } from 'date-fns';
import { SaleAccountingService } from '../services/sale-accounting.service';

@Controller('accounting/hooks/sale-posted')
export class SalePostedController {
  private readonly logger = new Logger(SalePostedController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entries: EntriesService,
    private readonly mapper: SaleAccountingService,
  ) {}

  @Post()
  @HttpCode(202)
  async handle(@Body() data: SalePostedDto) {
    try {
      const sale = await this.prisma.sales.findUnique({
        where: { id: data.saleId },
        include: { salesDetails: { include: { entryDetail: true } } },
      });
      if (!sale) {
        return { status: 'not_found' };
      }
      const lines = this.mapper.buildEntryFromSale(sale);
      const entry = this.entries.createDraft({
        period: format(new Date(data.timestamp), 'yyyy-MM'),
        date: new Date(data.timestamp),
        lines: lines.map(({ account, description, debit, credit }) => ({
          account,
          description,
          debit,
          credit,
        })),
      });
      this.entries.post(entry.id);
      return { status: 'posted', entryId: entry.id };
    } catch (err) {
      this.logger.error('Failed to process sale-posted hook', err as any);
      throw err;
    }
  }
}