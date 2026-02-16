"use client"

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { VerticalMetricsResponse } from "./tenancy.api"

interface VerticalChartsProps {
  metrics: VerticalMetricsResponse
}

const VERTICAL_COLORS: Record<string, string> = {
  GENERAL: "#64748b",
  RESTAURANTS: "#f97316",
  RETAIL: "#3b82f6",
  SERVICES: "#a855f7",
  MANUFACTURING: "#f59e0b",
  COMPUTERS: "#06b6d4",
}

const SUCCESS_COLORS = {
  success: "#10b981",
  failed: "#ef4444",
}

const getVerticalLabel = (vertical: string) => {
  const labels: Record<string, string> = {
    GENERAL: "General",
    RESTAURANTS: "Restaurantes",
    RETAIL: "Retail",
    SERVICES: "Servicios",
    MANUFACTURING: "Manufactura",
    COMPUTERS: "Computación",
  }
  return labels[vertical] || vertical
}

export function VerticalCharts({ metrics }: VerticalChartsProps) {
  // Migration Progress Data
  const progressData = [
    {
      name: "Migrados",
      value: metrics.migration.migrated,
      fill: "#10b981",
    },
    {
      name: "Pendientes",
      value: metrics.migration.legacy,
      fill: "#f59e0b",
    },
  ]

  // Success Rate Data
  const successRateData = [
    {
      name: "Exitosos",
      value: metrics.statistics.successfulChanges,
      fill: SUCCESS_COLORS.success,
    },
    {
      name: "Fallidos",
      value: metrics.statistics.failedChanges,
      fill: SUCCESS_COLORS.failed,
    },
  ]

  // Recent History Timeline Data
  const timelineData = metrics.recentHistory
    .slice()
    .reverse()
    .map((entry, index) => ({
      name: `#${index + 1}`,
      from: entry.oldVertical,
      to: entry.newVertical,
      success: entry.success ? 1 : 0,
      date: new Date(entry.createdAt).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
      }),
    }))

  // Count vertical distribution in recent history
  const verticalDistribution = metrics.recentHistory.reduce(
    (acc, entry) => {
      acc[entry.newVertical] = (acc[entry.newVertical] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const distributionData = Object.entries(verticalDistribution).map(([vertical, count]) => ({
    name: getVerticalLabel(vertical),
    value: count,
    fill: VERTICAL_COLORS[vertical] || VERTICAL_COLORS.GENERAL,
  }))

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Migration Progress Pie Chart */}
      {metrics.migration.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Progreso de Migración</CardTitle>
            <CardDescription>Productos migrados vs pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={progressData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {progressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Success Rate Bar Chart */}
      {metrics.statistics.totalChanges > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
            <CardDescription>Cambios exitosos vs fallidos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={successRateData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {successRateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Timeline of Changes */}
      {metrics.recentHistory.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Línea de Tiempo de Cambios</CardTitle>
            <CardDescription>Últimos {metrics.recentHistory.length} cambios cronológicos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  domain={[0, 1]}
                  ticks={[0, 1]}
                  tickFormatter={(value) => (value === 1 ? "Éxito" : "Fallo")}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <p className="text-xs font-medium">{data.date}</p>
                        <p className="text-xs text-muted-foreground">
                          {getVerticalLabel(data.from)} → {getVerticalLabel(data.to)}
                        </p>
                        <p className={`text-xs font-semibold ${data.success ? "text-emerald-600" : "text-rose-600"}`}>
                          {data.success ? "Exitoso" : "Fallido"}
                        </p>
                      </div>
                    )
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="success"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Vertical Distribution */}
      {distributionData.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribución de Verticales</CardTitle>
            <CardDescription>
              Verticales usados en los últimos {metrics.recentHistory.length} cambios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={distributionData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
