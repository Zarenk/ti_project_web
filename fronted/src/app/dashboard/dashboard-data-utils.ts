import type { VerticalDashboardConfig } from "./dashboard-config"
import type { GymOverview } from "./gym/gym.api"
import type { RestaurantDashboardSummary } from "./kitchen/kitchen.api"

// ── Types ────────────────────────────────────────────────────────────────────

export type ActivityItem = {
  id: number | string
  type: "order" | "sale" | "entry" | "alert"
  description: string
  amount?: number | null
  createdAt: string
  href: string
}

export type KPIValue = {
  key: string
  value: number | string
  subtitle: string
}

export type LegalStats = { total: number; active: number; closed: number; upcomingEvents: number }

// ── KPI builder ──────────────────────────────────────────────────────────────

export function buildKPIValues(params: {
  config: VerticalDashboardConfig
  overviewData: any
  ordersOverview: any
  canSales: boolean
  normalizedVertical: string
  safeLowStock: any[]
  gymData: GymOverview | null
  legalData: LegalStats | null
  restaurantData: RestaurantDashboardSummary | null
}): KPIValue[] {
  const {
    config,
    overviewData,
    ordersOverview,
    canSales,
    normalizedVertical,
    safeLowStock,
    gymData,
    legalData,
    restaurantData,
  } = params

  const safeInventory = Array.isArray(overviewData?.inventoryTotals)
    ? overviewData.inventoryTotals : []
  const safePendingCount = ordersOverview?.pendingCount ?? 0
  const monthlySalesData = canSales
    ? overviewData.monthlySales ?? { total: 0, growth: null }
    : { total: 0, growth: null }

  const totalStock = safeInventory.reduce((sum: number, item: any) => sum + item.totalStock, 0)
  const growthText = monthlySalesData.growth != null
    ? `${monthlySalesData.growth >= 0 ? "+" : ""}${monthlySalesData.growth.toFixed(1)}% vs mes anterior`
    : "Sin datos del mes anterior"

  return config.kpis.map((kpi) => {
    switch (kpi.key) {
      // General KPIs
      case "inventory":
        return { key: kpi.key, value: totalStock, subtitle: "Items en stock" }
      case "monthlySales": {
        // RESTAURANTS shows daily revenue, others show monthly
        if (normalizedVertical === "RESTAURANTS" && restaurantData) {
          return {
            key: kpi.key,
            value: restaurantData.dailyRevenue > 0 ? `S/. ${restaurantData.dailyRevenue.toFixed(2)}` : "Sin datos",
            subtitle: "Ventas cerradas hoy",
          }
        }
        return {
          key: kpi.key,
          value: monthlySalesData.total > 0 ? `S/. ${monthlySalesData.total.toFixed(2)}` : "Sin datos",
          subtitle: growthText,
        }
      }
      case "outOfStock":
        return { key: kpi.key, value: safeLowStock.length, subtitle: "Necesitan reabastecimiento" }
      case "pendingOrders":
        return { key: kpi.key, value: safePendingCount, subtitle: "Ordenes por atender" }

      // GYM KPIs
      case "activeMembers":
        return { key: kpi.key, value: gymData?.activeMembers ?? 0, subtitle: gymData?.memberGrowth != null ? `${gymData.memberGrowth >= 0 ? "+" : ""}${gymData.memberGrowth.toFixed(1)}% crecimiento` : "Miembros registrados" }
      case "todayCheckins":
        return { key: kpi.key, value: gymData?.todayCheckins ?? 0, subtitle: gymData?.checkinGrowth != null ? `${gymData.checkinGrowth >= 0 ? "+" : ""}${gymData.checkinGrowth.toFixed(1)}% vs mes anterior` : "Entradas registradas" }
      case "todayClasses":
        return { key: kpi.key, value: gymData?.todayClasses ?? 0, subtitle: "Clases programadas" }

      // LAW_FIRM KPIs
      case "activeCases":
        return { key: kpi.key, value: legalData?.active ?? 0, subtitle: `${legalData?.total ?? 0} expedientes en total` }
      case "upcomingEvents":
        return { key: kpi.key, value: legalData?.upcomingEvents ?? 0, subtitle: "Eventos programados" }
      case "closedCases":
        return { key: kpi.key, value: legalData?.closed ?? 0, subtitle: "Casos resueltos" }

      // RESTAURANTS KPIs
      case "todayOrders":
        return { key: kpi.key, value: restaurantData?.todayOrders ?? safePendingCount, subtitle: "Ordenes del dia" }
      case "tablesOccupied":
        return { key: kpi.key, value: restaurantData?.tablesOccupied ?? 0, subtitle: "Mesas en uso" }
      case "kitchenPending":
        return { key: kpi.key, value: restaurantData?.kitchenPending ?? 0, subtitle: "En preparacion" }

      default:
        return { key: kpi.key, value: 0, subtitle: "" }
    }
  })
}

