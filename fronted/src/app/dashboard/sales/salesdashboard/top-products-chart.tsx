"use client"

import { useTenantSelection } from "@/context/tenant-selection-context"
import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { getTopProducts } from "../sales.api"
import { DateRange } from "react-day-picker"
import { useTheme } from "next-themes"

interface Props {
  dateRange: DateRange
}

/** Trunca un texto por palabras completas, sin cortar a mitad de palabra */
function truncateByWords(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  const words = text.split(" ")
  let result = ""
  for (const word of words) {
    const next = result ? `${result} ${word}` : word
    if (next.length > maxLen) break
    result = next
  }
  return result ? `${result}...` : `${text.slice(0, maxLen)}...`
}

export function TopProductsChart({ dateRange }: Props) {
  const { theme } = useTheme()
  const textColor = theme === "dark" ? "#FFFFFF" : "#000000"
  const { selection } = useTenantSelection()

  const from = dateRange?.from?.toISOString() ?? ""
  const to = dateRange?.to?.toISOString() ?? ""

  const { data = [] } = useQuery<{ name: string; sales: number }[]>({
    queryKey: [...queryKeys.sales.dashboard(selection.orgId, selection.companyId), "topProductsChart", { from, to }],
    queryFn: async () => {
      if (dateRange?.from && dateRange?.to) {
        return await getTopProducts({ from: dateRange.from.toISOString(), to: dateRange.to.toISOString() })
      }
      return await getTopProducts({ type: "month" })
    },
    enabled: selection.orgId !== null,
  })

  // Altura dinámica: 40px por producto, mínimo 300px, máximo 800px
  const chartHeight = Math.min(800, Math.max(300, data.length * 40))

  return (
    <div
      className="w-full overflow-y-auto"
      style={{ maxHeight: 500 }}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          barCategoryGap="20%"
        >
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            style={{ fontSize: "12px" }}
            tick={{ fill: textColor }}
          />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            width={130}
            tick={({ x, y, payload }) => {
              const maxChars = typeof window !== "undefined" && window.innerWidth < 640 ? 14 : 20
              const displayText = truncateByWords(payload.value, maxChars)
              return (
                <text
                  x={x}
                  y={y}
                  fill={textColor}
                  fontSize={11}
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {displayText}
                </text>
              )
            }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase text-muted-foreground">Producto</span>
                      <span className="text-sm font-bold text-muted-foreground">{label}</span>
                      <span className="text-xs uppercase text-muted-foreground mt-1">Unidades vendidas</span>
                      <span className="text-sm font-bold">{payload[0].value}</span>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="sales" radius={[4, 4, 4, 4]} fill="#4FC3F7" barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
