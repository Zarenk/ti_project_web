const SUBSCRIPTION_BLOCK_PATTERN =
  /no permite esta operaci[oó]n|Actualiza tu plan para continuar/i

/**
 * Detects whether an error message comes from the backend
 * SubscriptionStatusGuard (subscription blocked).
 */
export function isSubscriptionBlockedError(message: string | undefined | null): boolean {
  if (!message) return false
  return SUBSCRIPTION_BLOCK_PATTERN.test(message)
}

/**
 * Extracts the subscription status (e.g. "PAST_DUE", "CANCELED")
 * from the guard error message, if present.
 */
export function parseSubscriptionStatus(message: string): string | null {
  const match = message.match(/suscripci[oó]n \((\w+)\)/)
  return match?.[1] ?? null
}
