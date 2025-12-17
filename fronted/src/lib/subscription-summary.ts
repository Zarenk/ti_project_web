import { authFetch } from "@/utils/auth-fetch"
import type { SubscriptionSummary } from "@/types/subscription"

export async function fetchSubscriptionSummary(): Promise<SubscriptionSummary> {
  const res = await authFetch("/subscriptions/me/summary", { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`No se pudo obtener el resumen de suscripción (${res.status})`)
  }
  return res.json()
}
