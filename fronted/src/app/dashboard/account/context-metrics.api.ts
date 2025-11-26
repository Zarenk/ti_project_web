import { authFetch } from "@/utils/auth-fetch"

export type ContextMetricsResponse = {
  totalSelections: number
  selectionsLast30Days: number
  preferenceCount: number
  lastSelection: {
    id: number
    orgId: number
    companyId: number | null
    orgName: string | null
    companyName: string | null
    device: string | null
    createdAt: string
  } | null
  topOrganizations: Array<{ id: number | null; name?: string | null; count: number }>
  topCompanies: Array<{ id: number | null; name?: string | null; count: number }>
  deviceBreakdown: Array<{ id: string | null; name?: string | null; count: number }>
}

export type ContextMetricsSummary = {
  totalSelections: number
  selectionsLast24h: number
  uniqueUsers: number
  topOrganizations: Array<{ id: number | null; name?: string | null; count: number }>
  topCompanies: Array<{ id: number | null; name?: string | null; count: number }>
  throttleStats?: {
    totalHits: number
    lastHourHits: number
    topUsers: Array<{ userId: number; hits: number }>
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "No se pudo obtener las métricas de contexto"
    try {
      const payload = await res.json()
      if (payload?.message) {
        message = payload.message
      }
    } catch {
      /* ignore parsing errors */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export async function fetchMyContextMetrics(): Promise<ContextMetricsResponse> {
  const res = await authFetch("/context-metrics/me", { cache: "no-store" })
  return parseResponse<ContextMetricsResponse>(res)
}

export async function fetchGlobalContextMetrics(): Promise<ContextMetricsSummary> {
  const res = await authFetch("/context-metrics/summary", { cache: "no-store" })
  return parseResponse<ContextMetricsSummary>(res)
}
