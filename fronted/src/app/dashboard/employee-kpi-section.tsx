"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ShoppingCart,
  DollarSign,
  Receipt,
  Package,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import type {
  EmployeeKPIData,
  EmployeeKPIPeriod,
} from "@/lib/dashboard/overview"

// ── Period selector ──────────────────────────────────────────────────────

const PERIODS: { value: EmployeeKPIPeriod; label: string }[] = [
  { value: "month", label: "Mes" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Anual" },
]

function PeriodTabs({
  value,
  onChange,
}: {
  value: EmployeeKPIPeriod
  onChange: (p: EmployeeKPIPeriod) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
            value === p.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ── Growth badge ─────────────────────────────────────────────────────────

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">--</span>

  const rounded = Math.round(value * 10) / 10
  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3 flex-shrink-0" /> 0%
      </span>
    )
  }
  if (rounded > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="h-3 w-3 flex-shrink-0" /> +{rounded}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
      <TrendingDown className="h-3 w-3 flex-shrink-0" /> {rounded}%
    </span>
  )
}

// ── KPI mini card ────────────────────────────────────────────────────────

function KPIMiniCard({
  icon: Icon,
  label,
  value,
  growth,
  color,
  delay,
}: {
  icon: typeof ShoppingCart
  label: string
  value: string
  growth: number | null
  color: string
  delay: number
}) {
  return (
    <div
      className="rounded-xl border bg-card p-4 space-y-2 w-full min-w-0 overflow-hidden animate-kpi-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between w-full min-w-0">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`rounded-full p-1.5 ${color}`}>
          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight break-words">{value}</p>
      <GrowthBadge value={growth} />
    </div>
  )
}

// ── Monthly chart ────────────────────────────────────────────────────────

function MonthlyChart({ data }: { data: EmployeeKPIData["monthlySeries"] }) {
  const chartData = useMemo(
    () =>
      data.map((d) => {
        const [, m] = d.month.split("-")
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        return {
          name: monthNames[parseInt(m, 10) - 1] ?? m,
          revenue: d.revenue,
          sales: d.salesCount,
        }
      }),
    [data],
  )

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        Sin datos para mostrar
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="empRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(val: number, name: string) => [
            name === "revenue" ? `S/. ${val.toFixed(2)}` : val,
            name === "revenue" ? "Ingresos" : "Ventas",
          ]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#empRevGrad)"
          dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Top products bar chart ───────────────────────────────────────────────

const BAR_COLORS = ["#3b82f6", "#60a5fa", "#93bbfd", "#bfdbfe", "#dbeafe"]

function TopProductsChart({ data }: { data: EmployeeKPIData["topProducts"] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">
        Sin ventas en este periodo
      </div>
    )
  }

  const chartData = data.map((p) => ({
    name: p.productName.length > 18 ? p.productName.slice(0, 16) + "..." : p.productName,
    fullName: p.productName,
    quantity: p.quantity,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(val: number) => [`${val} unidades`, "Vendidas"]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
        />
        <Bar dataKey="quantity" radius={[0, 4, 4, 0]} barSize={20}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Ranking card ─────────────────────────────────────────────────────────

function RankingCard({ ranking }: { ranking: EmployeeKPIData["ranking"] }) {
  const progress =
    ranking.topSellerRevenue > 0
      ? Math.min((ranking.myRevenue / ranking.topSellerRevenue) * 100, 100)
      : 0

  return (
    <div className="flex items-center gap-4 w-full min-w-0">
      <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2.5 flex-shrink-0">
        <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between w-full min-w-0">
          <span className="text-sm font-medium">
            Posicion #{ranking.position}
            <span className="text-muted-foreground font-normal"> de {ranking.totalSellers}</span>
          </span>
          <Badge
            variant="outline"
            className={`text-xs flex-shrink-0 ${
              ranking.position === 1
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : ranking.position <= 3
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : ""
            }`}
          >
            {ranking.position === 1
              ? "Top vendedor"
              : ranking.position <= 3
                ? "Top 3"
                : `Top ${Math.round((ranking.position / ranking.totalSellers) * 100)}%`}
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          S/. {ranking.myRevenue.toFixed(2)} de S/. {ranking.topSellerRevenue.toFixed(2)} (lider)
        </p>
      </div>
    </div>
  )
}

// ── Period label helper ──────────────────────────────────────────────────

function getPeriodLabel(period: EmployeeKPIPeriod): string {
  switch (period) {
    case "quarter":
      return "este trimestre"
    case "year":
      return "este ano"
    default:
      return "este mes"
  }
}

// ── Main component ───────────────────────────────────────────────────────

interface EmployeeKPISectionProps {
  data: EmployeeKPIData
  period: EmployeeKPIPeriod
  onPeriodChange: (p: EmployeeKPIPeriod) => void
}

export function EmployeeKPISection({
  data,
  period,
  onPeriodChange,
}: EmployeeKPISectionProps) {
  const { currentPeriod, growth, monthlySeries, ranking, topProducts } = data
  const periodLabel = getPeriodLabel(period)

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Tus logros en ventas</h3>
          <p className="text-sm text-muted-foreground">
            Rendimiento {periodLabel}
          </p>
        </div>
        <PeriodTabs value={period} onChange={onPeriodChange} />
      </div>

      {/* KPI cards grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 w-full min-w-0">
        <KPIMiniCard
          icon={ShoppingCart}
          label="Ventas"
          value={String(currentPeriod.salesCount)}
          growth={growth.salesCount}
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          delay={0}
        />
        <KPIMiniCard
          icon={DollarSign}
          label="Ingresos"
          value={`S/. ${currentPeriod.totalRevenue.toFixed(2)}`}
          growth={growth.totalRevenue}
          color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          delay={50}
        />
        <KPIMiniCard
          icon={Receipt}
          label="Ticket Prom."
          value={`S/. ${currentPeriod.avgTicket.toFixed(2)}`}
          growth={growth.avgTicket}
          color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          delay={100}
        />
        <KPIMiniCard
          icon={Package}
          label="Items vendidos"
          value={String(currentPeriod.itemsSold)}
          growth={growth.itemsSold}
          color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
          delay={150}
        />
      </div>

      {/* Ranking */}
      {ranking.totalSellers > 0 && (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardContent className="py-4 px-4">
            <RankingCard ranking={ranking} />
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-5 w-full min-w-0">
        {/* Monthly revenue chart — 3/5 */}
        <Card className="lg:col-span-3 w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium">Ventas mensuales</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <MonthlyChart data={monthlySeries} />
          </CardContent>
        </Card>

        {/* Top products — 2/5 */}
        <Card className="lg:col-span-2 w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium">Top productos vendidos</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <TopProductsChart data={topProducts} />
          </CardContent>
        </Card>
      </div>

      <Separator />
    </div>
  )
}
