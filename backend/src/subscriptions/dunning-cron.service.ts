import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPrometheusService } from './subscription-prometheus.service';
import {
  SubscriptionQuotaService,
  resolveGraceTier,
} from './subscription-quota.service';

@Injectable()
export class DunningCronService {
  private readonly logger = new Logger(DunningCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly metrics: SubscriptionPrometheusService,
    private readonly quotaService: SubscriptionQuotaService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runDunningJob() {
    this.logger.debug('Ejecutando job de dunning de suscripciones');
    try {
      await this.subscriptionsService.applyScheduledPlanChanges();
      await this.subscriptionsService.processDueDunningInvoices();
      await this.updateGraceTiers();
      await this.processAutoRenewals();
      this.metrics.recordDunningJobRun('success');
    } catch (error) {
      this.logger.error('Fallo la ejecucion del job de dunning', error);
      this.metrics.recordDunningJobRun('error');
      throw error;
    }
  }

  /**
   * Recalculate grace tiers for PAST_DUE subscriptions with paymentEnforced.
   * Updates the graceLimits in metadata if the tier has escalated.
   */
  private async updateGraceTiers() {
    let pastDueSubs: any[];
    try {
      pastDueSubs = await this.prisma.subscription.findMany({
        where: {
          paymentEnforced: true,
          status: SubscriptionStatus.PAST_DUE,
          pastDueSince: { not: null },
        },
        select: {
          id: true,
          paymentEnforced: true,
          status: true,
          pastDueSince: true,
          metadata: true,
        },
      });
    } catch {
      // Columns may not exist yet (migration pending) — skip gracefully
      this.logger.debug('paymentEnforced/pastDueSince columns not available, skipping grace tier update');
      return;
    }

    const tierDistribution: Record<string, number> = {
      SOFT: 0,
      RESTRICTED: 0,
      READ_MOSTLY: 0,
      LOCKED: 0,
    };

    for (const sub of pastDueSubs) {
      const tier = resolveGraceTier(sub);
      if (!tier) continue;

      tierDistribution[tier] = (tierDistribution[tier] ?? 0) + 1;

      const metadata =
        sub.metadata &&
        typeof sub.metadata === 'object' &&
        !Array.isArray(sub.metadata)
          ? (sub.metadata as Record<string, any>)
          : {};
      const currentTier = metadata.graceLimits?.tier;

      if (currentTier !== tier) {
        try {
          await this.quotaService.activateGraceLimits(sub.id, tier);
          this.logger.log(
            `Grace tier updated: sub ${sub.id} ${currentTier ?? 'none'} → ${tier}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to update grace tier for sub ${sub.id}: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
      }
    }

    this.metrics.setGraceTierDistribution(tierDistribution);
  }

  /**
   * Process auto-renewals for payment-enforced ACTIVE subscriptions
   * whose current period has ended and are not set to cancel.
   */
  private async processAutoRenewals() {
    const now = new Date();
    let renewableSubs: any[];
    try {
      renewableSubs = await this.prisma.subscription.findMany({
        where: {
          paymentEnforced: true,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: { lte: now },
        },
        include: {
          plan: true,
          billingPaymentMethod: true,
        },
      });
    } catch {
      this.logger.debug('paymentEnforced column not available, skipping auto-renewals');
      return;
    }

    for (const sub of renewableSubs) {
      try {
        const result = await this.subscriptionsService.attemptAutoCharge(
          sub,
          'renewal',
        );
        if (result.success) {
          this.logger.log(
            `Auto-renewal succeeded for sub ${sub.id} (org ${sub.organizationId})`,
          );
        } else {
          this.logger.warn(
            `Auto-renewal failed for sub ${sub.id}, invoice ${result.invoiceId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Auto-renewal error for sub ${sub.id}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }
  }
}
