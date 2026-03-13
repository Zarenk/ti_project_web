import { Injectable } from '@nestjs/common';

import type {
  PaymentAdapter,
  CreatePaymentParams,
  PaymentAdapterResult,
  PaymentStatusResult,
} from './payment-adapter.interface';

/**
 * Manual payment adapter for Yape, Plin, bank transfers, and cash.
 *
 * These payment methods do not have automated APIs, so the adapter
 * creates a PENDING order that must be manually confirmed by the
 * operator via the dashboard.
 */
@Injectable()
export class ManualAdapter implements PaymentAdapter {
  readonly providerName = 'manual';

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<PaymentAdapterResult> {
    // Manual payments are immediately in PENDING state.
    // No external API call — the operator confirms payment manually.
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      providerPaymentId: id,
      status: 'PENDING',
      // No payment URL for manual methods
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      rawResponse: {
        provider: 'manual',
        description: params.description,
        amount: params.amount,
        currency: params.currency,
      },
    };
  }

  async getPaymentStatus(
    providerPaymentId: string,
  ): Promise<PaymentStatusResult> {
    // Status is managed internally via the dashboard.
    return { providerPaymentId, status: 'PENDING' };
  }
}
