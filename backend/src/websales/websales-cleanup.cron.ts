import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

/** Limpia órdenes web PENDING que llevan más de 48 horas sin completarse. */
@Injectable()
export class WebSalesCleanupCronService {
  private readonly logger = new Logger(WebSalesCleanupCronService.name);

  /** Órdenes PENDING más antiguas que esto se marcan DENIED. */
  private static readonly STALE_CUTOFF_MS = 48 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupStaleOrders() {
    this.logger.debug('Checking for stale PENDING web orders...');

    try {
      const cutoff = new Date(
        Date.now() - WebSalesCleanupCronService.STALE_CUTOFF_MS,
      );

      const result = await this.prisma.orders.updateMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: cutoff },
        },
        data: {
          status: 'DENIED',
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Cleaned up ${result.count} stale PENDING order(s) older than 48h.`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to cleanup stale orders', error);
    }
  }
}
