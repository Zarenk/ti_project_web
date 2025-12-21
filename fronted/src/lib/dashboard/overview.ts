import { authFetch } from "@/utils/auth-fetch"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

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
