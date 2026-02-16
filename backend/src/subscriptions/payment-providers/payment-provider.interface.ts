export interface CheckoutSessionParams {
  organizationId: number;
  planCode: string;
  amount: string;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface CheckoutSessionResult {
  provider: string;
  sessionId: string;
  checkoutUrl: string;
  expiresAt: Date;
}

export interface PaymentProvider {
  createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult>;
}
