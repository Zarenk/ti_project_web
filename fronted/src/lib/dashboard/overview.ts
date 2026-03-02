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

// ── Employee KPIs ──────────────────────────────────────────────────────────

export type EmployeeKPIPeriod = "month" | "quarter" | "year"

export type EmployeePeriodStats = {
  salesCount: number
  totalRevenue: number
  avgTicket: number
  itemsSold: number
}

export type EmployeeMonthPoint = {
  month: string
  salesCount: number
  revenue: number
  itemsSold: number
}

export type EmployeeRanking = {
  position: number
  totalSellers: number
  topSellerRevenue: number
  myRevenue: number
}

export type EmployeeTopProduct = {
  productId: number
  productName: string
  quantity: number
  salesCount: number
}

export type EmployeeKPIData = {
  currentPeriod: EmployeePeriodStats
  previousPeriod: EmployeePeriodStats
  growth: {
    salesCount: number | null
    totalRevenue: number | null
    avgTicket: number | null
    itemsSold: number | null
  }
  monthlySeries: EmployeeMonthPoint[]
  ranking: EmployeeRanking
  topProducts: EmployeeTopProduct[]
}

const EMPTY_EMPLOYEE_KPIS: EmployeeKPIData = {
  currentPeriod: { salesCount: 0, totalRevenue: 0, avgTicket: 0, itemsSold: 0 },
  previousPeriod: { salesCount: 0, totalRevenue: 0, avgTicket: 0, itemsSold: 0 },
  growth: { salesCount: null, totalRevenue: null, avgTicket: null, itemsSold: null },
  monthlySeries: [],
  ranking: { position: 0, totalSellers: 0, topSellerRevenue: 0, myRevenue: 0 },
  topProducts: [],
}

export async function fetchEmployeeKPIs(
  period: EmployeeKPIPeriod = "month",
): Promise<EmployeeKPIData> {
  const res = await authFetch(
    `${BACKEND_URL}/api/dashboard/employee-kpis?period=${period}`,
    { credentials: "include" },
  )

  if (res.status === 403) return EMPTY_EMPLOYEE_KPIS
  if (!res.ok) return EMPTY_EMPLOYEE_KPIS

  const p = await res.json()
  return {
    currentPeriod: p?.currentPeriod ?? EMPTY_EMPLOYEE_KPIS.currentPeriod,
    previousPeriod: p?.previousPeriod ?? EMPTY_EMPLOYEE_KPIS.previousPeriod,
    growth: p?.growth ?? EMPTY_EMPLOYEE_KPIS.growth,
    monthlySeries: Array.isArray(p?.monthlySeries) ? p.monthlySeries : [],
    ranking: p?.ranking ?? EMPTY_EMPLOYEE_KPIS.ranking,
    topProducts: Array.isArray(p?.topProducts) ? p.topProducts : [],
  }
}
