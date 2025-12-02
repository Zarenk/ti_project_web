import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

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
}

@Injectable()
export class SubscriptionQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryByOrganization(
    organizationId: number,
  ): Promise<QuotaUsage> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No se encontró una suscripción para la organización actual.',
      );
    }

    const planName = subscription.plan?.name ?? 'Plan trial';
    const planCode = subscription.plan?.code ?? 'trial';
    const quotas =
      (subscription.plan?.quotas as Record<string, number | null>) ?? {};

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

    const [users, invoices, storageBytes] = await Promise.all([
      this.prisma.organizationMembership.count({
        where: { organizationId },
      }),
      this.prisma.sales.count({
        where: { organizationId },
      }),
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
    };
  }

  private async aggregateStorageBytes(
    organizationId: number,
  ): Promise<number> {
    const result = await this.prisma.invoiceSample.aggregate({
      where: { organizationId },
      _sum: { fileSize: true },
    });
    const total = result._sum.fileSize ?? 0n;
    return Number(total);
  }
}
