import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  resolveGraceTier,
  isGraceTierBeyond,
  type GraceTier,
} from './subscription-quota.service';

/**
 * Injectable service that replicates the SubscriptionStatusGuard logic
 * for use inside services (not just HTTP controllers).
 *
 * Use this to protect critical write operations at the service layer,
 * preventing bypass via internal jobs or websocket gateways.
 *
 * Internal crons should pass `skipSubscriptionCheck: true` to bypass.
 */
@Injectable()
export class SubscriptionGuardService {
  private readonly logger = new Logger(SubscriptionGuardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensures the organization can perform the given feature.
   * Throws ForbiddenException if blocked by subscription status.
   *
   * @param organizationId - org to check
   * @param feature - feature name for logging/error
   * @param maxGraceTier - max tier allowed (null = block at any tier)
   */
  async ensureCanOperate(
    organizationId: number,
    feature: string,
    maxGraceTier: GraceTier | null = null,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      select: {
        status: true,
        paymentEnforced: true,
        pastDueSince: true,
        metadata: true,
      },
    });

    // No subscription → allow (legacy)
    if (!subscription) return;

    // Not payment enforced → grandfathered
    if (!subscription.paymentEnforced) return;

    // Check complimentary
    const metadata =
      subscription.metadata &&
      typeof subscription.metadata === 'object' &&
      !Array.isArray(subscription.metadata)
        ? (subscription.metadata as Record<string, any>)
        : {};
    if (metadata.complimentary?.active) return;

    const { status } = subscription;
    if (['ACTIVE', 'TRIAL'].includes(status)) return;

    // Blocked — check grace tier
    const graceTier = resolveGraceTier(subscription);

    if (maxGraceTier !== null && graceTier) {
      if (!isGraceTierBeyond(graceTier, maxGraceTier)) {
        return;
      }
    }

    this.logger.warn(
      `[${feature}] Service-level block for org ${organizationId} — status: ${status}, tier: ${graceTier ?? 'NONE'}`,
    );

    throw new ForbiddenException({
      code: 'SUBSCRIPTION_BLOCKED',
      status,
      graceTier: graceTier ?? 'NONE',
      feature,
      message:
        `Tu suscripción (${status}) no permite esta operación. ` +
        `Actualiza tu plan para continuar usando esta función.`,
    });
  }
}
