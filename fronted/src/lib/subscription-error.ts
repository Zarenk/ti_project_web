import type { GraceTier } from "@/types/subscription"

const SUBSCRIPTION_BLOCK_PATTERN =
  /no permite esta operaci[oó]n|Actualiza tu plan para continuar/i

/** Structured error from SubscriptionStatusGuard (new format) */
export interface SubscriptionBlockedInfo {
  code: "SUBSCRIPTION_BLOCKED"
  status: string
  graceTier: GraceTier | "NONE"
  feature: string
  message: string
}

/**
 * Detects whether an error comes from the backend SubscriptionStatusGuard.
 * Supports both old format (string message) and new format (object with code).
 */
export function isSubscriptionBlockedError(
  error: unknown,
): boolean {
  // New format: object with code
  if (isStructuredBlockedError(error)) return true

  // Old format: string message matching pattern
  const message = extractMessage(error)
  if (!message) return false
  return SUBSCRIPTION_BLOCK_PATTERN.test(message)
}

/**
 * Parse the subscription blocked error into structured info.
 * Works with both old (string regex) and new (object) formats.
 */
export function parseSubscriptionBlockedError(
  error: unknown,
): SubscriptionBlockedInfo | null {
  // New format: object with code
  const structured = extractStructuredError(error)
  if (structured) return structured

  // Old format: try to parse from string
  const message = extractMessage(error)
  if (!message || !SUBSCRIPTION_BLOCK_PATTERN.test(message)) return null

  const statusMatch = message.match(/suscripci[oó]n \((\w+)\)/)
  return {
    code: "SUBSCRIPTION_BLOCKED",
    status: statusMatch?.[1] ?? "UNKNOWN",
    graceTier: "NONE",
    feature: "unknown",
    message,
  }
}

/**
 * Extracts the subscription status (e.g. "PAST_DUE", "CANCELED")
 * from the guard error message, if present.
 */
export function parseSubscriptionStatus(message: string): string | null {
  const match = message.match(/suscripci[oó]n \((\w+)\)/)
  return match?.[1] ?? null
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function isStructuredBlockedError(error: unknown): boolean {
  const obj = extractErrorObject(error)
  return obj?.code === "SUBSCRIPTION_BLOCKED"
}

function extractStructuredError(
  error: unknown,
): SubscriptionBlockedInfo | null {
  const obj = extractErrorObject(error)
  if (obj?.code !== "SUBSCRIPTION_BLOCKED") return null
  return {
    code: "SUBSCRIPTION_BLOCKED",
    status: String(obj.status ?? "UNKNOWN"),
    graceTier: (obj.graceTier as GraceTier) ?? "NONE",
    feature: String(obj.feature ?? "unknown"),
    message: String(obj.message ?? ""),
  }
}

/**
 * Extracts the error body object from various error shapes:
 * - Fetch response error: { message: { code, status, ... } }
 * - Direct object: { code, status, ... }
 * - Nested: { error: { code, ... } }
 */
function extractErrorObject(
  error: unknown,
): Record<string, unknown> | null {
  if (!error || typeof error !== "object") return null
  const err = error as Record<string, unknown>

  // Direct: { code: 'SUBSCRIPTION_BLOCKED', ... }
  if (err.code === "SUBSCRIPTION_BLOCKED") return err

  // Nested in message: { message: { code: ... } }
  if (err.message && typeof err.message === "object") {
    const msg = err.message as Record<string, unknown>
    if (msg.code === "SUBSCRIPTION_BLOCKED") return msg
  }

  // Nested in error: { error: { code: ... } }
  if (err.error && typeof err.error === "object") {
    const inner = err.error as Record<string, unknown>
    if (inner.code === "SUBSCRIPTION_BLOCKED") return inner
  }

  // Nested in response.data: axios-style
  if (err.response && typeof err.response === "object") {
    const resp = err.response as Record<string, unknown>
    if (resp.data && typeof resp.data === "object") {
      const data = resp.data as Record<string, unknown>
      if (data.code === "SUBSCRIPTION_BLOCKED") return data
      if (data.message && typeof data.message === "object") {
        const msg = data.message as Record<string, unknown>
        if (msg.code === "SUBSCRIPTION_BLOCKED") return msg
      }
    }
  }

  return null
}

function extractMessage(error: unknown): string | null {
  if (typeof error === "string") return error
  if (!error || typeof error !== "object") return null
  const err = error as Record<string, unknown>
  if (typeof err.message === "string") return err.message
  return null
}
