import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceExtractionService } from './invoice-extraction.service';

const STALL_MINUTES = Number(
  process.env.EXTRACTION_CRON_STALL_MINUTES ?? 5,
);
const BATCH_SIZE = 10;
const CUTOFF_HOURS = 48;

@Injectable()
export class ExtractionCronService {
  private readonly logger = new Logger(ExtractionCronService.name);
  private readonly disabled =
    process.env.EXTRACTION_CRON_DISABLED === 'true';

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractionService: InvoiceExtractionService,
  ) {}

  @Cron('*/5 * * * *')
  async processPendingSamples() {
    if (this.disabled) return;

    try {
      await this.resetStalledSamples();

      const cutoff = new Date(Date.now() - CUTOFF_HOURS * 60 * 60 * 1000);
      const staleCutoff = new Date(
        Date.now() - STALL_MINUTES * 60 * 1000,
      );

      const pending = await this.prisma.invoiceSample.findMany({
        where: {
          extractionStatus: { in: ['PENDING', 'PENDING_TEMPLATE'] },
          updatedAt: { lt: staleCutoff },
          createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
        select: { id: true, extractionStatus: true },
      });

      if (pending.length === 0) return;

      this.logger.log(
        `Processing ${pending.length} pending sample(s)`,
      );

      for (const sample of pending) {
        try {
          await this.extractionService.processSample(sample.id);
          this.logger.debug(`Sample ${sample.id} processed successfully`);
        } catch (error) {
          this.logger.warn(
            `Sample ${sample.id} failed: ${
              error instanceof Error ? error.message : error
            }`,
          );
          // Mark as FAILED to prevent infinite retry loop
          await this.prisma.invoiceSample
            .update({
              where: { id: sample.id },
              data: { extractionStatus: 'FAILED' },
            })
            .catch(() => {});
        }
      }
    } catch (error) {
      this.logger.error(
        `Extraction cron failed: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async resetStalledSamples() {
    const staleCutoff = new Date(
      Date.now() - STALL_MINUTES * 60 * 1000,
    );

    const { count } = await this.prisma.invoiceSample.updateMany({
      where: {
        extractionStatus: 'PROCESSING',
        updatedAt: { lt: staleCutoff },
      },
      data: { extractionStatus: 'PENDING' },
    });

    if (count > 0) {
      this.logger.log(
        `Reset ${count} stalled PROCESSING sample(s) to PENDING`,
      );
    }
  }
}
