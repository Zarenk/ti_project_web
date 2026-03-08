import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "http://localhost:4000"

// ── Types ────────────────────────────────────────────────────────────────────

export interface MLModelStatus {
  loaded: boolean
  count?: number
}

export type MLStatusMap = Record<string, MLModelStatus>

export interface TrainingResult {
  success: boolean
  startedAt: string
  completedAt: string
  elapsedSeconds: number
  export: Record<string, any>
  training: Record<string, { status: string; message?: string }>
  summary: { successful: number; failed: number; total: number }
}

export interface TrainingStatus {
  isRunning: boolean
  lastRun: string | null
  lastDuration: number | null
  lastResult: TrainingResult | null
  currentStep: string | null
  completedSteps: string[]
  totalSteps: number
  schedule: { enabled: boolean; cron: string; nextDescription: string }
}

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

export async function fetchDemandProductIds(): Promise<number[]> {
  try {
    const res = await authFetch("/ml-models/demand/products", { cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function fetchDemandForecast(productId: number, days = 7): Promise<DemandForecastResult> {
  try {
    const params = new URLSearchParams({ days: String(days) })
    const res = await authFetch(`/ml-models/demand/${productId}?${params}`, { cache: "no-store" })
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

// ── Products for ML search ────────────────────────────────────────────────

export interface MLProduct {
  id: number
  name: string
  priceSell: number
  categoryName: string | null
}

export async function fetchMLProducts(): Promise<MLProduct[]> {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/products`, { cache: "no-store" })
    if (!res.ok) return []
    const raw = await res.json()
    if (!Array.isArray(raw)) return []
    return raw.map((p: any) => ({
      id: p.id,
      name: p.name || "",
      priceSell: p.priceSell ?? p.price_sell ?? 0,
      categoryName: p.category_name ?? p.categoryName ?? null,
    }))
  } catch {
    return []
  }
}

// ── Training API ──────────────────────────────────────────────────────────

export async function fetchTrainingStatus(): Promise<TrainingStatus> {
  try {
    const res = await authFetch("/ml-models/training/status", { cache: "no-store" })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudo obtener el estado de entrenamiento")
      throw new Error(message || "No se pudo obtener el estado de entrenamiento")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError)
      return {
        isRunning: false,
        lastRun: null,
        lastDuration: null,
        lastResult: null,
        currentStep: null,
        completedSteps: [],
        totalSteps: 5,
        schedule: { enabled: false, cron: "", nextDescription: "" },
      }
    throw error
  }
}

export async function startTraining(steps?: string[]): Promise<TrainingResult> {
  const res = await authFetch("/ml-models/training/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(steps ? { steps } : {}),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo iniciar el entrenamiento")
    throw new Error(message || "No se pudo iniciar el entrenamiento")
  }
  return res.json()
}

export async function cancelTraining(): Promise<{ cancelled: boolean }> {
  const res = await authFetch("/ml-models/training/cancel", { method: "POST" })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo cancelar el entrenamiento")
    throw new Error(message || "No se pudo cancelar el entrenamiento")
  }
  return res.json()
}

export async function toggleTrainingCron(enabled: boolean): Promise<{ enabled: boolean }> {
  const res = await authFetch("/ml-models/training/toggle-cron", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo cambiar la configuracion")
    throw new Error(message || "No se pudo cambiar la configuracion")
  }
  return res.json()
}
