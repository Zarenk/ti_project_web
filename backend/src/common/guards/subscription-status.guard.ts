import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Counter, register } from 'prom-client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SUBSCRIPTION_REQUIRED_KEY,
  type SubscriptionRequirement,
} from '../decorators/requires-subscription.decorator';
import {
  resolveGraceTier,
  isGraceTierBeyond,
  type GraceTier,
} from 'src/subscriptions/subscription-quota.service';

interface RequestWithTenant {
  user?: { role?: string; userId?: number };
  tenantContext?: { organizationId: number | null; companyId: number | null };
}

@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionStatusGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  /** Lazy singleton — safe across multiple guard instances in different modules */
  private getBlockedCounter(): Counter<string> {
    const name = 'subscription_feature_blocked_total';
    const existing = register.getSingleMetric(name);
    if (existing) return existing as Counter<string>;
    return new Counter({
      name,
      help: 'Intentos bloqueados por suscripción inactiva',
      labelNames: ['feature', 'status', 'grace_tier'],
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<
      SubscriptionRequirement | undefined
    >(SUBSCRIPTION_REQUIRED_KEY, [context.getHandler(), context.getClass()]);

    if (!config) return true;

    const request = context.switchToHttp().getRequest<RequestWithTenant>();

    // SUPER_ADMIN_GLOBAL always bypasses (platform admin)
    const role = (request.user?.role ?? '').toUpperCase();
    if (role === 'SUPER_ADMIN_GLOBAL') return true;

    const organizationId = request.tenantContext?.organizationId ?? null;
    if (!organizationId) return true;

    let subscription: {
      status: string;
      paymentEnforced?: boolean;
      pastDueSince?: Date | null;
      metadata?: any;
    } | null;

    try {
      subscription = await this.prisma.subscription.findUnique({
        where: { organizationId },
        select: {
          status: true,
          paymentEnforced: true,
          pastDueSince: true,
          metadata: true,
        },
      });
    } catch {
      // Columns may not exist yet (migration pending) — fall back to safe query
      subscription = await this.prisma.subscription.findUnique({
        where: { organizationId },
        select: { status: true, metadata: true },
      });
    }

    // No subscription → allow (legacy/admin-created org)
    if (!subscription) return true;

    // paymentEnforced = false (or column missing) → grandfathered org, allow everything
    if (!subscription.paymentEnforced) return true;

    // Check complimentary active
    const metadata =
      subscription.metadata &&
      typeof subscription.metadata === 'object' &&
      !Array.isArray(subscription.metadata)
        ? (subscription.metadata as Record<string, any>)
        : {};
    if (metadata.complimentary?.active) return true;

    const { status } = subscription;
    const allowed = config.allowTrial
      ? ['TRIAL', 'ACTIVE']
      : ['ACTIVE'];

    // Active or trial → allow
    if (allowed.includes(status)) return true;

    // Past due / canceled → check grace tier
    const graceTier = resolveGraceTier({
      paymentEnforced: subscription.paymentEnforced ?? false,
      status: subscription.status,
      pastDueSince: subscription.pastDueSince ?? null,
    });

    // If decorator specifies maxGraceTier and we're within it, allow
    if (
      config.maxGraceTier !== undefined &&
      config.maxGraceTier !== null &&
      graceTier
    ) {
      if (!isGraceTierBeyond(graceTier, config.maxGraceTier)) {
        return true;
      }
    }

    this.logger.warn(
      `[${config.feature}] Blocked org ${organizationId} — status: ${status}, tier: ${graceTier ?? 'NONE'}`,
    );
    try {
      this.getBlockedCounter().inc({
        feature: config.feature,
        status: status.toLowerCase(),
        grace_tier: (graceTier ?? 'none').toLowerCase(),
      });
    } catch { /* no romper el flujo si prom-client falla */ }

    throw new ForbiddenException({
      code: 'SUBSCRIPTION_BLOCKED',
      status,
      graceTier: graceTier ?? 'NONE',
      feature: config.feature,
      message:
        `Tu suscripción (${status}) no permite esta operación. ` +
        `Actualiza tu plan para continuar usando esta función.`,
    });
  }
}
