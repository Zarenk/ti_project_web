"use client"

import { useEffect, useMemo, useState } from "react"
import { Area, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, eachDayOfInterval } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { getProfitByDate } from "../sales.api"
import { useTenantSelection } from "@/context/tenant-selection-context"

interface Props {
  dateRange: DateRange
}

export function DailyProfitChart({ dateRange }: Props) {
  const [data, setData] = useState<{ date: string; displayDate: string; profit: number }[]>([])
  const { selection, version } = useTenantSelection()
  const selectionKey = useMemo(
    () => `${selection.orgId ?? "none"}-${selection.companyId ?? "none"}-${version}`,
    [selection.orgId, selection.companyId, version],
  )

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return
    const from = dateRange.from.toISOString()
    const to = dateRange.to.toISOString()
    async function fetchProfit() {
      try {
        const resp = await getProfitByDate(from, to)
        // resp expected [{ date: 'yyyy-MM-dd', profit: number }]
        const fullRange = eachDayOfInterval({ start: dateRange.from!, end: dateRange.to! })
        const map = new Map((resp || []).map((r: any) => [r.date, r.profit ?? 0]))
        const completed = fullRange.map((d) => {
          const key = formatInTimeZone(d, "America/Lima", "yyyy-MM-dd")
          return {
            date: key,
            displayDate: formatInTimeZone(d, "America/Lima", "MMM d", { locale: es }),
            profit: Number(map.get(key) ?? 0),
          }
        })
        setData(completed)
      } catch (error) {
        console.error("Error al obtener utilidades diarias:", error)
      }
    }
    fetchProfit()
  }, [dateRange, selectionKey])

  return (
    <div className="w-full h-[350px] flex items-center justify-center">
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay datos de utilidades en este período.</p>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => {
                const found = data.find((d) => d.date === value)
                return found?.displayDate ?? value
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => `S/. ${Number(value).toFixed(2)}`}
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
            <Line type="monotone" dataKey="profit" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6, style: { fill: "#10B981", opacity: 0.9 } }} stroke="#10B981" isAnimationActive={true} animationDuration={1000} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
