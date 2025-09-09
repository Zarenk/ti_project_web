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
      this.logger.log(`Received sale-posted event for sale ${data.saleId}`);
      const sale = await this.prisma.sales.findUnique({
        where: { id: data.saleId },
        include: {
          salesDetails: {
            include: { entryDetail: { include: { product: true } } },
          },
          payments: { include: { paymentMethod: true } },
          invoices: true,
        },
      });
      if (!sale) {
        return { status: 'not_found' };
      }
      const lines = this.mapper.buildEntryFromSale(sale);
      const draft = await this.entries.createDraft({
        period: format(new Date(data.timestamp), 'yyyy-MM'),
        date: new Date(data.timestamp),
        lines: lines.map(({ account, description, debit, credit }) => ({
          account,
          description,
          debit,
          credit,
        })),
      });
      await this.entries.post(draft.id);
      this.logger.log(`Entry ${draft.id} created for sale ${data.saleId}`);
      return { status: 'posted', entryId: draft.id };
    } catch (err) {
      this.logger.error('Failed to process sale-posted hook', err as any);
      throw err;
    }
  }
}