"use client"

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

type DailyPoint = {
  date: string
  displayDate: string
  total: number
}

type BreakdownEntry = {
  name: string
  value: number
}

type HeatmapEntry = {
  dow: number
  hour: number
  count: number
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

export function UserActivityCharts({
  daily,
  actions,
  entities,
  severity,
  heatmap,
  loading,
}: {
  daily: DailyPoint[]
  actions: BreakdownEntry[]
  entities: BreakdownEntry[]
  severity: BreakdownEntry[]
  heatmap: HeatmapEntry[]
  loading: boolean
}) {
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
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Actividad diaria</p>
        <div className="mt-4 h-[220px]">
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin datos para el usuario. Ajusta los filtros.
            </p>
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
          {entities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin datos para el usuario. Ajusta los filtros.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entities} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
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
        <p className="text-sm font-medium">Acciones del usuario</p>
        <div className="mt-4 h-[220px]">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin datos para el usuario. Ajusta los filtros.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={actions}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  stroke="transparent"
                >
                  {actions.map((entry, index) => (
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium">Severidad de movimientos</p>
          <div className="mt-4 h-[220px]">
            {severity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin datos para la severidad.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severity}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    stroke="transparent"
                  >
                    {severity.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as { name: string; value: number }
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <p className="text-xs uppercase text-muted-foreground">Severidad</p>
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

        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium">Tiempos pico</p>
          <div className="mt-4">
            {heatmap.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin datos para tiempos pico.
              </p>
            ) : (
              <HeatmapGrid data={heatmap} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function HeatmapGrid({ data }: { data: HeatmapEntry[] }) {
  const dayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]
  const byKey = new Map<string, number>()
  let maxCount = 0

  data.forEach((entry) => {
    const key = `${entry.dow}-${entry.hour}`
    byKey.set(key, entry.count)
    if (entry.count > maxCount) maxCount = entry.count
  })

  return (
    <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 text-[10px]">
      <div />
      {Array.from({ length: 24 }).map((_, hour) => (
        <div key={`hour-${hour}`} className="text-center text-muted-foreground">
          {hour}
        </div>
      ))}
      {dayLabels.map((label, dayIndex) => (
        <div key={`row-${label}`} className="contents">
          <div className="pr-2 text-xs text-muted-foreground">{label}</div>
          {Array.from({ length: 24 }).map((_, hour) => {
            const count = byKey.get(`${dayIndex}-${hour}`) ?? 0
            const opacity = maxCount > 0 ? Math.max(0.08, count / maxCount) : 0.08
            return (
              <div
                key={`cell-${dayIndex}-${hour}`}
                title={`${label} ${hour}:00 - ${count} movimientos`}
                className="h-4 rounded-sm border"
                style={{ backgroundColor: `rgba(34,197,94,${opacity})` }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
