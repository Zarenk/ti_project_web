/**
 * Payment order state machine.
 *
 * Reuses the generic StateMachine from common/state-machine to enforce
 * valid payment lifecycle transitions.
 */

import { StateMachine } from '../common/state-machine/state-machine';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SETTLING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

export type PaymentEvent =
  | 'PROVIDER_ACCEPTED'
  | 'WEBHOOK_CONFIRMED'
  | 'SETTLEMENT_SUCCESS'
  | 'SETTLEMENT_FAILED'
  | 'PROVIDER_REJECTED'
  | 'TTL_EXPIRED'
  | 'REFUND_REQUESTED';

export const paymentStateMachine = new StateMachine<
  PaymentStatus,
  PaymentEvent
>(
  {
    PENDING: {
      PROVIDER_ACCEPTED: 'PROCESSING',
      WEBHOOK_CONFIRMED: 'SETTLING', // manual confirmation skips PROCESSING
      PROVIDER_REJECTED: 'FAILED',
      TTL_EXPIRED: 'EXPIRED',
    },
    PROCESSING: {
      WEBHOOK_CONFIRMED: 'SETTLING',
      PROVIDER_REJECTED: 'FAILED',
      TTL_EXPIRED: 'EXPIRED',
    },
    SETTLING: {
      SETTLEMENT_SUCCESS: 'COMPLETED',
      SETTLEMENT_FAILED: 'FAILED',
    },
    COMPLETED: {
      REFUND_REQUESTED: 'REFUNDED',
    },
    FAILED: {},
    EXPIRED: {},
    REFUNDED: {},
  },
  'PaymentOrder',
);

/** Terminal states — no further transitions possible. */
export const TERMINAL_STATUSES: readonly PaymentStatus[] = [
  'FAILED',
  'EXPIRED',
  'REFUNDED',
];

/** States eligible for expiration by the CRON job. */
export const EXPIRABLE_STATUSES: readonly PaymentStatus[] = [
  'PENDING',
  'PROCESSING',
];
