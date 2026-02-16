import {
  CheckoutSessionParams,
  CheckoutSessionResult,
  PaymentProvider,
} from './payment-provider.interface';

export class MockPaymentProvider implements PaymentProvider {
  async createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    const sessionId = `mock_${params.planCode}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const checkoutUrl = `${params.successUrl}?session_id=${sessionId}`;

    return {
      provider: 'mock',
      sessionId,
      checkoutUrl,
      expiresAt,
    };
  }
}
