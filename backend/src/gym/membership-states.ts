import { StateMachine } from '../common/state-machine/state-machine';

// ── Membership Status ────────────────────────────────────────────────────────

export const MembershipStatus = {
  PROSPECT: 'PROSPECT',
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  FROZEN: 'FROZEN',
  PENDING_CANCEL: 'PENDING_CANCEL',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type MembershipStatus =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];

// ── Membership Events ────────────────────────────────────────────────────────

export const MembershipEvent = {
  START_TRIAL: 'START_TRIAL',
  PURCHASE: 'PURCHASE',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  FREEZE: 'FREEZE',
  UNFREEZE: 'UNFREEZE',
  REQUEST_CANCEL: 'REQUEST_CANCEL',
  CONFIRM_CANCEL: 'CONFIRM_CANCEL',
  REVOKE_CANCEL: 'REVOKE_CANCEL',
  EXPIRE: 'EXPIRE',
  RENEW: 'RENEW',
  REACTIVATE: 'REACTIVATE',
} as const;

export type MembershipEvent =
  (typeof MembershipEvent)[keyof typeof MembershipEvent];

// ── Transition Table ─────────────────────────────────────────────────────────
//
//  PROSPECT ──START_TRIAL──▶ TRIAL
//  PROSPECT ──PURCHASE─────▶ ACTIVE
//
//  TRIAL ──PURCHASE────────▶ ACTIVE
//  TRIAL ──CONFIRM_CANCEL──▶ CANCELLED
//  TRIAL ──EXPIRE──────────▶ EXPIRED
//
//  ACTIVE ──PAYMENT_FAILED──▶ PAST_DUE
//  ACTIVE ──FREEZE──────────▶ FROZEN
//  ACTIVE ──REQUEST_CANCEL──▶ PENDING_CANCEL
//  ACTIVE ──EXPIRE──────────▶ EXPIRED
//
//  PAST_DUE ──PAYMENT_SUCCESS──▶ ACTIVE
//  PAST_DUE ──CONFIRM_CANCEL───▶ CANCELLED
//
//  FROZEN ──UNFREEZE───────▶ ACTIVE
//  FROZEN ──CONFIRM_CANCEL─▶ CANCELLED
//  FROZEN ──EXPIRE─────────▶ EXPIRED
//
//  PENDING_CANCEL ──CONFIRM_CANCEL──▶ CANCELLED
//  PENDING_CANCEL ──REVOKE_CANCEL───▶ ACTIVE
//
//  CANCELLED ──REACTIVATE──▶ PROSPECT
//
//  EXPIRED ──RENEW────────▶ ACTIVE
//  EXPIRED ──REACTIVATE───▶ PROSPECT
//

export const membershipStateMachine = new StateMachine<
  MembershipStatus,
  MembershipEvent
>(
  {
    [MembershipStatus.PROSPECT]: {
      [MembershipEvent.START_TRIAL]: MembershipStatus.TRIAL,
      [MembershipEvent.PURCHASE]: MembershipStatus.ACTIVE,
    },
    [MembershipStatus.TRIAL]: {
      [MembershipEvent.PURCHASE]: MembershipStatus.ACTIVE,
      [MembershipEvent.CONFIRM_CANCEL]: MembershipStatus.CANCELLED,
      [MembershipEvent.EXPIRE]: MembershipStatus.EXPIRED,
    },
    [MembershipStatus.ACTIVE]: {
      [MembershipEvent.PAYMENT_FAILED]: MembershipStatus.PAST_DUE,
      [MembershipEvent.FREEZE]: MembershipStatus.FROZEN,
      [MembershipEvent.REQUEST_CANCEL]: MembershipStatus.PENDING_CANCEL,
      [MembershipEvent.EXPIRE]: MembershipStatus.EXPIRED,
    },
    [MembershipStatus.PAST_DUE]: {
      [MembershipEvent.PAYMENT_SUCCESS]: MembershipStatus.ACTIVE,
      [MembershipEvent.CONFIRM_CANCEL]: MembershipStatus.CANCELLED,
    },
    [MembershipStatus.FROZEN]: {
      [MembershipEvent.UNFREEZE]: MembershipStatus.ACTIVE,
      [MembershipEvent.CONFIRM_CANCEL]: MembershipStatus.CANCELLED,
      [MembershipEvent.EXPIRE]: MembershipStatus.EXPIRED,
    },
    [MembershipStatus.PENDING_CANCEL]: {
      [MembershipEvent.CONFIRM_CANCEL]: MembershipStatus.CANCELLED,
      [MembershipEvent.REVOKE_CANCEL]: MembershipStatus.ACTIVE,
    },
    [MembershipStatus.CANCELLED]: {
      [MembershipEvent.REACTIVATE]: MembershipStatus.PROSPECT,
    },
    [MembershipStatus.EXPIRED]: {
      [MembershipEvent.RENEW]: MembershipStatus.ACTIVE,
      [MembershipEvent.REACTIVATE]: MembershipStatus.PROSPECT,
    },
  },
  'MembershipStateMachine',
);
