import {
  ChargeCardParams,
  ChargeCardResult,
  CheckoutSessionParams,
  CheckoutSessionResult,
  PaymentProvider,
} from './payment-provider.interface';
import MercadoPagoConfig, { Payment, Preference } from 'mercadopago';
import { BadRequestException, Logger } from '@nestjs/common';

export class MercadoPagoPaymentProvider implements PaymentProvider {
  private readonly preference: Preference;
  private readonly payment: Payment;
  private readonly logger = new Logger(MercadoPagoPaymentProvider.name);

  constructor(private readonly accessToken: string) {
    const client = new MercadoPagoConfig({ accessToken });
    this.preference = new Preference(client);
    this.payment = new Payment(client);
  }

  async createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const response = await this.preference.create({
        body: {
          items: [
            {
              id: params.planCode,
              title: `Plan ${params.planCode}`,
              quantity: 1,
              unit_price: Number(params.amount),
              currency_id: params.currency,
            },
          ],
          back_urls: {
            success: params.successUrl,
            pending: params.successUrl,
            failure: params.cancelUrl,
          },
          auto_return: 'approved',
          expires: true,
          expiration_date_to: expiresAt.toISOString(),
          external_reference:
            params.metadata?.subscriptionId?.toString() ??
            `org-${params.organizationId}`,
          metadata: {
            organizationId: params.organizationId,
            planCode: params.planCode,
            ...(params.metadata ?? {}),
          },
        },
      });

      const checkoutUrl = response.init_point ?? response.sandbox_init_point;
      if (!checkoutUrl) {
        throw new BadRequestException(
          'Mercado Pago no retornó una URL de checkout',
        );
      }

      return {
        provider: 'mercadopago',
        sessionId: response.id ?? '',
        checkoutUrl,
        expiresAt:
          response.expiration_date_to?.length === 24
            ? new Date(response.expiration_date_to)
            : expiresAt,
      };
    } catch (error) {
      const details = (error as any)?.response?.data;
      console.error('[MercadoPago] preference.create failed', {
        message: (error as Error)?.message,
        details,
      });

      let extraInfo = '';
      if (details) {
        extraInfo =
          typeof details === 'string'
            ? ` | details: ${details}`
            : ` | details: ${JSON.stringify(details)}`;
      }

      const baseMessage =
        error instanceof Error
          ? `Mercado Pago error: ${error.message}`
          : 'Mercado Pago error';

      throw new BadRequestException(`${baseMessage}${extraInfo}`);
    }
  }

  /**
   * Charge a saved card on file using Mercado Pago Payments API.
   *
   * Requires a previously saved customer card (via customer cards API).
   * The `cardTokenOrId` should be a saved card ID from the customer's cards.
   *
   * NOTE: This requires validating the card-on-file flow with MP docs before
   * using in production. The customer must have a saved card via
   * POST /v1/customers/{id}/cards.
   */
  async chargeCard(params: ChargeCardParams): Promise<ChargeCardResult> {
    try {
      const response = await this.payment.create({
        body: {
          transaction_amount: Number(params.amount),
          token: params.cardTokenOrId,
          description: params.description,
          installments: 1,
          payer: {
            type: 'customer',
            id: params.customerId,
          },
          metadata: params.metadata ?? {},
        },
        requestOptions: {
          idempotencyKey: params.idempotencyKey,
        },
      });

      const mpStatus = response.status ?? 'unknown';
      let status: ChargeCardResult['status'];
      if (mpStatus === 'approved') {
        status = 'approved';
      } else if (
        mpStatus === 'in_process' ||
        mpStatus === 'pending' ||
        mpStatus === 'authorized'
      ) {
        status = 'pending';
      } else {
        status = 'rejected';
      }

      this.logger.log(
        `[chargeCard] MP payment ${response.id}: status=${mpStatus}, detail=${response.status_detail}`,
      );

      return {
        provider: 'mercadopago',
        paymentId: String(response.id ?? ''),
        status,
        statusDetail: response.status_detail ?? undefined,
      };
    } catch (error) {
      const details = (error as any)?.response?.data;
      this.logger.error('[MercadoPago] chargeCard failed', {
        message: (error as Error)?.message,
        details,
      });
      throw error;
    }
  }
}
