"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useModulePermission } from "@/hooks/use-module-permission"
import { useAuth } from "@/context/auth-context"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { useOptionalTenantFeatures } from "@/context/tenant-features-context"
import { UnauthenticatedError } from "@/utils/auth-fetch"
import { wasManualLogoutRecently } from "@/utils/manual-logout"
import { clearTenantSelection, getTenantSelection, setTenantSelection } from "@/utils/tenant-preferences"
import { listOrganizations, type OrganizationResponse } from "./tenancy/tenancy.api"
import { getOrdersDashboardOverview } from "./orders/orders.api"
import {
  fetchDashboardOverview,
  fetchDashboardSparklines,
  fetchEmployeeKPIs,
  type DashboardSparklines,
  type EmployeeKPIData,
  type EmployeeKPIPeriod,
} from "@/lib/dashboard/overview"
import { fetchAccountingSummary } from "./accounting/accounting.api"
import { fetchHealthScore, type HealthScoreData } from "./accounting/accounting-analytics.api"
import { getGymOverview } from "./gym/gym.api"
import { getLegalStats } from "./legal/legal-matters.api"
import { getRestaurantDashboardSummary } from "./kitchen/kitchen.api"
import type { AccountingSummary } from "@/lib/accounting/types"
import {
  resolveDashboardRole,
  getDashboardConfig,
  type DashboardRole,
  type VerticalDashboardConfig,
  ROLE_PERMISSIONS,
  type RolePermissions,
} from "./dashboard-config"
import {
  buildKPIValues,
  buildActivityFeed,
  type ActivityItem,
  type KPIValue,
  type LegalStats,
} from "./dashboard-data-utils"

// Re-export types so consumers don't need to change imports
export type { ActivityItem, KPIValue, LegalStats, EmployeeKPIData, EmployeeKPIPeriod }

