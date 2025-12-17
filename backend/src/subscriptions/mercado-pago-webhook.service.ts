import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import MercadoPagoConfig, { Payment } from 'mercadopago';

@Injectable()
export class MercadoPagoWebhookService {
  private readonly logger = new Logger(MercadoPagoWebhookService.name);
  private readonly paymentApi?: Payment;

  constructor(private readonly configService: ConfigService) {
    const accessToken =
      this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (accessToken) {
      const client = new MercadoPagoConfig({ accessToken });
      this.paymentApi = new Payment(client);
    } else {
      this.logger.warn(
        'MERCADOPAGO_ACCESS_TOKEN no configurado; los webhooks no podrán consultarse',
      );
    }
  }

  async normalizeEvent(
    incoming: PaymentWebhookDto,
  ): Promise<PaymentWebhookDto | null> {
    if (!this.paymentApi) {
      return null;
    }
    const paymentId = this.extractPaymentId(incoming.data);
    if (!paymentId) {
      this.logger.warn('Webhook de MercadoPago sin payment id');
      return null;
    }

    try {
      const payment = await this.paymentApi.get({ id: paymentId });
      const status = (payment.status ?? '').toLowerCase();
      const preferenceId =
        (payment as any).preference_id ?? (payment as any).preferenceId ?? null;
      const metadata = (payment.metadata ?? {}) as Record<string, any>;
      const invoiceId =
        metadata.invoiceId ??
        metadata.invoice_id ??
        metadata.subscriptionInvoiceId ??
        metadata.subscription_invoice_id;

      if (status === 'approved' || status === 'authorized') {
        if (preferenceId) {
          return {
            provider: 'mercadopago',
            type: 'checkout.session.completed',
            data: { sessionId: preferenceId },
          };
        }
        if (invoiceId) {
          return {
            provider: 'mercadopago',
            type: 'invoice.payment_succeeded',
            data: { invoiceId },
          };
        }
      }

      if (
        status === 'rejected' ||
        status === 'cancelled' ||
        status === 'charged_back'
      ) {
        if (invoiceId) {
          return {
            provider: 'mercadopago',
            type: 'invoice.payment_failed',
            data: { invoiceId },
          };
        }
      }

      this.logger.warn(
        `No se pudo mapear el evento de MercadoPago ${paymentId} con estado ${payment.status}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error consultando pago ${paymentId} en MercadoPago: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return null;
    }
  }

  private extractPaymentId(data?: Record<string, any> | null) {
    if (!data) return null;
    return (
      data.id ??
      data['payment_id'] ??
      data['paymentId'] ??
      data['resource'] ??
      data['data_id'] ??
      null
    );
  }
}
