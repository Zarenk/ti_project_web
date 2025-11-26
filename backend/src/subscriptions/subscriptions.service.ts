import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  SubscriptionStatus,
  SubscriptionPlan,
  Subscription,
  SubscriptionInvoiceStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StartTrialDto } from './dto/start-trial.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import {
  PaymentProvider,
  CheckoutSessionResult,
} from './payment-providers/payment-provider.interface';
import { PAYMENT_PROVIDER_TOKEN } from './subscriptions.tokens';

const DEFAULT_TRIAL_DAYS = 14;
const BILLING_CYCLE_DAYS = 30;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN)
    private readonly paymentProvider: PaymentProvider,
  ) {}
  private readonly logger = new Logger(SubscriptionsService.name);

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ price: 'asc' }, { name: 'asc' }],
    });
  }

  async startTrial(dto: StartTrialDto) {
    const plan = await this.ensurePlan(dto.planCode);
    await this.ensureOrganization(dto.organizationId);

    const now = new Date();
    const trialEndsAt = this.resolveTrialEnd(plan, dto.trialEndsAt);
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { organizationId: dto.organizationId },
    });
    const metadataBase = this.coerceJsonRecord(
      existingSubscription?.metadata ?? {},
    );

    return this.prisma.subscription.upsert({
      where: { organizationId: dto.organizationId },
      create: {
        organizationId: dto.organizationId,
        planId: plan.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        metadata: { createdVia: 'manual_trial' },
      },
      update: {
        planId: plan.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: {
          ...metadataBase,
          trialRefreshedAt: now.toISOString(),
        },
      },
      include: { plan: true },
    });
  }

  async createCheckoutSession(dto: CreateCheckoutDto) {
    const plan = await this.ensurePlan(dto.planCode);
    await this.ensureOrganization(dto.organizationId);

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { organizationId: dto.organizationId },
    });

    const currency = dto.currency ?? plan.currency;
    const checkoutResult = await this.paymentProvider.createCheckoutSession({
      organizationId: dto.organizationId,
      planCode: plan.code,
      amount: plan.price.toString(),
      currency,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      metadata: existingSubscription?.metadata as Record<string, any> | undefined,
    });

    const metadata = {
      ...(this.coerceJsonRecord(existingSubscription?.metadata ?? {})),
      pendingCheckout: {
        sessionId: checkoutResult.sessionId,
        planCode: plan.code,
        requestedAt: new Date().toISOString(),
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
        currency,
      },
    };

    let subscription: Subscription;
    if (existingSubscription) {
      subscription = await this.prisma.subscription.update({
        where: { organizationId: dto.organizationId },
        data: {
          planId: plan.id,
          metadata,
        },
      });
    } else {
      subscription = await this.prisma.subscription.create({
        data: {
          organizationId: dto.organizationId,
          planId: plan.id,
          status: SubscriptionStatus.TRIAL,
          metadata,
        },
      });
    }

    return {
      ...checkoutResult,
      currency,
      amount: plan.price.toString(),
      subscriptionId: subscription.id,
      planId: plan.id,
    };
  }

  async finalizeCheckoutSession(sessionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        metadata: {
          path: ['pendingCheckout', 'sessionId'],
          equals: sessionId,
        },
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      this.logger.warn(`Checkout session ${sessionId} not found`);
      throw new NotFoundException(
        `No se encontró suscripción asociada a la sesión ${sessionId}`,
      );
    }

    const plan = subscription.plan;
    const now = new Date();
    const periodEnd = this.calculateNextPeriodEnd(now, plan);
    const metadata = this.coerceJsonRecord(subscription.metadata);
    delete metadata.pendingCheckout;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          trialEndsAt: null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          canceledAt: null,
          cancelAtPeriodEnd: false,
          metadata,
        },
      });

      await tx.subscriptionInvoice.create({
        data: {
          subscriptionId: subscription.id,
          organizationId: subscription.organizationId,
          status: SubscriptionInvoiceStatus.PAID,
          amount: plan.price,
          currency: plan.currency,
          billingPeriodStart: now,
          billingPeriodEnd: periodEnd,
          paidAt: now,
          metadata: {
            provider: 'mock',
            sessionId,
          },
        },
      });
    });

    this.logger.log(
      `Subscription ${subscription.id} activated via session ${sessionId}`,
    );

    return {
      subscriptionId: subscription.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
    };
  }

  private async ensurePlan(code: string): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException(`Plan ${code} no disponible`);
    }
    return plan;
  }

  private async ensureOrganization(id: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!organization) {
      throw new BadRequestException(
        `La organización ${id} no existe o está inactiva`,
      );
    }
  }

  private resolveTrialEnd(
    plan: SubscriptionPlan,
    requested?: string,
  ): Date | null {
    if (!requested && !plan.trialDays) {
      return null;
    }

    if (requested) {
      return new Date(requested);
    }

    const days = plan.trialDays ?? DEFAULT_TRIAL_DAYS;
    const base = new Date();
    base.setDate(base.getDate() + days);
    return base;
  }

  private coerceJsonRecord(value: unknown): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    return {};
  }

  private calculateNextPeriodEnd(start: Date, plan: SubscriptionPlan): Date {
    const result = new Date(start);
    if (plan.interval === 'YEARLY') {
      result.setFullYear(result.getFullYear() + 1);
      return result;
    }
    result.setDate(result.getDate() + BILLING_CYCLE_DAYS);
    return result;
  }
}
