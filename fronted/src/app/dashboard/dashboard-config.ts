import {
  Box,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Scale,
  Dumbbell,
  Users,
  Clock,
  Calendar,
  UtensilsCrossed,
  ClipboardList,
  Briefcase,
  type LucideIcon,
} from "lucide-react"
import type { DashboardSparklines } from "@/lib/dashboard/overview"

// ── Role-based permission matrix ──────────────────────────────────────────────

export type DashboardRole = "super_admin" | "admin" | "employee"

export function resolveDashboardRole(userRole: string | null): DashboardRole {
  if (!userRole) return "employee"
  const normalized = userRole.trim().toUpperCase().replace(/\s+/g, "_")
  if (normalized === "SUPER_ADMIN_GLOBAL") return "super_admin"
  if (["SUPER_ADMIN_ORG", "ADMIN"].includes(normalized)) return "admin"
  return "employee"
}

export const ROLE_PERMISSIONS = {
  super_admin: {
    showKPIs: true,
    showAmounts: true,
    showFinancialSummary: true,
    showHealthScore: true,
    showSparklines: true,
    showActivityWithAmounts: true,
    showOrgSelector: true,
    showEmployeeKPIs: false,
  },
  admin: {
    showKPIs: true,
    showAmounts: true,
    showFinancialSummary: true,
    showHealthScore: true,
    showSparklines: true,
    showActivityWithAmounts: true,
    showOrgSelector: false,
    showEmployeeKPIs: false,
  },
  employee: {
    showKPIs: false,
    showAmounts: false,
    showFinancialSummary: false,
    showHealthScore: false,
    showSparklines: false,
    showActivityWithAmounts: false,
    showOrgSelector: false,
    showEmployeeKPIs: true,
  },
} as const

export type RolePermissions = (typeof ROLE_PERMISSIONS)[DashboardRole]

// ── KPI card definitions per vertical ─────────────────────────────────────────

export type KPIDefinition = {
  key: string
  title: string
  icon: LucideIcon
  color: "blue" | "emerald" | "amber" | "violet"
  href: string
  sparklineKey: keyof DashboardSparklines | null
}

export type VerticalDashboardConfig = {
  greeting: string
  kpis: [KPIDefinition, KPIDefinition, KPIDefinition, KPIDefinition]
  showFinancialSummary: boolean
  activityLabel: string
}

// ── Shared KPI definitions ────────────────────────────────────────────────────

const KPI_INVENTORY: KPIDefinition = {
  key: "inventory",
  title: "Inventario Total",
  icon: Box,
  color: "blue",
  href: "/dashboard/inventory",
  sparklineKey: "inventory",
}

const KPI_MONTHLY_SALES: KPIDefinition = {
  key: "monthlySales",
  title: "Ventas del mes",
  icon: DollarSign,
  color: "emerald",
  href: "/dashboard/sales",
  sparklineKey: "sales",
}

const KPI_OUT_OF_STOCK: KPIDefinition = {
  key: "outOfStock",
  title: "Items sin Stock",
  icon: TrendingUp,
  color: "amber",
  href: "/dashboard/inventory?outOfStock=true",
  sparklineKey: "outOfStock",
}

const KPI_PENDING_ORDERS: KPIDefinition = {
  key: "pendingOrders",
  title: "Ordenes Pendientes",
  icon: ShoppingCart,
  color: "violet",
  href: "/dashboard/orders",
  sparklineKey: "pendingOrders",
}

// ── Per-vertical configs ──────────────────────────────────────────────────────

const GENERAL_CONFIG: VerticalDashboardConfig = {
  greeting: "Tu panel de control",
  kpis: [KPI_INVENTORY, KPI_MONTHLY_SALES, KPI_OUT_OF_STOCK, KPI_PENDING_ORDERS],
  showFinancialSummary: true,
  activityLabel: "Actividad Reciente",
}

const RESTAURANTS_CONFIG: VerticalDashboardConfig = {
  greeting: "Tu restaurante",
  kpis: [
    { key: "todayOrders", title: "Ordenes hoy", icon: ClipboardList, color: "blue", href: "/dashboard/restaurant-orders", sparklineKey: null },
    { ...KPI_MONTHLY_SALES, title: "Ventas del dia" },
    { key: "tablesOccupied", title: "Mesas ocupadas", icon: UtensilsCrossed, color: "amber", href: "/dashboard/tables", sparklineKey: null },
    { key: "kitchenPending", title: "Platos en cocina", icon: Clock, color: "violet", href: "/dashboard/kitchen", sparklineKey: null },
  ],
  showFinancialSummary: true,
  activityLabel: "Ordenes Recientes",
}

const LAW_FIRM_CONFIG: VerticalDashboardConfig = {
  greeting: "Tu estudio de abogados",
  kpis: [
    { key: "activeCases", title: "Expedientes activos", icon: Briefcase, color: "blue", href: "/dashboard/legal", sparklineKey: null },
    { ...KPI_MONTHLY_SALES, title: "Honorarios del mes" },
    { key: "upcomingEvents", title: "Audiencias proximas", icon: Calendar, color: "amber", href: "/dashboard/legal/calendar", sparklineKey: null },
    { key: "closedCases", title: "Casos cerrados", icon: Scale, color: "violet", href: "/dashboard/legal", sparklineKey: null },
  ],
  showFinancialSummary: true,
  activityLabel: "Expedientes Recientes",
}

