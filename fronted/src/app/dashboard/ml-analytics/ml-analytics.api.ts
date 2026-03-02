import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

// ── Types ────────────────────────────────────────────────────────────────────

export interface MLModelStatus {
  loaded: boolean
  count?: number
}

export type MLStatusMap = Record<string, MLModelStatus>

export interface DemandForecastPoint {
  ds: string
  yhat: number
  yhat_lower: number
  yhat_upper: number
}

export interface DemandForecastResult {
  available: boolean
  method?: string
  forecast?: DemandForecastPoint[]
}

export interface BasketRule {
  productIds: number[]
  productNames: string[]
  confidence: number
  lift: number
}

export interface PriceCheckResult {
  available: boolean
  isAnomaly?: boolean
  reason?: string
  stats?: {
    mean: number
    min: number
    max: number
    p5: number
    p95: number
  }
}

export interface ClientSegment {
  label: string
  count: number
  avg_monetary: number
  avg_frequency: number
  avg_recency: number
  top_clients?: Array<{ clientId: number; name: string; monetary: number }>
}

// ── API Functions ────────────────────────────────────────────────────────────

export async function fetchMLStatus(): Promise<MLStatusMap> {
  try {
    const res = await authFetch("/ml-models/status", { cache: "no-store" })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudo obtener el estado de modelos ML")
      throw new Error(message || "No se pudo obtener el estado de modelos ML")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return {}
    throw error
  }
}

export async function reloadMLModels(): Promise<{ loaded: string[] }> {
  const res = await authFetch("/ml-models/reload", { method: "POST" })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudieron recargar los modelos")
    throw new Error(message || "No se pudieron recargar los modelos")
  }
  return res.json()
}

export async function fetchDemandForecast(productId: number): Promise<DemandForecastResult> {
  try {
    const res = await authFetch(`/ml-models/demand/${productId}`, { cache: "no-store" })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudo obtener la prediccion de demanda")
      throw new Error(message || "No se pudo obtener la prediccion de demanda")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { available: false }
    throw error
  }
}

export async function fetchBasketSuggestions(productId: number, limit = 5): Promise<BasketRule[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await authFetch(`/ml-models/basket/${productId}?${params.toString()}`, { cache: "no-store" })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudieron obtener sugerencias")
      throw new Error(message || "No se pudieron obtener sugerencias")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return []
    throw error
  }
}

export async function checkPriceAnomaly(productId: number, price: number): Promise<PriceCheckResult> {
  try {
    const res = await authFetch("/ml-models/price-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, price }),
    })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudo verificar el precio")
      throw new Error(message || "No se pudo verificar el precio")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { available: false }
    throw error
  }
}

export async function fetchClientSegments(): Promise<Record<string, ClientSegment>> {
  try {
    const res = await authFetch("/ml-models/segments", { cache: "no-store" })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudieron obtener los segmentos")
      throw new Error(message || "No se pudieron obtener los segmentos")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return {}
    throw error
  }
}

export async function fetchCategoryMap(): Promise<Record<string, string>> {
  try {
    const res = await authFetch("/ml-models/categories", { cache: "no-store" })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudo obtener el mapa de categorias")
      throw new Error(message || "No se pudo obtener el mapa de categorias")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return {}
    throw error
  }
}
