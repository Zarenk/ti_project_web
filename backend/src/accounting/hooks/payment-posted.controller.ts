import { Body, Controller, HttpCode, Post, Logger, UseGuards } from '@nestjs/common';
import { PaymentPostedDto } from './dto/payment-posted.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntriesService } from '../entries.service';
import { format } from 'date-fns';
import { PaymentAccountingService } from '../services/payment-accounting.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('accounting/hooks/payment-posted')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class PaymentPostedController {
  private readonly logger = new Logger(PaymentPostedController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entries: EntriesService,
    private readonly mapper: PaymentAccountingService,
  ) {}

  @Post()
  @HttpCode(202)
  async handle(@Body() data: PaymentPostedDto) {
    try {
      this.logger.log(
        `Received payment-posted event for payment ${data.paymentId}`,
      );
      const payment = await this.prisma.salePayment.findUnique({
        where: { id: data.paymentId },
        include: { sale: { include: { client: true } } },
      });
      if (!payment) {
        return { status: 'not_found' };
      }
      if (payment.salesId) {
        // Payments linked to sales are already accounted in sale entry
        return { status: 'ignored' };
      }
      const lines = this.mapper.buildEntryFromPayment(payment);
      const entry = await this.entries.createDraft({
        period: format(new Date(data.timestamp), 'yyyy-MM'),
        date: new Date(data.timestamp),
        lines: lines.map(({ account, description, debit, credit }) => ({
          account,
          description,
          debit,
          credit,
        })),
      });
      await this.entries.post(entry.id);
      this.logger.log(
        `Entry ${entry.id} created for payment ${data.paymentId}`,
      );
      return { status: 'posted', entryId: entry.id };
    } catch (err) {
      this.logger.error('Failed to process payment-posted hook', err as any);
      throw err;
    }
  }
}
