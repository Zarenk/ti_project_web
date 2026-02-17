"use client"

import { useTenantSelection } from "@/context/tenant-selection-context"
import { useEffect, useMemo, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { getRevenueByCategoryByRange } from "../sales.api"
import { DateRange } from "react-day-picker"
import { endOfDay } from "date-fns"
import { useTheme } from "next-themes"

// Paleta ampliada de 12 colores bien diferenciados
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#FF6B9D", "#00D4AA", "#FFD93D", "#6C5CE7", "#A8E6CF",
  "#FF8A80", "#82B1FF",
]

const OTHERS_COLOR = "#6B7280"

/** Umbral mínimo para mostrar como categoría individual (%) */
const MIN_PERCENT_THRESHOLD = 2

interface CategoryItem {
  name: string
  value: number
  percent: string
}

export function RevenueByCategory({ dateRange }: { dateRange: DateRange }) {
  const [rawData, setRawData] = useState<CategoryItem[]>([])
  const { theme } = useTheme()
  const { selection, version } = useTenantSelection()
  const selectionKey = useMemo(
    () => `${selection.orgId ?? "none"}-${selection.companyId ?? "none"}-${version}`,
    [selection.orgId, selection.companyId, version],
  )

  useEffect(() => {
    async function fetchData() {
      try {
        if (!dateRange?.from || !dateRange?.to) return

        const from = dateRange.from.toISOString()
        const to = endOfDay(dateRange.to).toISOString()

        const revenueData = await getRevenueByCategoryByRange(from, to)
        const total = revenueData.reduce((acc: number, item: { value: number }) => acc + item.value, 0)
        const withPercent = revenueData
          .map((item: { name: string; value: number }) => ({
            ...item,
            percent: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0",
          }))
          .sort((a: CategoryItem, b: CategoryItem) => parseFloat(b.percent) - parseFloat(a.percent))
        setRawData(withPercent)
      } catch (error) {
        console.error("Error al cargar ingresos por categoría:", error)
      }
    }

    fetchData()
  }, [dateRange, selectionKey])

  // Separar categorías principales de las agrupadas en "Otros"
  const { chartData, colorMap } = useMemo(() => {
    const main: CategoryItem[] = []
    const others: CategoryItem[] = []

    for (const item of rawData) {
      if (parseFloat(item.percent) >= MIN_PERCENT_THRESHOLD) {
        main.push(item)
      } else {
        others.push(item)
      }
    }

    const chartItems = [...main]

    if (others.length > 0) {
      const othersValue = others.reduce((acc, item) => acc + item.value, 0)
      const total = rawData.reduce((acc, item) => acc + item.value, 0)
      const othersPercent = total > 0 ? ((othersValue / total) * 100).toFixed(1) : "0.0"
      chartItems.push({
        name: `Otros (${others.length})`,
        value: othersValue,
        percent: othersPercent,
      })
    }

    // Mapa de colores para uso en la tabla
    const cMap = new Map<string, string>()
    chartItems.forEach((item, i) => {
      cMap.set(item.name, item.name.startsWith("Otros") ? OTHERS_COLOR : COLORS[i % COLORS.length])
    })

    return { chartData: chartItems, colorMap: cMap }
  }, [rawData])

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  return (
    <div className="w-full space-y-4 overflow-hidden">
      {/* Gráfico de donut */}
      <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={!isMobile}
            outerRadius={isMobile ? 80 : 100}
            innerRadius={isMobile ? 35 : 45}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={1}
            label={isMobile ? false : ({ name, percent, x, y, midAngle }) => {
              const pct = parseFloat(percent)
              if (pct < MIN_PERCENT_THRESHOLD) return null
              const displayName = name.length > 16 ? `${name.slice(0, 14)}...` : name
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor={midAngle > 90 && midAngle < 270 ? "end" : "start"}
                  dominantBaseline="central"
                  fontSize={11}
                  fill={theme === "dark" ? "#E5E7EB" : "#374151"}
                >
                  {`${displayName} ${pct}%`}
                </text>
              )
            }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.name.startsWith("Otros") ? OTHERS_COLOR : COLORS[index % COLORS.length]}
                strokeWidth={1}
                stroke={theme === "dark" ? "#1F2937" : "#FFFFFF"}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as CategoryItem
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      S/. {item.value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.percent}%</p>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Tabla de detalle con todas las categorías */}
      <div className="max-h-48 overflow-y-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Categoría</th>
              <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Ingresos</th>
              <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rawData.map((item, index) => {
              const isMain = parseFloat(item.percent) >= MIN_PERCENT_THRESHOLD
              // Buscar el índice en main items para asignar color correcto
              const mainIndex = rawData.filter(r => parseFloat(r.percent) >= MIN_PERCENT_THRESHOLD).indexOf(item)
              const dotColor = isMain ? COLORS[mainIndex % COLORS.length] : OTHERS_COLOR
              return (
                <tr key={item.name} className="hover:bg-muted/50 transition-colors">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="truncate max-w-[180px]">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    S/. {item.value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{item.percent}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
