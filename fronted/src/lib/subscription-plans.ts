import type { SubscriptionPlanOption } from "@/types/subscription"
import { authFetch } from "@/utils/auth-fetch"

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlanOption[]> {
  const res = await authFetch("/subscriptions/plans", { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`No se pudo obtener la lista de planes (${res.status})`)
  }
  return res.json()
}
