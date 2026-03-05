import { SetMetadata } from '@nestjs/common';
import type { GraceTier } from 'src/subscriptions/subscription-quota.service';

export const SUBSCRIPTION_REQUIRED_KEY = 'subscription_required';

export interface SubscriptionRequirement {
  feature: string;
  allowTrial?: boolean;
  /**
   * Max grace tier that still allows access.
   * - `null` or omitted → blocked at any grace tier (premium-only feature)
   * - `'LOCKED'` → allowed even at LOCKED (effectively read endpoints)
   * - `'RESTRICTED'` → allowed at SOFT and RESTRICTED, blocked from READ_MOSTLY+
   */
  maxGraceTier?: GraceTier | null;
}

/**
 * Requires an active subscription (TRIAL or ACTIVE) to access the route.
 * - No subscription found → allowed (legacy/admin-created orgs)
 * - SUPER_ADMIN_GLOBAL → always bypasses
 * - paymentEnforced = false → allowed (grandfathered)
 * - PAST_DUE / CANCELED with paymentEnforced → checks grace tier
 */
export const RequiresActiveSubscription = (
  feature: string,
  options?: { allowTrial?: boolean; maxGraceTier?: GraceTier | null },
) =>
  SetMetadata(SUBSCRIPTION_REQUIRED_KEY, {
    feature,
    allowTrial: options?.allowTrial ?? true,
    maxGraceTier: options?.maxGraceTier,
  } satisfies SubscriptionRequirement);
