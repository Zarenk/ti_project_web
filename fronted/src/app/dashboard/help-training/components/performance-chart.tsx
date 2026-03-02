"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Area,
  Line,
  LineChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, BarChart3 } from "lucide-react"
import type { PerformanceMetrics } from "../help-training.api"

interface PerformanceChartProps {
  performance: PerformanceMetrics | null
}

const SOURCE_COLORS: Record<string, string> = {
  static: "#3b82f6",
  promoted: "#10b981",
  ai: "#8b5cf6",
  fallback: "#f59e0b",
}

const SOURCE_LABELS: Record<string, string> = {
  static: "Knowledge Base",
  promoted: "Promovido",
  ai: "IA Generativa",
  fallback: "Fallback",
}

export function PerformanceChart({ performance }: PerformanceChartProps) {
  if (!performance) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <p>Sin datos de rendimiento disponibles</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Percentile summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total consultas</p>
            <p className="text-2xl font-bold">{performance.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">p50 (mediana)</p>
            <p className="text-2xl font-bold">{performance.p50}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">p95</p>
            <p className="text-2xl font-bold text-amber-600">
              {performance.p95}ms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">p99</p>
            <p className="text-2xl font-bold text-red-600">
              {performance.p99}ms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latency chart */}
      {performance.dailyStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Latencia diaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={performance.dailyStats}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  style={{ fontSize: "12px" }}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <p className="text-xs font-medium">{d.date}</p>
                          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <span className="text-muted-foreground">
                              Promedio
                            </span>
                            <span className="font-medium">{d.avgMs}ms</span>
                            <span className="text-muted-foreground">p50</span>
                            <span className="font-medium">{d.p50}ms</span>
                            <span className="text-muted-foreground">p95</span>
                            <span className="font-medium">{d.p95}ms</span>
                            <span className="text-muted-foreground">
                              Consultas
                            </span>
                            <span className="font-medium">{d.count}</span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="p95"
                  stroke="transparent"
                  fill="rgba(245, 158, 11, 0.1)"
                />
                <Line
                  type="monotone"
                  dataKey="avgMs"
                  strokeWidth={2}
                  stroke="#3b82f6"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Promedio"
                />
                <Line
                  type="monotone"
                  dataKey="p95"
                  strokeWidth={2}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  dot={false}
                  name="p95"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Source distribution */}
      {performance.bySource.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Distribución por fuente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={performance.bySource.map((s) => ({
                  ...s,
                  label: SOURCE_LABELS[s.source] || s.source,
                  fill: SOURCE_COLORS[s.source] || "#6b7280",
                }))}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: "12px" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <p className="text-xs font-medium">{d.label}</p>
                          <div className="mt-1 space-y-0.5 text-xs">
                            <p>
                              Consultas:{" "}
                              <span className="font-medium">{d.count}</span>
                            </p>
                            <p>
                              Promedio:{" "}
                              <span className="font-medium">{d.avgMs}ms</span>
                            </p>
                            <p>
                              Porcentaje:{" "}
                              <span className="font-medium">
                                {d.percentage}%
                              </span>
                            </p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                  {performance.bySource.map((s, i) => (
                    <Cell
                      key={i}
                      fill={SOURCE_COLORS[s.source] || "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Source legend */}
            <div className="mt-3 flex flex-wrap gap-3">
              {performance.bySource.map((s) => (
                <div key={s.source} className="flex items-center gap-1.5">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{
                      backgroundColor:
                        SOURCE_COLORS[s.source] || "#6b7280",
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {SOURCE_LABELS[s.source] || s.source} ({s.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
