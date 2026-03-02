import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SunatService } from './sunat.service';

@Injectable()
export class SunatRetryCronService {
  private readonly logger = new Logger(SunatRetryCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sunatService: SunatService,
  ) {}

  @Cron('*/30 * * * *')
  async retryFailedTransmissions() {
    this.logger.debug('Checking for SUNAT transmissions to retry...');

    try {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const stuckCutoff = new Date(Date.now() - 5 * 60 * 1000);

      // First: mark SENDING transmissions older than 5 min as FAILED (stuck)
      await this.prisma.sunatTransmission.updateMany({
        where: {
          status: 'SENDING',
          updatedAt: { lt: stuckCutoff },
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Timeout: transmision atascada en SENDING por mas de 5 minutos.',
        },
      });

      const transmissions = await this.prisma.sunatTransmission.findMany({
        where: {
          status: { in: ['FAILED', 'PENDING', 'SENT'] },
          retryCount: { lt: 3 },
          createdAt: { gte: cutoff },
          payload: { not: Prisma.AnyNull },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      if (transmissions.length === 0) return;

      this.logger.log(
        `Found ${transmissions.length} transmission(s) to retry.`,
      );

      for (const tx of transmissions) {
        try {
          await this.prisma.sunatTransmission.update({
            where: { id: tx.id },
            data: { retryCount: { increment: 1 }, status: 'RETRYING' },
          });

          await this.sunatService.sendDocument({
            companyId: tx.companyId,
            documentType: tx.documentType as 'invoice' | 'boleta' | 'creditNote',
            documentData: tx.payload,
            environmentOverride: tx.environment ?? undefined,
            saleId: tx.saleId ?? null,
            subscriptionInvoiceId: tx.subscriptionInvoiceId ?? null,
          });

          this.logger.log(`Retry succeeded for transmission ${tx.id}`);
        } catch (err) {
          this.logger.error(
            `Retry failed for transmission ${tx.id}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('SUNAT retry cron failed', error);
    }
  }
}
