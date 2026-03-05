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
      labelNames: ['feature', 'status'],
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

    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      select: { status: true },
    });

    // No subscription → allow (legacy/admin-created org)
    if (!subscription) return true;

    const { status } = subscription;
    const allowed = config.allowTrial
      ? ['TRIAL', 'ACTIVE']
      : ['ACTIVE'];

    if (!allowed.includes(status)) {
      this.logger.warn(
        `[${config.feature}] Blocked org ${organizationId} — status: ${status}`,
      );
      try {
        this.getBlockedCounter().inc({
          feature: config.feature,
          status: status.toLowerCase(),
        });
      } catch { /* no romper el flujo si prom-client falla */ }
      throw new ForbiddenException(
        `Tu suscripción (${status}) no permite esta operación. ` +
          `Actualiza tu plan para continuar usando esta función.`,
      );
    }

    return true;
  }
}