export type DashboardData = {
  // Core
  loading: boolean
  dashboardRole: DashboardRole
  permissions: RolePermissions
  config: VerticalDashboardConfig
  vertical: string

  // KPI values (computed from data)
  kpiValues: KPIValue[]

  // Financial
  accountingSummary: AccountingSummary | null
  healthScore: HealthScoreData | null
  financialLoading: boolean

  // Activity
  recentActivity: ActivityItem[]
  sparklines: DashboardSparklines

  // Employee KPIs
  employeeKPIs: EmployeeKPIData | null
  employeeKPIPeriod: EmployeeKPIPeriod
  setEmployeeKPIPeriod: (p: EmployeeKPIPeriod) => void
  employeeKPIsLoading: boolean

  // Org selector (super admin)
  organizations: OrganizationResponse[]
  selectedOrgId: number | null
  organizationsLoading: boolean
  handleOrganizationChange: (value: string) => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDashboardData(): DashboardData {
  const router = useRouter()
  const checkPermission = useModulePermission()
  const { role: authRole, authPending, sessionExpiring } = useAuth()
  const { selection } = useTenantSelection()
  const tenantFeatures = useOptionalTenantFeatures()

  const userRole = authRole ?? null
  const dashboardRole = useMemo(() => resolveDashboardRole(userRole), [userRole])
  const permissions = useMemo(() => ROLE_PERMISSIONS[dashboardRole], [dashboardRole])

  // Resolve vertical from tenant features
  const vertical = tenantFeatures?.verticalInfo?.businessVertical ?? "GENERAL"
  const config = useMemo(() => getDashboardConfig(vertical), [vertical])

  // ── State ───────────────────────────────────────────────────────────────────
  const [bootstrapReady, setBootstrapReady] = useState(false)
  const [employeeKPIPeriod, setEmployeeKPIPeriod] = useState<EmployeeKPIPeriod>("month")

  // Org selector
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const [organizationsLoading, setOrganizationsLoading] = useState(false)

  const authErrorShown = useRef(false)
  const isGlobalSuperAdmin = useMemo(() => userRole?.trim().toUpperCase() === "SUPER_ADMIN_GLOBAL", [userRole])

  // ── Auth error handler ──────────────────────────────────────────────────────
  const handleAuthError = useCallback(async (err: unknown) => {
    if (authErrorShown.current) return true
    if (authPending || sessionExpiring) return true
    if (err instanceof UnauthenticatedError) {
      if (wasManualLogoutRecently()) {
        authErrorShown.current = true
        return true
      }
      authErrorShown.current = true
      toast.error("Tu sesion ha expirado. Vuelve a iniciar sesion.")
      const path = window.location.pathname
      router.replace(`/login?returnTo=${encodeURIComponent(path)}`)
      return true
    }
    return false
  }, [router, authPending, sessionExpiring])

  // ── Org selector handler ────────────────────────────────────────────────────
  const handleOrganizationChange = useCallback(
    (value: string) => {
      if (!isGlobalSuperAdmin) return
      const trimmed = value.trim()
      if (trimmed.length === 0) {
        setSelectedOrgId(null)
        setTenantSelection({ orgId: null, companyId: null })
        router.refresh()
        return
      }
      const nextId = Number.parseInt(trimmed, 10)
      if (!Number.isFinite(nextId)) {
        toast.error("Identificador de organizacion invalido.")
        return
      }
      const target = organizations.find((org) => org.id === nextId) ?? null
      const nextCompanyId = target?.companies?.[0]?.id ?? null
      setSelectedOrgId(nextId)
      setTenantSelection({ orgId: nextId, companyId: nextCompanyId })
      router.refresh()
    },
    [isGlobalSuperAdmin, organizations, router],
  )

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authPending || sessionExpiring || !userRole) return
    let cancelled = false

    async function bootstrap() {
      try {
        const allowedRoles = ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "ADMIN", "EMPLOYEE"]
        const normalizedUserRole = userRole!.trim().toUpperCase()
        if (!allowedRoles.includes(normalizedUserRole)) {
          router.push("/unauthorized")
          return
        }
        if (normalizedUserRole === "SUPER_ADMIN_GLOBAL") {
          setOrganizationsLoading(true)
          try {
            const orgList = await listOrganizations()
            if (cancelled) return
            setOrganizations(orgList)
            const stored = await getTenantSelection()
            const resolvedOrg =
              stored.orgId != null && orgList.some((org) => org.id === stored.orgId)
                ? stored.orgId
                : orgList[0]?.id ?? null
            let resolvedCompany: number | null = null
            if (resolvedOrg != null) {
              const target = orgList.find((org) => org.id === resolvedOrg)
              resolvedCompany =
                target?.companies?.some((c) => c.id === stored.companyId) === true
                  ? stored.companyId
                  : target?.companies?.[0]?.id ?? null
            }
            setSelectedOrgId(resolvedOrg)
            setTenantSelection({ orgId: resolvedOrg, companyId: resolvedCompany })
          } catch {
            if (!cancelled) {
              toast.error("No se pudieron cargar las organizaciones disponibles.")
              setOrganizations([])
              setSelectedOrgId(null)
              clearTenantSelection()
            }
          } finally {
            if (!cancelled) setOrganizationsLoading(false)
          }
        } else {
          const stored = await getTenantSelection()
          setSelectedOrgId(stored.orgId ?? null)
        }
      } catch {
        toast.error("No se pudo inicializar el panel de control.")
      } finally {
        if (!cancelled) setBootstrapReady(true)
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [router, userRole, authPending, sessionExpiring])

  // Sync org selection from context
  useEffect(() => {
    if (!bootstrapReady || userRole === null) return
    if (selection.orgId !== selectedOrgId) {
      setSelectedOrgId(selection.orgId ?? null)
    }
  }, [bootstrapReady, selection.orgId, selectedOrgId, userRole])

  // ── Core data query (KPIs, sparklines, activity feed) ───────────────────────
  const coreEnabled =
    bootstrapReady &&
    !authPending &&
    !sessionExpiring &&
    userRole !== null &&
    dashboardRole !== "employee" &&
    !(isGlobalSuperAdmin && (organizationsLoading || organizations.length === 0 || selectedOrgId == null))

  type CoreData = {
    kpiValues: KPIValue[]
    sparklines: DashboardSparklines
    recentActivity: ActivityItem[]
  }

  const coreQuery = useQuery<CoreData>({
    queryKey: [...queryKeys.dashboard.root(selection.orgId, selection.companyId), "core", vertical],
    queryFn: async () => {
      const canInventory = checkPermission("inventory")
      const canSales = checkPermission("sales")
      const shouldFetchOverview = canInventory || canSales
      const normalizedVertical = vertical.trim().toUpperCase()

      const [ordersOverview, overviewData, sparklineData, gymData, legalData, restaurantData] = await Promise.all([
        canSales
          ? getOrdersDashboardOverview({ status: "PENDING", limit: 10 })
          : Promise.resolve(null),
        shouldFetchOverview
          ? fetchDashboardOverview()
          : Promise.resolve({
              inventoryTotals: [],
              lowStock: [],
              recentSales: [],
              recentEntries: [],
              monthlySales: { total: 0, growth: null },
            }),
        permissions.showSparklines
          ? fetchDashboardSparklines(30)
          : Promise.resolve({ inventory: [], sales: [], outOfStock: [], pendingOrders: [] }),
        normalizedVertical === "GYM"
          ? getGymOverview().catch((e) => { console.warn("GYM dashboard data unavailable, showing zeros:", e); return null })
          : Promise.resolve(null),
        normalizedVertical === "LAW_FIRM"
          ? getLegalStats().catch((e) => { console.warn("Legal dashboard data unavailable, showing zeros:", e); return null })
          : Promise.resolve(null),
        normalizedVertical === "RESTAURANTS"
          ? getRestaurantDashboardSummary().catch((e) => { console.warn("Restaurant dashboard data unavailable, showing zeros:", e); return null })
          : Promise.resolve(null),
      ])

      const safeLowStock = Array.isArray(overviewData?.lowStock) ? overviewData.lowStock : []

      const values = buildKPIValues({
        config,
        overviewData,
        ordersOverview,
        canSales,
        normalizedVertical,
        safeLowStock,
        gymData,
        legalData,
        restaurantData,
      })

      const activities = buildActivityFeed({ ordersOverview, overviewData, safeLowStock })

      return { kpiValues: values, sparklines: sparklineData, recentActivity: activities }
    },
    enabled: coreEnabled,
  })

  // Handle auth errors from core query
  useEffect(() => {
    if (coreQuery.error) {
      handleAuthError(coreQuery.error).then((handled) => {
        if (!handled && !authPending && !sessionExpiring) {
          console.error("Error cargando datos:", coreQuery.error)
          toast.error("No se pudo cargar la informacion del dashboard.")
        }
      })
    }
  }, [coreQuery.error, handleAuthError, authPending, sessionExpiring])

  // ── Financial data query (accounting summary + health score) ────────────────
  const financialQuery = useQuery<{ accountingSummary: AccountingSummary; healthScore: HealthScoreData } | null>({
    queryKey: [...queryKeys.dashboard.root(selection.orgId, selection.companyId), "financial"],
    queryFn: async () => {
      const [summaryData, healthData] = await Promise.all([
        fetchAccountingSummary(),
        fetchHealthScore(),
      ])
      return { accountingSummary: summaryData, healthScore: healthData }
    },
    enabled: coreEnabled && permissions.showFinancialSummary,
  })

  // ── Employee KPI query ──────────────────────────────────────────────────────
  const employeeKPIsEnabled =
    bootstrapReady &&
    !authPending &&
    !sessionExpiring &&
    userRole !== null &&
    permissions.showEmployeeKPIs

  const employeeKPIQuery = useQuery<EmployeeKPIData>({
    queryKey: [
      ...queryKeys.dashboard.root(selection.orgId, selection.companyId),
      "employee-kpis",
      employeeKPIPeriod,
    ],
    queryFn: () => fetchEmployeeKPIs(employeeKPIPeriod),
    enabled: employeeKPIsEnabled,
  })

  // ── Derive values from queries ─────────────────────────────────────────────
  const kpiValues = coreQuery.data?.kpiValues ?? []
  const sparklines = coreQuery.data?.sparklines ?? { inventory: [], sales: [], outOfStock: [], pendingOrders: [] }
  const recentActivity = coreQuery.data?.recentActivity ?? []
  const accountingSummary = financialQuery.data?.accountingSummary ?? null
  const healthScore = financialQuery.data?.healthScore ?? null

  // loading = true while bootstrap runs OR while core query is fetching
  const loading =
    !bootstrapReady ||
    (coreEnabled && coreQuery.isLoading) ||
    (employeeKPIsEnabled && employeeKPIQuery.isLoading)
  const financialLoading = coreEnabled && permissions.showFinancialSummary && financialQuery.isLoading
  const employeeKPIsLoading = employeeKPIsEnabled && employeeKPIQuery.isFetching

  return {
    loading,
    dashboardRole,
    permissions,
    config,
    vertical,
    kpiValues,
    accountingSummary,
    healthScore,
    financialLoading,
    recentActivity,
    sparklines,
    employeeKPIs: employeeKPIQuery.data ?? null,
    employeeKPIPeriod,
    setEmployeeKPIPeriod,
    employeeKPIsLoading,
    organizations,
    selectedOrgId,
    organizationsLoading,
    handleOrganizationChange,
  }
}
