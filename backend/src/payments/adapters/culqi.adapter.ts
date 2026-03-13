import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  PaymentAdapter,
  CreatePaymentParams,
  PaymentAdapterResult,
  PaymentStatusResult,
} from './payment-adapter.interface';

/**
 * Culqi adapter for the payments orchestration layer.
 *
 * Creates charges via the Culqi REST API. This adapter wraps Culqi's
 * charge endpoint and is used by the orchestrator — it does NOT replace
 * the existing Culqi flow in websales.service.ts.
 */
@Injectable()
export class CulqiAdapter implements PaymentAdapter {
  readonly providerName = 'culqi';
  private readonly logger = new Logger(CulqiAdapter.name);
  private readonly secretKey: string;
  private readonly apiUrl = 'https://api.culqi.com/v2';

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('CULQI_SECRET_KEY', '');
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentAdapterResult> {
    const amountCents = Math.round(params.amount * 100);

    // Culqi requires a token for direct charges. For link-based payments,
    // we create an order that generates a payment URL.
    const body = {
      amount: amountCents,
      currency_code: params.currency === 'USD' ? 'USD' : 'PEN',
      description: params.description,
      order_number: (params.metadata?.code as string) ?? `PO-${Date.now()}`,
      client_details: {
        email: params.clientEmail ?? 'noemail@placeholder.com',
        phone_number: params.clientPhone,
      },
      expiration_date: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
      confirm: false,
    };

    try {
      const response = await fetch(`${this.apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(
          `[Culqi] Create order failed: ${JSON.stringify(data)}`,
        );
        return {
          providerPaymentId: `culqi-err-${Date.now()}`,
          status: 'FAILED',
          rawResponse: data,
        };
      }

      return {
        providerPaymentId: data.id,
        status: 'PENDING',
        paymentUrl: data.url ?? data.payment_url,
        expiresAt: data.expiration_date
          ? new Date(data.expiration_date * 1000)
          : new Date(Date.now() + 30 * 60 * 1000),
        rawResponse: data,
      };
    } catch (error) {
      this.logger.error(`[Culqi] Network error: ${(error as Error).message}`);
      return {
        providerPaymentId: `culqi-err-${Date.now()}`,
        status: 'FAILED',
        rawResponse: { error: (error as Error).message },
      };
    }
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    try {
      const response = await fetch(
        `${this.apiUrl}/orders/${providerPaymentId}`,
        {
          headers: { Authorization: `Bearer ${this.secretKey}` },
        },
      );
      const data = await response.json();
      const status =
        data.state === 'paid' || data.state === 'fulfilled'
          ? 'COMPLETED'
          : data.state === 'expired' || data.state === 'deleted'
            ? 'FAILED'
            : 'PENDING';

      return {
        providerPaymentId,
        status,
        rawResponse: data,
      };
    } catch {
      return { providerPaymentId, status: 'PENDING' };
    }
  }
}
