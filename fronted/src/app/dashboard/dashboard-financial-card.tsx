"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts"
import { Banknote, Package, Receipt, TrendingUp, Heart } from "lucide-react"
import type { AccountingSummary } from "@/lib/accounting/types"
import type { HealthScoreData } from "./accounting/accounting-analytics.api"
import Link from "next/link"

// ── Health dot colors ─────────────────────────────────────────────────────────

const HEALTH_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  EXCELENTE: { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  BUENO: { bg: "bg-blue-100 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  "ATENCIÓN": { bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  "CRÍTICO": { bg: "bg-red-100 dark:bg-red-950/40", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
}

// ── Mini sparkline ────────────────────────────────────────────────────────────

function MiniSparkline({ data, color }: { data: { date: string; value: number }[]; color: string }) {
  if (data.length < 2) return null
  return (
    <div className="h-8 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`miniGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#miniGrad-${color})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Metric tile ───────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  growth,
  sparklineData,
  sparklineColor,
  icon,
  detail,
}: {
  label: string
  value: string
  growth?: number | null
  sparklineData?: { date: string; value: number }[]
  sparklineColor?: string
  icon: React.ReactNode
  detail?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-lg font-bold tabular-nums truncate">{value}</div>
      <div className="flex items-center gap-1.5 text-xs min-w-0">
        {growth != null && (
          <span className={growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
            {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
          </span>
        )}
        {detail && <span className="text-muted-foreground truncate">{detail}</span>}
      </div>
      {sparklineData && sparklineColor && (
        <MiniSparkline data={sparklineData} color={sparklineColor} />
      )}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function FinancialSkeleton() {
  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-3 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function FinancialEmpty() {
  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="rounded-full bg-muted p-3 mb-3">
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Sin datos financieros aun</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Registra tu primera venta para ver el resumen financiero
        </p>
        <Link
          href="/dashboard/sales/new"
          className="mt-3 text-xs text-primary hover:underline cursor-pointer"
        >
          Crear primera venta
        </Link>
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface DashboardFinancialCardProps {
  summary: AccountingSummary | null
  healthScore: HealthScoreData | null
  loading: boolean
  vertical?: string
}

export function DashboardFinancialCard({
  summary,
  healthScore,
  loading,
  vertical,
}: DashboardFinancialCardProps) {
  if (loading) return <FinancialSkeleton />

  // Empty state: no data at all
  const hasData = summary && (
    summary.cashAvailable > 0 ||
    summary.inventoryValue > 0 ||
    summary.netProfit !== 0 ||
    summary.taxesPending > 0
  )

  if (!hasData) return <FinancialEmpty />

  const healthStatus = healthScore?.status ?? null
  const healthColors = healthStatus ? HEALTH_COLORS[healthStatus] ?? HEALTH_COLORS["BUENO"] : null

  const isLawFirm = vertical?.trim().toUpperCase() === "LAW_FIRM"

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Resumen Financiero</CardTitle>
          {healthColors && healthScore && (
            <Link
              href="/dashboard/accounting/salud"
              className="cursor-pointer"
            >
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${healthColors.bg} ${healthColors.text}`}>
                <Heart className="h-3 w-3" />
                <span>{healthScore.score}/100</span>
              </div>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile
            label={isLawFirm ? "Honorarios cobrados" : "Efectivo disponible"}
            value={`S/. ${formatCompact(summary!.cashAvailable)}`}
            growth={summary!.cashGrowth}
            sparklineData={summary!.sparklines.cash}
            sparklineColor="#34d399"
            icon={<Banknote className="h-3.5 w-3.5 flex-shrink-0" />}
            detail="vs mes anterior"
          />
          {!isLawFirm && (
            <MetricTile
              label="Inventario valorizado"
              value={`S/. ${formatCompact(summary!.inventoryValue)}`}
              growth={summary!.inventoryGrowth}
              sparklineData={summary!.sparklines.inventory}
              sparklineColor="#60a5fa"
              icon={<Package className="h-3.5 w-3.5 flex-shrink-0" />}
              detail="vs mes anterior"
            />
          )}
          {isLawFirm && (
            <MetricTile
              label="Cuentas por cobrar"
              value={`S/. ${formatCompact(summary!.profitBreakdown.revenue - summary!.cashAvailable)}`}
              icon={<Receipt className="h-3.5 w-3.5 flex-shrink-0" />}
              detail="pendiente de cobro"
            />
          )}
          <MetricTile
            label="IGV pendiente"
            value={`S/. ${formatCompact(summary!.taxesPending)}`}
            sparklineData={summary!.sparklines.taxes}
            sparklineColor="#fbbf24"
            icon={<Receipt className="h-3.5 w-3.5 flex-shrink-0" />}
            detail={summary!.daysUntilDue > 0 ? `Vence en ${summary!.daysUntilDue} dias` : "Vencido"}
          />
          <MetricTile
            label="Ganancia del mes"
            value={`S/. ${formatCompact(summary!.netProfit)}`}
            growth={summary!.profitGrowth}
            sparklineData={summary!.sparklines.profit}
            sparklineColor="#a78bfa"
            icon={<TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />}
            detail={`Margen ${summary!.profitMargin.toFixed(1)}%`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${abs.toFixed(2)}`
}
