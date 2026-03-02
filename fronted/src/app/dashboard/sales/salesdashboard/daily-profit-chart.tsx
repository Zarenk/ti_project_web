"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { Area, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { eachDayOfInterval } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { getProfitByDate } from "../sales.api"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { useTheme } from "next-themes"

interface Props {
  dateRange: DateRange
}

export function DailyProfitChart({ dateRange }: Props) {
  const { theme } = useTheme()
  const textColor = theme === "dark" ? "#9CA3AF" : "#6B7280"
  const { selection } = useTenantSelection()

  const from = dateRange?.from?.toISOString() ?? ""
  const to = dateRange?.to?.toISOString() ?? ""

  const { data = [] } = useQuery({
    queryKey: [...queryKeys.sales.dashboard(selection.orgId, selection.companyId), "dailyProfit", { from, to }],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return []
      const fromStr = dateRange.from.toISOString()
      const toStr = dateRange.to.toISOString()
      const resp = await getProfitByDate(fromStr, toStr)
      const fullRange = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
      const map = new Map((resp || []).map((r: any) => [r.date, r.profit ?? 0]))
      return fullRange.map((d) => {
        const key = formatInTimeZone(d, "America/Lima", "yyyy-MM-dd")
        return {
          date: key,
          displayDate: formatInTimeZone(d, "America/Lima", "MMM d", { locale: es }),
          profit: Number(map.get(key) ?? 0),
        }
      })
    },
    enabled: selection.orgId !== null && !!dateRange?.from && !!dateRange?.to,
  })

  if (data.length === 0) {
    return (
      <div className="w-full h-[250px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No hay datos de utilidades en este período.</p>
      </div>
    )
  }

  // Mostrar menos ticks en el eje X cuando hay muchos datos
  const tickInterval = data.length > 20 ? Math.ceil(data.length / 10) : 0

  return (
    <div className="w-full h-[250px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 15, left: 5, bottom: 0 }}>
          <XAxis
            dataKey="displayDate"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            style={{ fontSize: "11px" }}
            tick={{ fill: textColor }}
            interval={tickInterval}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={70}
            style={{ fontSize: "11px" }}
            tick={{ fill: textColor }}
            tickFormatter={(value) => `S/. ${Number(value).toFixed(0)}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const { displayDate, profit } = payload[0].payload
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">Fecha</span>
                        <span className="font-bold text-muted-foreground">{displayDate}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">Utilidad</span>
                        <span className="font-bold">S/. {Number(profit).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Area type="monotone" dataKey="profit" stroke="transparent" fill="rgba(16,185,129,0.08)" />
          <Line
            type="monotone"
            dataKey="profit"
            strokeWidth={2}
            dot={{ r: 2, fill: "#10B981" }}
            activeDot={{ r: 5, style: { fill: "#10B981", opacity: 0.9 } }}
            stroke="#10B981"
            isAnimationActive={true}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
