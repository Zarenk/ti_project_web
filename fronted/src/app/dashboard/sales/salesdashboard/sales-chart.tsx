// sales-chart.tsx
"use client"

import { useEffect, useState } from "react"
import { Area, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, eachDayOfInterval } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { getSalesByDateParams } from "../sales.api" // Asegúrate que esté esto
import { set } from "date-fns"

interface Props {
  dateRange: DateRange
}

function endOfDayInLima(date: Date) {
  return set(date, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 })
}

export function SalesChart({ dateRange }: Props) {
  const [data, setData] = useState<{ date: string; displayDate: string; sales: number }[]>([])

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return
  
    const from = dateRange.from!
    const to = endOfDayInLima(dateRange.to!)
  
    async function fetchSales() {
      try {
        const dailySales = await getSalesByDateParams(from.toISOString(), to.toISOString())
  
        const fullRange = eachDayOfInterval({ start: from, end: dateRange.to! })
  
        const salesMap = new Map(
          dailySales.map((s: any) => {
            const dateKey = formatInTimeZone(s.date, "UTC", "yyyy-MM-dd", { timeZone: "America/Lima" })
            return [dateKey, s.sales ?? 0]
          })
        )
  
        const completedData = fullRange.map((date) => {
          const dateKey = formatInTimeZone(date, "America/Lima", "yyyy-MM-dd")
          const displayDate = formatInTimeZone(date, "America/Lima", "MMM d", { locale: es })
          return {
            date: dateKey,
            displayDate,
            sales: Number(salesMap.get(dateKey) ?? 0),
          }
        })
  
        setData(completedData)
      } catch (error) {
        console.error("Error al obtener las ventas diarias:", error)
      }
    }
  
    fetchSales()
  }, [dateRange])

  return (
    <div className="w-full h-[350px] flex items-center justify-center">
    {data.length === 0 ? (
      <p className="text-sm text-muted-foreground">No hay datos de ventas en este período.</p>
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
            tickFormatter={(value) => `S/. ${value}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const { displayDate, sales } = payload[0].payload
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">Fecha</span>
                        <span className="font-bold text-muted-foreground">{displayDate}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">Ventas</span>
                        <span className="font-bold">S/. {sales}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="transparent"
            fill="rgba(0, 123, 255, 0.1)"
          />
          <Line
            type="monotone"
            dataKey="sales"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{
              r: 6,
              style: { fill: "#007bff", opacity: 0.8 },
            }}
            stroke="#007bff"
            isAnimationActive={true}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
      )}
  </div>
  )
}
