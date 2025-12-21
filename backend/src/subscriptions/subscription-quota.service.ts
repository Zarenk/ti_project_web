import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export const DEFAULT_GRACE_LIMITS = {
  users: 1,
  invoices: 50,
  storageMB: 512,
} as const;

export interface QuotaUsage {
  plan: {
    name: string;
    code: string;
    status: SubscriptionStatus | 'TRIAL';
  };
  trial: {
    isTrial: boolean;
    daysLeft: number | null;
    endsAt: string | null;
  };
  quotas: Record<string, number | null>;
  usage: {
    users: number;
    invoices: number;
    storageMB: number;
  };
  legacy: {
    isLegacy: boolean;
    graceUntil: string | null;
  };
}

type SubscriptionContext = Subscription & {
  plan?: SubscriptionPlan | null;
  quotas: Record<string, number | null>;
  legacy: {
    isLegacy: boolean;
    graceUntil: string | null;
  };
};

@Injectable()
export class SubscriptionQuotaService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(SubscriptionQuotaService.name);

  async getSummaryByOrganization(organizationId: number): Promise<QuotaUsage> {
    const subscription = await this.getSubscriptionContext(organizationId);

    const planName = subscription.plan?.name ?? 'Plan trial';
    const planCode = subscription.plan?.code ?? 'trial';
    const quotas = subscription.quotas;

    const today = new Date();
    let daysLeft: number | null = null;
    if (subscription.trialEndsAt) {
      daysLeft = Math.max(
        0,
        Math.ceil(
          (subscription.trialEndsAt.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
    }

    const period = this.resolveBillingPeriod(subscription);
    const [users, invoices, storageBytes] = await Promise.all([
      this.prisma.organizationMembership.count({
        where: { organizationId, user: { isDemo: false } },
      }),
      this.countIssuedInvoices(organizationId, period),
      this.aggregateStorageBytes(organizationId),
    ]);

    return {
      plan: {
        name: planName,
        code: planCode,
        status: subscription.status,
      },
      trial: {
        isTrial: subscription.status === SubscriptionStatus.TRIAL,
        daysLeft,
        endsAt: subscription.trialEndsAt
          ? subscription.trialEndsAt.toISOString()
          : null,
      },
      quotas,
      usage: {
        users,
        invoices,
        storageMB: storageBytes / (1024 * 1024),
      },
      legacy: subscription.legacy,
    };
  }

  async ensureQuota(
    organizationId: number,
    quota: 'users' | 'invoices' | 'storage',
    delta = 1,
  ): Promise<void> {
    const subscription = await this.getSubscriptionContext(organizationId);
    const limit = this.resolveLimit(subscription.quotas, quota);
    if (!limit || limit <= 0) {
      return;
    }

    let usage = 0;
    let deltaValue = delta;
    switch (quota) {
      case 'users': {
        usage = await this.prisma.organizationMembership.count({
          where: { organizationId, user: { isDemo: false } },
        });
        break;
      }
      case 'invoices': {
        const { start, end } = this.resolveBillingPeriod(subscription);
        usage = await this.countIssuedInvoices(organizationId, {
          start,
          end,
        });
        break;
      }
      case 'storage': {
        const bytes = await this.aggregateStorageBytes(organizationId);
        usage = bytes / (1024 * 1024);
        deltaValue = delta / (1024 * 1024);
        break;
      }
    }

    if (usage + deltaValue > limit) {
      const name =
        quota === 'users'
          ? 'usuarios'
          : quota === 'invoices'
            ? 'comprobantes'
            : 'almacenamiento';
      throw new BadRequestException(
        `Has alcanzado el límite de ${name} para tu plan.`,
      );
    }
  }

  private async aggregateStorageBytes(organizationId: number): Promise<number> {
    const result = await this.prisma.invoiceSample.aggregate({
      where: { organizationId },
      _sum: { fileSize: true },
    });
    const total = result._sum.fileSize ?? 0n;
    return Number(total);
  }

  private countIssuedInvoices(
    organizationId: number,
    range?: { start: Date; end: Date },
  ) {
    return this.prisma.invoiceSales.count({
      where: {
        company: { organizationId },
        sales: {
          organizationId,
          OR: [
            { referenceId: null },
            { referenceId: { not: { startsWith: 'demo-sale-' } } },
          ],
        },
        ...(range
          ? {
              createdAt: {
                gte: range.start,
                lt: range.end,
              },
            }
          : {}),
      },
    });
  }

  private async getSubscriptionContext(
    organizationId: number,
  ): Promise<SubscriptionContext> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No se encontró una suscripción para la organización actual.',
      );
    }

    const metadata = this.coerceJsonRecord(subscription.metadata);
    const planQuotas =
      (subscription.plan?.quotas as Record<string, number | null>) ?? {};
    const graceQuotas =
      metadata.graceLimits?.active && metadata.graceLimits?.quotas
        ? this.coerceJsonRecord(metadata.graceLimits.quotas)
        : null;
    const planCode = (subscription.plan?.code ?? '').toLowerCase();
    const isLegacyPlan = planCode === 'legacy';
    const legacyQuotas = metadata.legacyQuotas
      ? this.coerceJsonRecord(metadata.legacyQuotas)
      : null;
    const legacyGraceUntil =
      typeof metadata.legacyGraceUntil === 'string'
        ? metadata.legacyGraceUntil
        : null;

    let quotas: Record<string, number | null> = planQuotas;
    if (isLegacyPlan) {
      quotas =
        legacyQuotas && Object.keys(legacyQuotas).length > 0
          ? legacyQuotas
          : planQuotas;
    } else if (graceQuotas) {
      quotas = { ...planQuotas, ...graceQuotas };
    }

    return {
      ...subscription,
      quotas,
      legacy: {
        isLegacy: isLegacyPlan,
        graceUntil: legacyGraceUntil,
      },
    };
  }

  private resolveLimit(
    quotas: Record<string, number | null>,
    quota: 'users' | 'invoices' | 'storage',
  ): number | null {
    const aliases: Record<typeof quota, string[]> = {
      users: ['users', 'maxUsers', 'usuarios'],
      invoices: [
        'invoices',
        'comprobantes',
        'documents',
        'maxInvoices',
        'ventas',
      ],
      storage: ['storage', 'storageMB', 'almacenamiento'],
    };

    for (const key of aliases[quota]) {
      const value = quotas[key];
      if (typeof value === 'number') {
        return value;
      }
    }
    return null;
  }

  private resolveBillingPeriod(subscription: Subscription) {
    const now = new Date();
    const start =
      subscription.currentPeriodStart ??
      new Date(now.getFullYear(), now.getMonth(), 1);

    let end: Date;
    if (subscription.currentPeriodEnd) {
      end = subscription.currentPeriodEnd;
    } else {
      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
    }

    if (end <= start) {
      const fallback = new Date(start);
      fallback.setMonth(fallback.getMonth() + 1);
      end = fallback;
    }

    return { start, end };
  }

  async activateGraceLimits(
    subscriptionId: number,
    overrides?: Partial<typeof DEFAULT_GRACE_LIMITS>,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { metadata: true },
    });
    if (!subscription) {
      throw new NotFoundException(
        `No se encontrИ la suscripciИn ${subscriptionId}`,
      );
    }
    const metadata = this.coerceJsonRecord(subscription.metadata);
    if (metadata.graceLimits?.active) {
      return false;
    }

    metadata.graceLimits = {
      active: true,
      reason: 'past_due',
      activatedAt: new Date().toISOString(),
      quotas: {
        users: overrides?.users ?? DEFAULT_GRACE_LIMITS.users,
        invoices: overrides?.invoices ?? DEFAULT_GRACE_LIMITS.invoices,
        storageMB: overrides?.storageMB ?? DEFAULT_GRACE_LIMITS.storageMB,
      },
    };

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { metadata },
    });
    this.logger.warn(
      `Restricciones de gracia activadas para la suscripcion ${subscriptionId}`,
    );
    return true;
  }

  async clearGraceLimits(subscriptionId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { metadata: true },
    });
    if (!subscription) {
      throw new NotFoundException(
        `No se encontrИ la suscripciИn ${subscriptionId}`,
      );
    }
    const metadata = this.coerceJsonRecord(subscription.metadata);
    if (!metadata.graceLimits?.active) {
      return false;
    }
    metadata.graceLimits.active = false;
    metadata.graceLimits.restoredAt = new Date().toISOString();

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { metadata },
    });
    this.logger.log(
      `Restricciones de gracia limpiadas para la suscripcion ${subscriptionId}`,
    );
    return true;
  }

  private coerceJsonRecord(value: unknown): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    return {};
  }
}
