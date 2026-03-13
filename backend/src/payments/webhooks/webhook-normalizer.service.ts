import { Injectable, Logger } from '@nestjs/common';

export interface NormalizedWebhookEvent {
  provider: string;
  providerPaymentId: string;
  status: 'COMPLETED' | 'FAILED';
  netAmount?: number;
  commissionAmount?: number;
  commissionRate?: number;
  rawPayload: Record<string, unknown>;
}

/**
 * Normalizes provider-specific webhook payloads into a common internal format.
 */
@Injectable()
export class WebhookNormalizerService {
  private readonly logger = new Logger(WebhookNormalizerService.name);

  normalize(
    provider: string,
    payload: Record<string, unknown>,
  ): NormalizedWebhookEvent | null {
    switch (provider) {
      case 'mercadopago':
        return this.normalizeMercadoPago(payload);
      case 'culqi':
        return this.normalizeCulqi(payload);
      default:
        this.logger.warn(`[normalize] Unknown provider: ${provider}`);
        return null;
    }
  }

  private normalizeMercadoPago(
    payload: Record<string, unknown>,
  ): NormalizedWebhookEvent | null {
    const data = (payload.data ?? payload) as Record<string, unknown>;
    const paymentId = String(data.id ?? data.payment_id ?? '');
    if (!paymentId) {
      this.logger.warn('[normalize-mp] Missing payment ID in payload');
      return null;
    }

    const action = String(payload.action ?? payload.type ?? '');
    const isApproved =
      action === 'payment.updated' || action === 'payment.created';

    // We cannot determine final status from the webhook alone —
    // the orchestrator will call getPaymentStatus() on the adapter.
    // We default to COMPLETED and let the orchestrator verify.
    return {
      provider: 'mercadopago',
      providerPaymentId: paymentId,
      status: isApproved ? 'COMPLETED' : 'FAILED',
      rawPayload: payload,
    };
  }

  private normalizeCulqi(
    payload: Record<string, unknown>,
  ): NormalizedWebhookEvent | null {
    const data = (payload.data ?? payload) as Record<string, unknown>;
    const orderId = String(
      data.order_id ?? data.id ?? (payload as any).object?.id ?? '',
    );
    if (!orderId) {
      this.logger.warn('[normalize-culqi] Missing order ID in payload');
      return null;
    }

    const state = String(
      (data as any).state ?? (data as any).outcome?.type ?? '',
    ).toLowerCase();
    const status = state === 'paid' || state === 'vip' ? 'COMPLETED' : 'FAILED';

    return {
      provider: 'culqi',
      providerPaymentId: orderId,
      status,
      rawPayload: payload,
    };
  }
}
