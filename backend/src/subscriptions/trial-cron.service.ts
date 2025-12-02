import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionNotificationsService } from './subscription-notifications.service';

const TRIAL_WARNING_DAYS = [7, 3, 1];
const ALERT_TYPE = 'subscription_trial';

@Injectable()
export class TrialCronService {
  private readonly logger = new Logger(TrialCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: SubscriptionNotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async runTrialCheck() {
    const today = new Date();
    this.logger.log('Running trial expirations job');

    const soonThreshold = new Date(today);
    soonThreshold.setDate(today.getDate() + Math.max(...TRIAL_WARNING_DAYS));

    const expiringTrials = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: {
          not: null,
          lte: soonThreshold,
        },
      },
      include: { plan: true, organization: true },
    });

    for (const trial of expiringTrials) {
      if (!trial.trialEndsAt) continue;
      const daysLeft = this.diffInDays(trial.trialEndsAt, today);
      if (daysLeft <= 0) {
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

  private async expireTrial(subscriptionId: number, organizationId: number) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        currentPeriodEnd: new Date(),
      },
    });

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
