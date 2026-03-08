import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionNotificationsService } from './subscription-notifications.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionQuotaService } from './subscription-quota.service';

const TRIAL_WARNING_DAYS = [7, 3, 1];
const ALERT_TYPE = 'subscription_trial';

@Injectable()
export class TrialCronService {
  private readonly logger = new Logger(TrialCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: SubscriptionNotificationsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly quotaService: SubscriptionQuotaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async runTrialCheck() {
    const today = new Date();
    this.logger.log('Running trial expirations job');

    const soonThreshold = new Date(today);
    soonThreshold.setDate(today.getDate() + Math.max(...TRIAL_WARNING_DAYS));

    let expiringTrials: any[];
    try {
      expiringTrials = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIAL,
          trialEndsAt: {
            not: null,
            lte: soonThreshold,
          },
        },
        include: {
          plan: true,
          organization: true,
          billingPaymentMethod: true,
        },
      });
    } catch {
      // Schema columns may not exist yet (migration pending) — skip gracefully
      this.logger.warn('Subscription schema mismatch, skipping trial check');
      return;
    }

    for (const trial of expiringTrials) {
      if (!trial.trialEndsAt) continue;
      const daysLeft = this.diffInDays(trial.trialEndsAt, today);
      if (daysLeft <= 0) {
        await this.handleTrialExpiration(trial);
      } else if (TRIAL_WARNING_DAYS.includes(daysLeft)) {
        await this.recordTrialAlert(trial.organizationId, 'warning', {
          subscriptionId: trial.id,
          daysLeft,
        });
        await this.notifications.sendTrialWarning({
          organizationId: trial.organizationId,
          daysLeft,
          trialEndsAt: trial.trialEndsAt,
          planName: trial.plan?.name,
        });
        this.logger.log(
          `Trial for org ${trial.organizationId} ends in ${daysLeft} day(s)`,
        );
      }
    }
  }

  private async handleTrialExpiration(trial: any) {
    if (trial.paymentEnforced && trial.plan) {
      // Payment-enforced org: attempt auto-charge before expiring
      this.logger.log(
        `Trial expiring for payment-enforced org ${trial.organizationId}, attempting auto-charge`,
      );
      try {
        const result = await this.subscriptionsService.attemptAutoCharge(
          trial,
          'trial_end',
        );
        if (result.success) {
          this.logger.log(
            `Auto-charge succeeded for org ${trial.organizationId}, trial converted to ACTIVE`,
          );
          return;
        }
      } catch (error) {
        this.logger.error(
          `Auto-charge failed for org ${trial.organizationId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    // Either not payment-enforced, or auto-charge failed → expire to PAST_DUE
    await this.expireTrial(trial.id, trial.organizationId);
    await this.recordTrialAlert(trial.organizationId, 'expired', {
      subscriptionId: trial.id,
    });
    await this.notifications.sendTrialExpired({
      organizationId: trial.organizationId,
      trialEndedAt: trial.trialEndsAt,
      planName: trial.plan?.name,
    });
    this.logger.warn(
      `Trial for org ${trial.organizationId} expired (subscription ${trial.id})`,
    );

    // Activate grace limits if payment-enforced
    if (trial.paymentEnforced) {
      try {
        await this.quotaService.activateGraceLimits(trial.id, 'SOFT');
      } catch (error) {
        this.logger.warn(
          `Failed to activate grace limits for sub ${trial.id}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }
  }

  private async expireTrial(subscriptionId: number, organizationId: number) {
    try {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: new Date(),
          pastDueSince: new Date(),
        },
      });
    } catch {
      // pastDueSince column may not exist yet — update without it
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: new Date(),
        },
      });
    }

    const billingCompany = await this.prisma.company.findFirst({
      where: { organizationId },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    if (!billingCompany) {
      this.logger.warn(
        `No company available to record trial expiration invoice for org ${organizationId}`,
      );
      return;
    }

    await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId,
        organizationId,
        companyId: billingCompany.id,
        status: 'PENDING',
        amount: 0,
        subtotal: 0,
        taxRate: 0,
        taxAmount: 0,
        currency: 'PEN',
        metadata: { reason: 'trial_expired' },
      },
    });
  }

  private async recordTrialAlert(
    organizationId: number,
    kind: 'warning' | 'expired',
    metadata: Record<string, any>,
  ) {
    const identifier = `${ALERT_TYPE}_${organizationId}`;
    const baseData = {
      alertType: ALERT_TYPE,
      providerName: 'billing',
      entityType: 'organization',
      entityId: organizationId,
      status: 'ACTIVE',
      organizationId,
    };

    const alert = await this.prisma.monitoringAlert.upsert({
      where: { identifier },
      update: {
        ...baseData,
        metadata: {
          event: kind,
          ...metadata,
          at: new Date().toISOString(),
        },
        failureCount: kind === 'expired' ? { increment: 1 } : undefined,
        lastFailureAt: kind === 'expired' ? new Date() : undefined,
      },
      create: {
        ...baseData,
        identifier,
        metadata: {
          event: kind,
          ...metadata,
          at: new Date().toISOString(),
        },
      },
    });

    await this.prisma.monitoringAlertEvent.create({
      data: {
        alertId: alert.id,
        organizationId,
        alertType: ALERT_TYPE,
        status: kind === 'warning' ? 'WARNING' : 'EXPIRED',
        severity: kind === 'warning' ? 'INFO' : 'ERROR',
        message:
          kind === 'warning'
            ? 'El periodo de prueba termina pronto'
            : 'El periodo de prueba ha finalizado',
        metadata,
      },
    });
  }

  private diffInDays(target: Date, base: Date) {
    const diff = target.getTime() - base.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
