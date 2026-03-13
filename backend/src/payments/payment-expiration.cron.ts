import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentOrchestratorService } from './payments.service';
import { EXPIRABLE_STATUSES } from './payment-state-machine';

@Injectable()
export class PaymentExpirationCron {
  private readonly logger = new Logger(PaymentExpirationCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: PaymentOrchestratorService,
  ) {}

  /**
   * Expire PENDING/PROCESSING orders that exceeded their TTL.
   * Runs every 2 minutes.
   */
  @Cron('*/2 * * * *')
  async expireStaleOrders(): Promise<void> {
    const now = new Date();

    const expired = await this.prisma.paymentOrder.updateMany({
      where: {
        status: { in: [...EXPIRABLE_STATUSES] },
        expiresAt: { lt: now },
      },
      data: {
        status: 'EXPIRED',
        failureReason: 'TTL_EXPIRED',
        failedAt: now,
      },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} stale payment orders`);
    }
  }

  /**
   * Retry orders stuck in SETTLING state (settlement failed).
   * Runs every minute. Max 5 attempts before marking FAILED.
   */
  @Cron('*/60 * * * * *')
  async retrySettlingOrders(): Promise<void> {
    const cutoff = new Date(Date.now() - 60_000); // >1min since last attempt

    const stuck = await this.prisma.paymentOrder.findMany({
      where: {
        status: 'SETTLING',
        webhookAttempts: { lt: 5 },
        lastWebhookAt: { lt: cutoff },
      },
      take: 5,
      orderBy: { lastWebhookAt: 'asc' },
    });

    for (const order of stuck) {
      this.logger.log(
        `Retrying settlement for ${order.code} (attempt ${order.webhookAttempts + 1})`,
      );
      await this.orchestrator.settlePaymentOrder(order.id);
    }

    // Mark exhausted orders as FAILED
    const exhausted = await this.prisma.paymentOrder.updateMany({
      where: {
        status: 'SETTLING',
        webhookAttempts: { gte: 5 },
      },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: 'SETTLEMENT_EXHAUSTED',
      },
    });

    if (exhausted.count > 0) {
      this.logger.error(
        `${exhausted.count} payment orders FAILED after exhausting settlement retries`,
      );
    }
  }
}
