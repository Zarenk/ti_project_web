import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  PaymentAdapter,
  CreatePaymentParams,
  PaymentAdapterResult,
  PaymentStatusResult,
} from './payment-adapter.interface';

/**
 * MercadoPago adapter for the payments orchestration layer.
 *
 * Creates a checkout preference that generates a payment URL (QR/link).
 * This does NOT replace the subscription MercadoPago provider — it is a
 * separate adapter for one-time payment orders.
 */
@Injectable()
export class MercadoPagoAdapter implements PaymentAdapter {
  readonly providerName = 'mercadopago';
  private readonly logger = new Logger(MercadoPagoAdapter.name);
  private readonly accessToken: string;
  private readonly apiUrl = 'https://api.mercadopago.com';

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
      '',
    );
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentAdapterResult> {
    const callbackBase =
      this.config.get<string>('FRONTEND_URL') ??
      this.config.get<string>('APP_URL') ??
      'http://localhost:3000';

    // MercadoPago requires valid public URLs for back_urls + auto_return.
    // In local dev (IP/localhost), skip them — the init_point still works.
    const isPublicUrl =
      callbackBase.startsWith('https://') ||
      (callbackBase.startsWith('http://') &&
        !callbackBase.includes('localhost') &&
        !callbackBase.match(/http:\/\/\d+\.\d+\.\d+\.\d+/));

    const body: Record<string, unknown> = {
      items: [
        {
          id: (params.metadata?.code as string) ?? `item-${Date.now()}`,
          title: params.description || 'Pago',
          quantity: 1,
          unit_price: params.amount,
          currency_id: params.currency === 'USD' ? 'USD' : 'PEN',
        },
      ],
      expires: true,
      expiration_date_to: new Date(
        Date.now() + 30 * 60 * 1000,
      ).toISOString(),
      external_reference: (params.metadata?.code as string) ?? '',
      metadata: params.metadata ?? {},
      notification_url: params.callbackUrl,
    };

    if (isPublicUrl) {
      body.back_urls = {
        success: `${callbackBase}/dashboard/payments?status=success`,
        failure: `${callbackBase}/dashboard/payments?status=failure`,
        pending: `${callbackBase}/dashboard/payments?status=pending`,
      };
      body.auto_return = 'approved';
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/checkout/preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(
          `[MercadoPago] Create preference failed: ${JSON.stringify(data)}`,
        );
        return {
          providerPaymentId: `mp-err-${Date.now()}`,
          status: 'FAILED',
          rawResponse: data,
        };
      }

      return {
        providerPaymentId: data.id,
        status: 'PENDING',
        paymentUrl: data.init_point,
        expiresAt: data.expiration_date_to
          ? new Date(data.expiration_date_to)
          : new Date(Date.now() + 30 * 60 * 1000),
        rawResponse: data,
      };
    } catch (error) {
      this.logger.error(
        `[MercadoPago] Network error: ${(error as Error).message}`,
      );
      return {
        providerPaymentId: `mp-err-${Date.now()}`,
        status: 'FAILED',
        rawResponse: { error: (error as Error).message },
      };
    }
  }

  async getPaymentStatus(
    providerPaymentId: string,
  ): Promise<PaymentStatusResult> {
    try {
      const response = await fetch(
        `${this.apiUrl}/v1/payments/${providerPaymentId}`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        },
      );
      const data = await response.json();
      const rawStatus = (data.status ?? '').toLowerCase();
      const status =
        rawStatus === 'approved' || rawStatus === 'authorized'
          ? 'COMPLETED'
          : rawStatus === 'rejected' ||
              rawStatus === 'cancelled' ||
              rawStatus === 'charged_back'
            ? 'FAILED'
            : 'PENDING';

      return {
        providerPaymentId,
        status,
        netAmount: data.transaction_details?.net_received_amount,
        commissionAmount: data.fee_details?.reduce(
          (sum: number, f: { amount: number }) => sum + (f.amount ?? 0),
          0,
        ),
        rawResponse: data,
      };
    } catch {
      return { providerPaymentId, status: 'PENDING' };
    }
  }
}
