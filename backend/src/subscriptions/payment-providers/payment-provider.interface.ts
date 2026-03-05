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

export interface ChargeCardParams {
  customerId: string;
  cardTokenOrId: string;
  amount: string;
  currency: string;
  description: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface ChargeCardResult {
  provider: string;
  paymentId: string;
  status: 'approved' | 'rejected' | 'pending';
  statusDetail?: string;
}

export interface PaymentProvider {
  createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult>;

  /**
   * Charge a saved card on file. Optional — not all providers support it.
   * If not implemented, the system falls back to checkout links.
   */
  chargeCard?(params: ChargeCardParams): Promise<ChargeCardResult>;
}
