import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentAdapterRegistry } from './adapters/adapter-registry';
import {
  paymentStateMachine,
  TERMINAL_STATUSES,
  type PaymentStatus,
  type PaymentEvent,
} from './payment-state-machine';
import {
  PaymentNotFoundException,
  PaymentAlreadyProcessedException,
  PaymentInvalidTransitionException,
} from './errors/payment.exceptions';
import type { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import type { PaymentQueryDto } from './dto/payment-query.dto';
import type { NormalizedWebhookEvent } from './webhooks/webhook-normalizer.service';

@Injectable()
export class PaymentOrchestratorService {
  private readonly logger = new Logger(PaymentOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: PaymentAdapterRegistry,
  ) {}

  // ── Create ────────────────────────────────────────────────

  async createPaymentOrder(dto: CreatePaymentOrderDto) {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.paymentOrder.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return this.toResponse(existing);
      }
    }

    const code = await this.generateCode();

    // 1. Create order in PENDING state
    const order = await this.prisma.paymentOrder.create({
      data: {
        code,
        amount: dto.amount,
        currency: dto.currency ?? 'PEN',
        provider: dto.provider,
        status: 'PENDING',
        clientName: dto.clientName,
        clientEmail: dto.clientEmail,
        clientPhone: dto.clientPhone,
        orderId: dto.orderId,
        idempotencyKey: dto.idempotencyKey,
        organizationId: dto.organizationId!,
        companyId: dto.companyId,
        createdBy: dto.createdBy,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min default
      },
    });

    // 2. Record creation event
    await this.recordEvent(order.id, '', 'PENDING', 'creation');

    // 3. Call provider adapter
    const adapter = this.adapterRegistry.getAdapter(dto.provider);
    const webhookUrl = this.buildWebhookUrl(dto.provider);

    try {
      const result = await adapter.createPayment({
        amount: Number(order.amount),
        currency: order.currency,
        description: `Pago ${code}`,
        clientEmail: dto.clientEmail,
        clientPhone: dto.clientPhone,
        callbackUrl: webhookUrl,
        metadata: { paymentOrderId: order.id, code },
      });

      // 4. Transition state based on result
      if (result.status === 'FAILED') {
        const updated = await this.transitionState(order.id, 'PENDING', 'PROVIDER_REJECTED', {
          providerPaymentId: result.providerPaymentId,
          providerResponse: result.rawResponse as any,
          failureReason: 'PROVIDER_REJECTED',
          failedAt: new Date(),
        });
        this.adapterRegistry.recordFailure(dto.provider);
        return this.toResponse(updated);
      }

      if (dto.provider === 'manual') {
        // Manual payments stay in PENDING — operator confirms via PATCH :code/confirm
        const updated = await this.prisma.paymentOrder.update({
          where: { id: order.id },
          data: {
            providerPaymentId: result.providerPaymentId,
            paymentUrl: result.paymentUrl,
          },
        });
        this.adapterRegistry.recordSuccess(dto.provider);
        return this.toResponse(updated);
      }

      // Online providers — move to PROCESSING
      const updated = await this.transitionState(order.id, 'PENDING', 'PROVIDER_ACCEPTED', {
        providerPaymentId: result.providerPaymentId,
        paymentUrl: result.paymentUrl,
        expiresAt: result.expiresAt,
        providerResponse: result.rawResponse as any,
      });
      this.adapterRegistry.recordSuccess(dto.provider);
      return this.toResponse(updated);
    } catch (error) {
      this.adapterRegistry.recordFailure(dto.provider);
      this.logger.error(
        `[create] Provider ${dto.provider} error for ${code}: ${(error as Error).message}`,
      );

      const updated = await this.transitionState(order.id, 'PENDING', 'PROVIDER_REJECTED', {
        failureReason: (error as Error).message,
        failedAt: new Date(),
      });
      return this.toResponse(updated);
    }
  }

  // ── Webhook confirmed ─────────────────────────────────────

  async handleWebhookConfirmed(event: NormalizedWebhookEvent): Promise<void> {
    // Find the payment order by provider + providerPaymentId (unique constraint)
    const order = await this.prisma.paymentOrder.findFirst({
      where: {
        provider: event.provider,
        providerPaymentId: event.providerPaymentId,
      },
    });

    if (!order) {
      this.logger.warn(
        `[webhook] No PaymentOrder found for ${event.provider}:${event.providerPaymentId}`,
      );
      return;
    }

    const currentStatus = order.status as PaymentStatus;

    // Idempotency: already in terminal state → ignore
    if (TERMINAL_STATUSES.includes(currentStatus) || currentStatus === 'COMPLETED') {
      this.logger.debug(
        `[webhook] Order ${order.code} already in ${currentStatus}, ignoring`,
      );
      return;
    }

    if (event.status === 'FAILED') {
      if (paymentStateMachine.canTransition(currentStatus, 'PROVIDER_REJECTED')) {
        await this.transitionState(order.id, currentStatus, 'PROVIDER_REJECTED', {
          failureReason: 'WEBHOOK_REJECTED',
          failedAt: new Date(),
          lastWebhookAt: new Date(),
          webhookAttempts: { increment: 1 },
        });
      }
      return;
    }

    // COMPLETED from webhook → move to SETTLING
    if (!paymentStateMachine.canTransition(currentStatus, 'WEBHOOK_CONFIRMED')) {
      this.logger.warn(
        `[webhook] Cannot transition ${order.code} from ${currentStatus} via WEBHOOK_CONFIRMED`,
      );
      return;
    }

    await this.transitionState(order.id, currentStatus, 'WEBHOOK_CONFIRMED', {
      grossAmount: order.amount,
      netAmount: event.netAmount,
      commissionAmount: event.commissionAmount,
      commissionRate: event.commissionRate,
      lastWebhookAt: new Date(),
      webhookAttempts: { increment: 1 },
    });

    // Attempt settlement immediately
    await this.settlePaymentOrder(order.id);
  }

  // ── Settlement ────────────────────────────────────────────

  async settlePaymentOrder(paymentOrderId: number): Promise<void> {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
    });

    if (!order || order.status !== 'SETTLING') return;

    try {
      // Settlement logic: mark as COMPLETED.
      // In the future, this is where completeWebOrder() would be called
      // if the PaymentOrder is linked to an e-commerce Order.
      await this.transitionState(
        order.id,
        'SETTLING',
        'SETTLEMENT_SUCCESS',
        {
          completedAt: new Date(),
        },
      );

      this.logger.log(`[settle] Payment ${order.code} completed successfully`);
    } catch (error) {
      this.logger.error(
        `[settle] Failed for ${order.code}: ${(error as Error).message}`,
      );
      // Stays in SETTLING — CRON will retry
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          lastWebhookAt: new Date(),
          webhookAttempts: { increment: 1 },
        },
      });
    }
  }

  // ── Manual confirmation (Yape/Plin/Transfer) ──────────────

  async confirmManualPayment(
    code: string,
    organizationId: number,
  ): Promise<void> {
    const order = await this.prisma.paymentOrder.findFirst({
      where: { code, organizationId },
    });

    if (!order) throw new PaymentNotFoundException(code);

    const currentStatus = order.status as PaymentStatus;
    if (currentStatus === 'COMPLETED') {
      throw new PaymentAlreadyProcessedException(code);
    }

    if (
      !paymentStateMachine.canTransition(currentStatus, 'WEBHOOK_CONFIRMED')
    ) {
      throw new PaymentInvalidTransitionException(currentStatus, 'WEBHOOK_CONFIRMED');
    }

    // Move directly to SETTLING → COMPLETED
    await this.transitionState(order.id, currentStatus, 'WEBHOOK_CONFIRMED', {
      grossAmount: order.amount,
      netAmount: order.amount, // no commission for manual
      commissionAmount: 0,
      commissionRate: 0,
      lastWebhookAt: new Date(),
    });

    await this.transitionState(order.id, 'SETTLING', 'SETTLEMENT_SUCCESS', {
      completedAt: new Date(),
    });
  }

  // ── Queries ───────────────────────────────────────────────

  async findAll(query: PaymentQueryDto) {
    if (!query.organizationId) {
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      organizationId: query.organizationId,
    };
    if (query.companyId) where.companyId = query.companyId;
    if (query.status) where.status = query.status;
    if (query.provider) where.provider = query.provider;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from)
        (where.createdAt as Record<string, unknown>).gte = new Date(query.from);
      if (query.to)
        (where.createdAt as Record<string, unknown>).lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.paymentOrder.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByCode(code: string, organizationId: number) {
    const order = await this.prisma.paymentOrder.findFirst({
      where: { code, organizationId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new PaymentNotFoundException(code);
    return order;
  }

  async getCommissionReport(
    organizationId: number,
    companyId: number | null,
    from?: string,
    to?: string,
  ) {
    if (!organizationId) {
      return { totalGross: 0, totalNet: 0, totalCommission: 0, byProvider: [] };
    }

    const where: Record<string, unknown> = {
      organizationId,
      status: 'COMPLETED',
    };

    // Only add date filter if valid dates provided
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from && !isNaN(new Date(from).getTime())) dateFilter.gte = new Date(from);
      if (to && !isNaN(new Date(to).getTime())) dateFilter.lte = new Date(to);
      if (Object.keys(dateFilter).length > 0) where.completedAt = dateFilter;
    }

    if (companyId) where.companyId = companyId;

    // Use Prisma groupBy for efficient aggregation (no full table scan)
    const grouped = await this.prisma.paymentOrder.groupBy({
      by: ['provider'],
      where,
      _sum: {
        grossAmount: true,
        netAmount: true,
        commissionAmount: true,
        amount: true,
      },
      _count: true,
    });

    let totalGross = 0;
    let totalNet = 0;
    let totalCommission = 0;

    const byProvider = grouped.map((g) => {
      const gross = Number(g._sum.grossAmount ?? g._sum.amount ?? 0);
      const commission = Number(g._sum.commissionAmount ?? 0);
      const net = Number(g._sum.netAmount ?? g._sum.amount ?? 0);

      totalGross += gross;
      totalNet += net;
      totalCommission += commission;

      return {
        provider: g.provider,
        count: g._count,
        gross,
        commission,
        net,
        avgRate: gross > 0 ? Number((commission / gross).toFixed(4)) : 0,
      };
    });

    return { totalGross, totalNet, totalCommission, byProvider };
  }

  // ── Internals ─────────────────────────────────────────────

  private async transitionState(
    orderId: number,
    fromStatus: PaymentStatus | string,
    event: PaymentEvent,
    data: Record<string, unknown>,
  ) {
    const from = fromStatus as PaymentStatus;
    const toStatus = paymentStateMachine.transition(from, event);

    const [updated] = await this.prisma.$transaction([
      this.prisma.paymentOrder.update({
        where: { id: orderId },
        data: { ...data, status: toStatus },
      }),
      this.prisma.paymentOrderEvent.create({
        data: {
          paymentOrderId: orderId,
          fromStatus: from,
          toStatus,
          reason: event,
          metadata: data as any,
        },
      }),
    ]);

    return updated;
  }

  private async recordEvent(
    paymentOrderId: number,
    fromStatus: string,
    toStatus: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.paymentOrderEvent.create({
      data: { paymentOrderId, fromStatus, toStatus, reason },
    });
  }

  private async generateCode(): Promise<string> {
    const hex = randomBytes(4).toString('hex').toUpperCase();
    return `PO-${hex}`;
  }

  private buildWebhookUrl(provider: string): string {
    const base =
      process.env.APP_URL ?? process.env.BACKEND_URL ?? 'http://localhost:4000';
    return `${base}/payments/webhooks/${provider}`;
  }

  private toResponse(order: {
    id: number;
    code: string;
    status: string;
    paymentUrl: string | null;
    expiresAt: Date | null;
    provider: string;
    amount: number | { toNumber?: () => number } | unknown;
    currency: string;
  }) {
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      paymentUrl: order.paymentUrl,
      expiresAt: order.expiresAt?.toISOString() ?? null,
      provider: order.provider,
      amount: Number(order.amount),
      currency: order.currency,
    };
  }
}