const GYM_CONFIG: VerticalDashboardConfig = {
  greeting: "Tu gimnasio",
  kpis: [
    { key: "activeMembers", title: "Miembros activos", icon: Users, color: "blue", href: "/dashboard/gym", sparklineKey: null },
    { ...KPI_MONTHLY_SALES, title: "Ingresos del mes" },
    { key: "todayCheckins", title: "Check-ins hoy", icon: Dumbbell, color: "amber", href: "/dashboard/gym", sparklineKey: null },
    { key: "todayClasses", title: "Clases hoy", icon: Calendar, color: "violet", href: "/dashboard/gym", sparklineKey: null },
  ],
  showFinancialSummary: true,
  activityLabel: "Actividad del Gimnasio",
}

// ── Config resolver ───────────────────────────────────────────────────────────

const VERTICAL_CONFIGS: Record<string, VerticalDashboardConfig> = {
  GENERAL: GENERAL_CONFIG,
  RETAIL: GENERAL_CONFIG,
  COMPUTERS: GENERAL_CONFIG,
  MANUFACTURING: GENERAL_CONFIG,
  SERVICES: GENERAL_CONFIG,
  RESTAURANTS: RESTAURANTS_CONFIG,
  LAW_FIRM: LAW_FIRM_CONFIG,
  GYM: GYM_CONFIG,
}

export function getDashboardConfig(vertical: string | null | undefined): VerticalDashboardConfig {
  if (!vertical) return GENERAL_CONFIG
  return VERTICAL_CONFIGS[vertical.trim().toUpperCase()] ?? GENERAL_CONFIG
}

// ── Quick links for employees ─────────────────────────────────────────────────

export type QuickLink = {
  title: string
  description: string
  icon: LucideIcon
  href: string
  permission?: string
}

const GENERAL_QUICK_LINKS: QuickLink[] = [
  { title: "Nueva Venta", description: "Registrar una venta", icon: DollarSign, href: "/dashboard/sales/new", permission: "sales" },
  { title: "Ver Inventario", description: "Consultar stock", icon: Box, href: "/dashboard/inventory", permission: "inventory" },
  { title: "Ordenes", description: "Ver ordenes pendientes", icon: ShoppingCart, href: "/dashboard/orders", permission: "sales" },
  { title: "Proveedores", description: "Gestionar proveedores", icon: Users, href: "/dashboard/providers", permission: "purchases" },
]

const RESTAURANT_QUICK_LINKS: QuickLink[] = [
  { title: "Nueva Orden", description: "Crear orden de mesa", icon: ClipboardList, href: "/dashboard/restaurant-orders", permission: "sales" },
  { title: "Mesas", description: "Ver estado de mesas", icon: UtensilsCrossed, href: "/dashboard/tables", permission: "sales" },
  { title: "Cocina", description: "Ver pedidos en cocina", icon: Clock, href: "/dashboard/kitchen", permission: "sales" },
  { title: "Caja", description: "Abrir o cerrar caja", icon: DollarSign, href: "/dashboard/cashregister", permission: "sales" },
]

const LAW_FIRM_QUICK_LINKS: QuickLink[] = [
  { title: "Nuevo Expediente", description: "Crear caso", icon: Briefcase, href: "/dashboard/legal/new", permission: "legal" },
  { title: "Mis Expedientes", description: "Ver casos activos", icon: Scale, href: "/dashboard/legal", permission: "legal" },
  { title: "Calendario", description: "Audiencias y plazos", icon: Calendar, href: "/dashboard/legal/calendar", permission: "legal" },
  { title: "Documentos", description: "Gestion documental", icon: ClipboardList, href: "/dashboard/legal/documents", permission: "legal" },
]

const GYM_QUICK_LINKS: QuickLink[] = [
  { title: "Check-in", description: "Registrar entrada", icon: Dumbbell, href: "/dashboard/gym", permission: "sales" },
  { title: "Miembros", description: "Ver listado", icon: Users, href: "/dashboard/gym", permission: "sales" },
  { title: "Membresias", description: "Gestionar planes", icon: DollarSign, href: "/dashboard/gym", permission: "sales" },
  { title: "Clases", description: "Horario de clases", icon: Calendar, href: "/dashboard/gym", permission: "sales" },
]

const VERTICAL_QUICK_LINKS: Record<string, QuickLink[]> = {
  GENERAL: GENERAL_QUICK_LINKS,
  RETAIL: GENERAL_QUICK_LINKS,
  COMPUTERS: GENERAL_QUICK_LINKS,
  MANUFACTURING: GENERAL_QUICK_LINKS,
  SERVICES: GENERAL_QUICK_LINKS,
  RESTAURANTS: RESTAURANT_QUICK_LINKS,
  LAW_FIRM: LAW_FIRM_QUICK_LINKS,
  GYM: GYM_QUICK_LINKS,
}

export function getQuickLinks(vertical: string | null | undefined): QuickLink[] {
  if (!vertical) return GENERAL_QUICK_LINKS
  return VERTICAL_QUICK_LINKS[vertical.trim().toUpperCase()] ?? GENERAL_QUICK_LINKS
}
