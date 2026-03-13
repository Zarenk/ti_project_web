"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  Activity,
  Crown,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import { fetchGlobalOverview, type GlobalOverview } from "./admin-dashboard.api"

const VERTICAL_LABELS: Record<string, string> = {
  GENERAL: "General",
  RESTAURANTS: "Restaurantes",
  RETAIL: "Retail",
  SERVICES: "Servicios",
  MANUFACTURING: "Manufactura",
  COMPUTERS: "Computación",
  LAW_FIRM: "Abogados",
  GYM: "Gimnasio",
}

const VERTICAL_COLORS: Record<string, string> = {
  GENERAL: "bg-slate-500",
  RESTAURANTS: "bg-orange-500",
  RETAIL: "bg-blue-500",
  SERVICES: "bg-emerald-500",
  MANUFACTURING: "bg-violet-500",
  COMPUTERS: "bg-cyan-500",
  LAW_FIRM: "bg-amber-600",
  GYM: "bg-rose-500",
}

export function AdminOverviewTab({ enabled }: { enabled: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminDashboard.globalOverview(),
    queryFn: fetchGlobalOverview,
    enabled,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const totalSubs = data.subscriptions.trial + data.subscriptions.active + data.subscriptions.pastDue + data.subscriptions.canceled

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={Building2} label="Organizaciones" value={data.totalOrgs} sub={`${data.activeOrgs} activas`} />
        <MetricCard icon={Users} label="Usuarios" value={data.totalUsers} sub={`${data.activeUsersLast7d} activos (7d)`} />
        <MetricCard icon={Briefcase} label="Empresas" value={data.totalCompanies} />
        <MetricCard icon={TrendingUp} label="Nuevas orgs (mes)" value={data.newOrgsThisMonth} sub={`+${data.newUsersThisMonth} usuarios`} accent />
      </div>

      <div className="grid gap-4 md:grid-cols-2 w-full min-w-0">
        {/* Subscription breakdown */}
        <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Estado de Suscripciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SubBar label="Trial" count={data.subscriptions.trial} total={totalSubs} color="bg-blue-500" />
            <SubBar label="Activas" count={data.subscriptions.active} total={totalSubs} color="bg-emerald-500" />
            <SubBar label="Mora" count={data.subscriptions.pastDue} total={totalSubs} color="bg-amber-500" />
            <SubBar label="Canceladas" count={data.subscriptions.canceled} total={totalSubs} color="bg-red-500" />
          </CardContent>
        </Card>

        {/* Vertical breakdown */}
        <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Empresas por Vertical
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.verticalBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              data.verticalBreakdown
                .sort((a, b) => b.count - a.count)
                .map((v) => {
                  const maxCount = Math.max(...data.verticalBreakdown.map((x) => x.count))
                  return (
                    <div key={v.vertical} className="flex items-center gap-3 w-full min-w-0">
                      <div className={cn("h-2 w-2 rounded-full flex-shrink-0", VERTICAL_COLORS[v.vertical] ?? "bg-gray-400")} />
                      <span className="text-xs flex-1 min-w-0 truncate">
                        {VERTICAL_LABELS[v.vertical] ?? v.vertical}
                      </span>
                      <div className="w-24 flex-shrink-0">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", VERTICAL_COLORS[v.vertical] ?? "bg-gray-400")}
                            style={{ width: `${(v.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold tabular-nums w-8 text-right flex-shrink-0">{v.count}</span>
                    </div>
                  )
                })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Building2
  label: string
  value: number
  sub?: string
  accent?: boolean
}) {
  return (
    <Card className={cn("border shadow-sm transition-all duration-300 hover:shadow-md", accent && "border-primary/30 bg-primary/5")}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">{value.toLocaleString("es-PE")}</p>
          </div>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {sub && <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function SubBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3 w-full min-w-0">
      <span className="text-xs w-20 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 min-w-0">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right flex-shrink-0">{count}</span>
    </div>
  )
}
