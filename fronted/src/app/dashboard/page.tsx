"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardMetricCard } from "@/components/dashboard-metric-card"
import { DashboardFinancialCard } from "./dashboard-financial-card"
import { DashboardActivityFeed } from "./dashboard-activity-feed"
import { DashboardQuickLinks } from "./dashboard-quick-links"
import { EmployeeKPISection } from "./employee-kpi-section"
import { useDashboardData } from "./use-dashboard-data"

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* KPI cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial + Activity skeleton */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-3 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
        <Card>
          <CardHeader className="space-y-2 pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Super admin org selector ──────────────────────────────────────────────────

function OrgSelector({
  organizations,
  selectedOrgId,
  organizationsLoading,
  onOrganizationChange,
}: {
  organizations: { id: number; name: string }[]
  selectedOrgId: number | null
  organizationsLoading: boolean
  onOrganizationChange: (value: string) => void
}) {
  const selectValue = selectedOrgId != null ? String(selectedOrgId) : ""
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2 w-full min-w-0 overflow-hidden">
      <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
        Organizacion
      </span>
      <Select
        value={selectValue.length > 0 ? selectValue : undefined}
        onValueChange={onOrganizationChange}
        disabled={organizationsLoading || organizations.length === 0}
      >
        <SelectTrigger className="w-full sm:w-[260px] cursor-pointer">
          <SelectValue
            placeholder={
              organizationsLoading ? "Cargando..." : "Selecciona organizacion"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={String(org.id)} className="cursor-pointer">
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function WelcomeDashboard() {
  const data = useDashboardData()

  const {
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
    employeeKPIs,
    employeeKPIPeriod,
    setEmployeeKPIPeriod,
    organizations,
    selectedOrgId,
    organizationsLoading,
    handleOrganizationChange,
  } = data

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return <DashboardSkeleton />
  }

  // ── Employee view: KPIs + quick links ─────────────────────────────────────
  if (dashboardRole === "employee") {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <DashboardQuickLinks vertical={vertical} />

        {/* Employee sales KPIs */}
        {employeeKPIs && (
          <EmployeeKPISection
            data={employeeKPIs}
            period={employeeKPIPeriod}
            onPeriodChange={setEmployeeKPIPeriod}
          />
        )}

        {/* Basic activity feed — no amounts */}
        {recentActivity.length > 0 && (
          <DashboardActivityFeed
            activities={recentActivity}
            showAmounts={false}
            label={config.activityLabel}
          />
        )}
      </div>
    )
  }

  // ── Admin / Super admin view ──────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Org selector for SUPER_ADMIN_GLOBAL */}
      {permissions.showOrgSelector && (organizationsLoading || organizations.length > 0) && (
        <OrgSelector
          organizations={organizations}
          selectedOrgId={selectedOrgId}
          organizationsLoading={organizationsLoading}
          onOrganizationChange={handleOrganizationChange}
        />
      )}

      {/* Greeting */}
      <div>
        <h2 className="text-lg font-semibold">{config.greeting}</h2>
        <p className="text-sm text-muted-foreground">
          Resumen general de tu negocio
        </p>
      </div>

      {/* KPI metric cards — vertical-aware */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {config.kpis.map((kpi, i) => {
          const kpiValue = kpiValues.find((v) => v.key === kpi.key)
          const Icon = kpi.icon
          return (
            <Link key={kpi.key} href={kpi.href} prefetch={false} className="block">
              <DashboardMetricCard
                title={kpi.title}
                icon={<Icon className="h-4 w-4" />}
                value={kpiValue?.value ?? 0}
                subtitle={kpiValue?.subtitle ?? ""}
                data={kpi.sparklineKey ? sparklines[kpi.sparklineKey] : []}
                color={kpi.color}
              />
            </Link>
          )
        })}
      </div>

      {/* Financial summary + Activity feed */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Financial summary — 2/3 width */}
        {permissions.showFinancialSummary && (
          <div className="lg:col-span-2">
            <DashboardFinancialCard
              summary={accountingSummary}
              healthScore={healthScore}
              loading={financialLoading}
              vertical={vertical}
            />
          </div>
        )}

        {/* Activity feed — 1/3 width (or full if no financial) */}
        <div className={permissions.showFinancialSummary ? "" : "lg:col-span-3"}>
          <DashboardActivityFeed
            activities={recentActivity}
            showAmounts={permissions.showActivityWithAmounts}
            label={config.activityLabel}
          />
        </div>
      </div>
    </div>
  )
}
