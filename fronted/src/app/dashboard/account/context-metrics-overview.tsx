"use client"

import { useEffect, useState, type ReactElement } from "react"
import { Activity, BarChart3, History } from "lucide-react"

import {
  fetchGlobalContextMetrics,
  fetchMyContextMetrics,
  type ContextMetricsResponse,
  type ContextMetricsSummary,
} from "./context-metrics.api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

export function ContextMetricsOverview(): ReactElement {
  const [metrics, setMetrics] = useState<ContextMetricsResponse | null>(null)
  const [globalMetrics, setGlobalMetrics] = useState<ContextMetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { role } = useAuth()
  const isSuperAdmin =
    role === "SUPER_ADMIN_GLOBAL" || role === "SUPER_ADMIN_ORG"

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [userMetrics, globalSummary] = await Promise.allSettled([
          fetchMyContextMetrics(),
          isSuperAdmin ? fetchGlobalContextMetrics() : Promise.resolve(null),
        ])

        if (cancelled) return

        if (userMetrics.status === "fulfilled") {
          setMetrics(userMetrics.value)
        } else {
          throw userMetrics.reason
        }

        if (globalSummary.status === "fulfilled") {
          setGlobalMetrics(globalSummary.value)
        } else if (globalSummary.status === "rejected" && isSuperAdmin) {
          console.warn("[context-metrics] global summary failed", globalSummary.reason)
        }
      } catch (err) {
        console.error("[context-metrics] failed to load", err)
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las métricas de contexto",
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin])

  if (loading) {
    return <MetricsSkeleton />
  }

  if (error || !metrics) {
    return (
      <Card className="border-rose-200/60 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/40">
        <CardHeader>
          <CardTitle className="text-base">Métricas de contexto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-rose-700 dark:text-rose-200">
            {error ?? "No se pudieron obtener las métricas de contexto."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actividad personal</CardTitle>
          <History className="size-4 text-slate-500" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <Metric value={metrics.totalSelections} label="Total registros" />
            <Metric value={metrics.selectionsLast30Days} label="Últimos 30 días" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <Metric
              value={metrics.preferenceCount}
              label="Contextos preferidos"
            />
            <Metric
              value={metrics.topOrganizations[0]?.count ?? 0}
              label="Top organización usos"
            />
          </div>
          <div className="rounded-lg border bg-slate-50 p-3 text-left text-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs uppercase text-slate-500">Última selección</p>
            {metrics.lastSelection ? (
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {metrics.lastSelection.orgName ?? `Org ${metrics.lastSelection.orgId}`}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {metrics.lastSelection.companyName ?? "Sin empresa"} ·{" "}
                  {new Date(metrics.lastSelection.createdAt).toLocaleString("es-ES", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Sin registros aún.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Preferencias frecuentes</CardTitle>
          <Activity className="size-4 text-slate-500" />
        </CardHeader>
        <CardContent className="space-y-4">
          <TopList
            title="Organizaciones más usadas"
            items={metrics.topOrganizations}
            fallback="Sin datos todavía"
          />
          <TopList
            title="Empresas favoritas"
            items={metrics.topCompanies}
            fallback="Sin empresas registradas"
          />
          <TopList
            title="Dispositivos recientes"
            items={metrics.deviceBreakdown.map((item) => ({
              ...item,
              name: item.name ?? item.id ?? "Desconocido",
            }))}
            fallback="Sin información de dispositivo"
          />
        </CardContent>
      </Card>

      {isSuperAdmin && globalMetrics ? (
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resumen global</CardTitle>
            <BarChart3 className="size-4 text-slate-500" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <Metric value={globalMetrics.totalSelections} label="Registros totales" />
              <Metric value={globalMetrics.selectionsLast24h} label="Últimas 24h" />
              <Metric value={globalMetrics.uniqueUsers} label="Usuarios activos" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TopList
                title="Organizaciones más activas"
                items={globalMetrics.topOrganizations}
                fallback="Sin actividad registrada"
              />
              <TopList
                title="Empresas con más cambios"
                items={globalMetrics.topCompanies}
                fallback="Sin actividad registrada"
              />
            </div>
            {globalMetrics.throttleStats ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-950/40">
                <p className="text-xs uppercase text-amber-700 dark:text-amber-200">
                  Alertas de rate limit
                </p>
                <div className="mt-2 grid grid-cols-3 gap-3 text-center text-slate-800 dark:text-slate-50">
                  <div>
                    <p className="text-xl font-semibold">{globalMetrics.throttleStats.totalHits}</p>
                    <p className="text-[11px] uppercase text-slate-500">Histórico</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{globalMetrics.throttleStats.lastHourHits}</p>
                    <p className="text-[11px] uppercase text-slate-500">Última hora</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">
                      {globalMetrics.throttleStats.topUsers[0]?.hits ?? 0}
                    </p>
                    <p className="text-[11px] uppercase text-slate-500">Máx. usuario</p>
                  </div>
                </div>
                {globalMetrics.throttleStats.topUsers.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {globalMetrics.throttleStats.topUsers.map((user) => (
                      <li key={`throttle-user-${user.userId}`} className="flex justify-between">
                        <span>Usuario #{user.userId}</span>
                        <span className="font-semibold">{user.hits} hits</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs uppercase text-slate-500">{label}</p>
    </div>
  )
}

function TopList({
  title,
  items,
  fallback,
}: {
  title: string
  items: Array<{ id: number | string | null; name?: string | null; count: number }>
  fallback: string
}) {
  return (
    <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
      <p className="mb-2 text-xs uppercase text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">{fallback}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li
              key={`${title}-${item.id ?? item.name ?? "unknown"}`}
              className={cn(
                "flex items-center justify-between rounded-md bg-slate-50/70 px-3 py-1.5 dark:bg-slate-900/40",
              )}
            >
              <span className="truncate">{item.name ?? `ID ${item.id}`}</span>
              <span className="font-semibold">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={`metrics-skeleton-${index}`}>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((__, idx) => (
              <Skeleton key={idx} className="h-12 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
