import { authFetch } from "@/utils/auth-fetch"

export interface CashFlowMovement {
  id: number
  tipo: "entrada" | "salida"
  concepto: string
  monto: number
  fecha: string
}

export interface CashFlowData {
  disponible: number
  entradasHoy: number
  salidasHoy: number
  proyeccionSemana: number
  gastosRecurrentes: number
  movimientosRecientes: CashFlowMovement[]
}

export interface HealthIndicator {
  name: string
  description: string
  value: string
  status: "EXCELENTE" | "BUENO" | "ATENCIÓN" | "CRÍTICO"
  detail: string
}

export interface HealthScoreData {
  status: "EXCELENTE" | "BUENO" | "ATENCIÓN" | "CRÍTICO"
  score: number
  loQueTienes: number
  loQueDebes: number
  tuPatrimonio: number
  ingresos: number
  costos: number
  ganancia: number
  margenGanancia: number
  indicators: HealthIndicator[]
}

/**
 * Fetch cash flow data for "Mi Dinero" page
 */
export async function fetchCashFlow(): Promise<CashFlowData> {
  const response = await authFetch("/accounting/analytics/cash-flow")
  if (!response.ok) {
    throw new Error("Failed to fetch cash flow data")
  }
  return response.json()
}

/**
 * Fetch business health score for "Salud del Negocio" page
 */
export async function fetchHealthScore(): Promise<HealthScoreData> {
  const response = await authFetch("/accounting/analytics/health-score")
  if (!response.ok) {
    throw new Error("Failed to fetch health score data")
  }
  return response.json()
}
