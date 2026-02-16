import { BACKEND_URL } from "@/lib/utils"
import { authFetch } from "@/utils/auth-fetch"

export type DashboardOverview = {
  inventoryTotals: Array<{ productId: number; name: string; totalStock: number }>
  lowStock: Array<{ inventoryId: number; productId: number; productName: string; totalStock: number }>
  recentSales: Array<{ id: number; total: number; createdAt: string; source: string | null }>
  recentEntries: Array<{ id: number; createdAt: string; storeId: number | null; description: string | null }>
  monthlySales: { total: number; growth: number | null }
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await authFetch(`${BACKEND_URL}/api/dashboard/overview`, { credentials: "include" })

  if (res.status === 403) {
    return {
      inventoryTotals: [],
      lowStock: [],
      recentSales: [],
      recentEntries: [],
      monthlySales: { total: 0, growth: null },
    }
  }

  if (!res.ok) {
    throw new Error("No se pudo obtener el resumen del dashboard")
  }

  const payload = await res.json()
  return {
    inventoryTotals: Array.isArray(payload?.inventoryTotals) ? payload.inventoryTotals : [],
    lowStock: Array.isArray(payload?.lowStock) ? payload.lowStock : [],
    recentSales: Array.isArray(payload?.recentSales) ? payload.recentSales : [],
    recentEntries: Array.isArray(payload?.recentEntries) ? payload.recentEntries : [],
    monthlySales:
      payload?.monthlySales && typeof payload.monthlySales === "object"
        ? {
            total: typeof payload.monthlySales.total === "number" ? payload.monthlySales.total : 0,
            growth:
              typeof payload.monthlySales.growth === "number" || payload.monthlySales.growth === null
                ? payload.monthlySales.growth
                : null,
          }
        : { total: 0, growth: null },
  }
}

// ── Sparklines ──────────────────────────────────────────────────────────

export type SparklinePoint = { date: string; value: number }

export type DashboardSparklines = {
  inventory: SparklinePoint[]
  sales: SparklinePoint[]
  outOfStock: SparklinePoint[]
  pendingOrders: SparklinePoint[]
}

const EMPTY_SPARKLINES: DashboardSparklines = {
  inventory: [],
  sales: [],
  outOfStock: [],
  pendingOrders: [],
}

export async function fetchDashboardSparklines(days = 30): Promise<DashboardSparklines> {
  const res = await authFetch(`${BACKEND_URL}/api/dashboard/sparklines?days=${days}`, {
    credentials: "include",
  })

  if (res.status === 403) return EMPTY_SPARKLINES
  if (!res.ok) return EMPTY_SPARKLINES

  const p = await res.json()
  return {
    inventory: Array.isArray(p?.inventory) ? p.inventory : [],
    sales: Array.isArray(p?.sales) ? p.sales : [],
    outOfStock: Array.isArray(p?.outOfStock) ? p.outOfStock : [],
    pendingOrders: Array.isArray(p?.pendingOrders) ? p.pendingOrders : [],
  }
}
