/**
 * Common interface for all payment provider adapters.
 *
 * Each adapter translates the internal payment request into the
 * provider-specific API call and normalizes the response.
 */

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  description: string;
  clientEmail?: string;
  clientPhone?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentAdapterResult {
  providerPaymentId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentUrl?: string;
  expiresAt?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentStatusResult {
  providerPaymentId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  netAmount?: number;
  commissionAmount?: number;
  commissionRate?: number;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentAdapter {
  readonly providerName: string;

  createPayment(params: CreatePaymentParams): Promise<PaymentAdapterResult>;

  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
}