// ── Activity feed builder ────────────────────────────────────────────────────

export function buildActivityFeed(params: {
  ordersOverview: any
  overviewData: any
  safeLowStock: any[]
}): ActivityItem[] {
  const { ordersOverview, overviewData, safeLowStock } = params

  const safeRecentOrders = Array.isArray(ordersOverview?.recentOrders)
    ? ordersOverview.recentOrders : []
  const safeRecentSales = Array.isArray(overviewData?.recentSales)
    ? overviewData.recentSales : []
  const safeEntries = Array.isArray(overviewData?.recentEntries)
    ? overviewData.recentEntries : []

  const activities: ActivityItem[] = [
    ...safeRecentOrders.map((o: any) => ({
      id: o.id,
      type: "order" as const,
      description: `Orden #${o.code}`,
      amount: null,
      createdAt: o.createdAt,
      href: `/dashboard/orders/${o.id}`,
    })),
    ...safeRecentSales.map((s: any) => ({
      id: s.id,
      type: "sale" as const,
      description: `Venta #${s.id}`,
      amount: typeof s.total === "number" ? s.total : null,
      createdAt: s.createdAt,
      href: `/dashboard/sales?saleId=${s.id}`,
    })),
    ...safeEntries
      .slice()
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((e: any) => ({
        id: e.id,
        type: "entry" as const,
        description: `Ingreso #${e.id}`,
        amount: null,
        createdAt: e.createdAt,
        href: `/dashboard/entries?entryId=${e.id}`,
      })),
    // Low stock alerts
    ...(() => {
      const list: ActivityItem[] = []
      if (safeLowStock.length === 0) return list
      try {
        const storageKey = "dashboard.lowstock.seen"
        const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null
        const seen: Record<string, number> = raw ? JSON.parse(raw) : {}
        const now = Date.now()
        const ttlMs = 24 * 60 * 60 * 1000
        const newLow = safeLowStock.filter(
          (i: any) => !seen[String(i.productId)] || now - seen[String(i.productId)] > ttlMs,
        )
        list.push(
          ...newLow.slice(0, 3).map((i: any) => ({
            id: `lowstock-${i.productId}-${now}`,
            type: "alert" as const,
            description: `Sin stock: ${i.productName}`,
            amount: null,
            createdAt: new Date().toISOString(),
            href: `/dashboard/inventory/product-details/${i.productId}`,
          })),
        )
        if (newLow.length === 0 && safeLowStock.length > 0) {
          list.push({
            id: "lowstock-summary",
            type: "alert" as const,
            description: safeLowStock.length === 1
              ? `Sin stock: ${safeLowStock[0].productName}`
              : `Sin stock: ${safeLowStock[0].productName} y ${safeLowStock.length - 1} mas`,
            amount: null,
            createdAt: new Date().toISOString(),
            href: safeLowStock.length === 1
              ? `/dashboard/inventory/product-details/${safeLowStock[0].productId}`
              : "/dashboard/inventory/alerts",
          })
        } else if (safeLowStock.length - newLow.length > 0 && newLow.length > 0) {
          list.push({
            id: "lowstock-remaining",
            type: "alert" as const,
            description: `Otros ${safeLowStock.length - newLow.length} productos sin stock`,
            amount: null,
            createdAt: new Date().toISOString(),
            href: "/dashboard/inventory/alerts",
          })
        }
        const updated = { ...seen }
        newLow.forEach((i: any) => { updated[String(i.productId)] = now })
        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey, JSON.stringify(updated))
        }
      } catch { /* ignore */ }
      return list
    })(),
  ]

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return activities.slice(0, 10)
}
