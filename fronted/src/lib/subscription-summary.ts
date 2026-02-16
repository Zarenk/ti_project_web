import { authFetch } from "@/utils/auth-fetch"
import type { SubscriptionSummary } from "@/types/subscription"

export async function fetchSubscriptionSummary(organizationId?: number): Promise<SubscriptionSummary> {
  const params = new URLSearchParams()
  if (organizationId) {
    params.set("organizationId", String(organizationId))
  }
  const query = params.toString()
  const url = query ? `/subscriptions/me/summary?${query}` : "/subscriptions/me/summary"
  const res = await authFetch(url, {
    cache: "no-store",
    tenantOverrides: organizationId ? { orgId: organizationId } : undefined,
  })
  if (!res.ok) {
    throw new Error(`No se pudo obtener el resumen de suscripción (${res.status})`)
  }
  return res.json()
}
