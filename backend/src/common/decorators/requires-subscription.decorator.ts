import { SetMetadata } from '@nestjs/common';

export const SUBSCRIPTION_REQUIRED_KEY = 'subscription_required';

export interface SubscriptionRequirement {
  feature: string;
  allowTrial?: boolean;
}

/**
 * Requires an active subscription (TRIAL or ACTIVE) to access the route.
 * - No subscription found → allowed (legacy/admin-created orgs)
 * - SUPER_ADMIN_GLOBAL → always bypasses
 * - PAST_DUE / CANCELED → blocked with 403
 */
export const RequiresActiveSubscription = (
  feature: string,
  options?: { allowTrial?: boolean },
) =>
  SetMetadata(SUBSCRIPTION_REQUIRED_KEY, {
    feature,
    allowTrial: options?.allowTrial ?? true,
  } satisfies SubscriptionRequirement);
