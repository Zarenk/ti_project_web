"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts"
import { eachDayOfInterval, format } from "date-fns"
import { es } from "date-fns/locale"
import { getActivitySummary, getActivityTimeSeries } from "./history.api"

type SummaryResponse = {
  total: number
  usersActive: number
  byAction: Array<{ action: string | null; count: number }>
  byEntity: Array<{ entityType: string | null; count: number }>
  topUsers: Array<{ actorId: number | null; actorEmail: string | null; count: number }>
  range: { from: string; to: string }
}

type DailyPoint = {
  date: string
  displayDate: string
  total: number
}

const CHART_COLORS = [
  "#22c55e",
  "#0ea5e9",
  "#f97316",
  "#a855f7",
  "#facc15",
  "#ef4444",
  "#14b8a6",
  "#6366f1",
]

const toTitle = (value?: string | null) =>
  (value ?? "Sin dato").toString().replace(/_/g, " ")

export function ActivityCharts({ fallbackFrom, fallbackTo }: { fallbackFrom: Date; fallbackTo: Date }) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [daily, setDaily] = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(false)

  const rangeKey = `${fallbackFrom.toISOString()}-${fallbackTo.toISOString()}`

  useEffect(() => {
    let active = true
    setLoading(true)

    const fetchData = async () => {
      try {
        const [global, series] = await Promise.all([
          getActivitySummary({
            dateFrom: fallbackFrom.toISOString(),
            dateTo: fallbackTo.toISOString(),
            excludeContextUpdates: true,
          }),
          getActivityTimeSeries({
            dateFrom: fallbackFrom.toISOString(),
            dateTo: fallbackTo.toISOString(),
            excludeContextUpdates: true,
          }),
        ])

        if (!active) return
        setSummary(global)

        const interval = eachDayOfInterval({ start: fallbackFrom, end: fallbackTo })
        const dailyPoints = interval.map((date) => ({
          date: format(date, "yyyy-MM-dd"),
          displayDate: format(date, "dd MMM", { locale: es }),
          total: 0,
        }))

        const seriesMap = new Map<string, number>()
        if (Array.isArray(series)) {
          series.forEach((entry: { date: string; count: number }) => {
            if (!entry?.date) return
            seriesMap.set(entry.date.slice(0, 10), Number(entry.count) || 0)
          })
        }
        dailyPoints.forEach((point) => {
          point.total = seriesMap.get(point.date) ?? 0
        })

        setDaily(dailyPoints)
      } catch (error) {
        console.error("Error cargando graficos de actividad:", error)
        if (!active) return
        setSummary(null)
        setDaily([])
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()

    return () => {
      active = false
    }
  }, [rangeKey])

  const actionData = useMemo(
    () =>
      (summary?.byAction ?? [])
        .filter((entry) => entry.count > 0)
        .map((entry) => ({
          name: toTitle(entry.action),
          value: entry.count,
        })),
    [summary],
  )

  const entityData = useMemo(
    () =>
      (summary?.byEntity ?? [])
        .filter((entry) => entry.count > 0)
        .map((entry) => ({
          name: toTitle(entry.entityType),
          value: entry.count,
        })),
    [summary],
  )

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[260px] rounded-lg border" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Movimientos por dia</p>
        <div className="mt-4 h-[220px]">
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos para el periodo.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const found = daily.find((d) => d.date === value)
                    return found?.displayDate ?? value
                  }}
                  style={{ fontSize: "11px" }}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} style={{ fontSize: "11px" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as DailyPoint
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <p className="text-xs uppercase text-muted-foreground">Fecha</p>
                          <p className="font-semibold">{item.displayDate}</p>
                          <p className="mt-1 text-xs uppercase text-muted-foreground">Movimientos</p>
                          <p className="font-semibold">{item.total}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  stroke="#0ea5e9"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Movimientos por modulo</p>
        <div className="mt-4 h-[220px]">
          {entityData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos para el periodo.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entityData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={90}
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: "11px" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as { name: string; value: number }
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <p className="text-xs uppercase text-muted-foreground">Modulo</p>
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs uppercase text-muted-foreground">Movimientos</p>
                          <p className="font-semibold">{item.value}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 4, 4]} fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Acciones del sistema</p>
        <div className="mt-4 h-[220px]">
          {actionData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos para el periodo.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={actionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  stroke="transparent"
                >
                  {actionData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as { name: string; value: number }
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <p className="text-xs uppercase text-muted-foreground">Accion</p>
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs uppercase text-muted-foreground">Movimientos</p>
                          <p className="font-semibold">{item.value}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
