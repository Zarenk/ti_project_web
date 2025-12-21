import {
  CheckoutSessionParams,
  CheckoutSessionResult,
  PaymentProvider,
} from './payment-provider.interface';
import MercadoPagoConfig, { Preference } from 'mercadopago';
import { BadRequestException } from '@nestjs/common';

export class MercadoPagoPaymentProvider implements PaymentProvider {
  private readonly preference: Preference;

  constructor(private readonly accessToken: string) {
    const client = new MercadoPagoConfig({ accessToken });
    this.preference = new Preference(client);
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
      // Log completo para depurar integraciones con MP

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
}
