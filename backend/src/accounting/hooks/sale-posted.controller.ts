import { Body, Controller, HttpCode, Post, Logger, Res } from '@nestjs/common';
import { SalePostedDto } from './dto/sale-posted.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntriesService } from '../entries.service';
import { format } from 'date-fns';
import { SaleAccountingService } from '../services/sale-accounting.service';
import { Response } from 'express';

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
  async handle(
    @Body() data: SalePostedDto,
    @Res({ passthrough: true }) res: Response,
  ) {
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
      const invoice = sale.invoices?.[0];
      if (invoice) {
        const existing = await this.entries.findByInvoice(
          invoice.serie,
          invoice.nroCorrelativo,
        );
        if (existing) {
          return { status: 'duplicate' };
        }
      }
      const lines = this.mapper.buildEntryFromSale(sale);
      const draft = await this.entries.createDraft({
        period: format(new Date(data.timestamp), 'yyyy-MM'),
        date: new Date(data.timestamp),
        serie: invoice?.serie,
        correlativo: invoice?.nroCorrelativo,
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
