import { Body, Controller, HttpCode, Post, Logger } from '@nestjs/common';
import { PurchasePostedDto } from './dto/purchase-posted.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntriesService } from '../entries.service';
import { format } from 'date-fns';
import { PurchaseAccountingService } from '../services/purcharse-account.service';

@Controller('accounting/hooks/purchase-posted')
export class PurchasePostedController {
  private readonly logger = new Logger(PurchasePostedController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entries: EntriesService,
    private readonly mapper: PurchaseAccountingService,
  ) {}

  @Post()
  @HttpCode(202)
  async handle(@Body() data: PurchasePostedDto) {
    try {
      this.logger.log(`Received purchase-posted event for purchase ${data.purchaseId}`);
      const purchase = await this.prisma.entry.findUnique({
        where: { id: data.purchaseId },
        include: { details: true, invoice: true, provider: true },
      });
      if (!purchase) {
        return { status: 'not_found' };
      }
      const total = purchase.invoice?.total ?? purchase.details.reduce(
        (sum: number, d: any) => sum + (d.price ?? 0) * d.quantity,
        0,
      );
      const igv = +(total - total / 1.18).toFixed(2);
      const lines = this.mapper.buildEntryFromPurchase({
        total,
        igv,
        provider: purchase.provider,
      });
      const entry = await this.entries.createDraft({
        period: format(new Date(data.timestamp), 'yyyy-MM'),
        date: new Date(data.timestamp),
        providerId: (purchase as any).providerId ?? purchase.provider?.id,
        serie: purchase.invoice?.serie,
        correlativo: purchase.invoice?.nroCorrelativo,
        invoiceUrl: (purchase as any).pdfUrl ?? undefined,
        lines: lines.map(({ account, description, debit, credit }) => ({
          account,
          description,
          debit,
          credit,
        })),
      });
      await this.entries.post(entry.id);
      this.logger.log(`Entry ${entry.id} created for purchase ${data.purchaseId}`);
      return { status: 'posted', entryId: entry.id };
    } catch (err) {
      this.logger.error('Failed to process purchase-posted hook', err as any);
      throw err;
    }
  }
}
