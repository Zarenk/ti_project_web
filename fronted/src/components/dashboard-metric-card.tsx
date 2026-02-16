"use client"

import { useState, useCallback, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts"
import type { SparklinePoint } from "@/lib/dashboard/overview"

type ColorTheme = "blue" | "emerald" | "amber" | "violet"

const THEMES: Record<
  ColorTheme,
  {
    stroke: string
    fillId: string
    gradientFrom: string
    gradientTo: string
    hoverBg: string
    hoverBorder: string
  }
> = {
  blue: {
    stroke: "#60a5fa",
    fillId: "sparkFillBlue",
    gradientFrom: "rgba(96,165,250,0.25)",
    gradientTo: "rgba(96,165,250,0.02)",
    hoverBg: "hover:bg-blue-950/20",
    hoverBorder: "hover:border-blue-500/20",
  },
  emerald: {
    stroke: "#34d399",
    fillId: "sparkFillEmerald",
    gradientFrom: "rgba(52,211,153,0.25)",
    gradientTo: "rgba(52,211,153,0.02)",
    hoverBg: "hover:bg-emerald-950/20",
    hoverBorder: "hover:border-emerald-500/20",
  },
  amber: {
    stroke: "#fbbf24",
    fillId: "sparkFillAmber",
    gradientFrom: "rgba(251,191,36,0.25)",
    gradientTo: "rgba(251,191,36,0.02)",
    hoverBg: "hover:bg-amber-950/20",
    hoverBorder: "hover:border-amber-500/20",
  },
  violet: {
    stroke: "#a78bfa",
    fillId: "sparkFillViolet",
    gradientFrom: "rgba(167,139,250,0.25)",
    gradientTo: "rgba(167,139,250,0.02)",
    hoverBg: "hover:bg-violet-950/20",
    hoverBorder: "hover:border-violet-500/20",
  },
}

function formatSparkDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-")
  return `${d}/${m}`
}

interface DashboardMetricCardProps {
  title: string
  icon: ReactNode
  value: ReactNode
  subtitle: ReactNode
  data: SparklinePoint[]
  color: ColorTheme
}

export function DashboardMetricCard({
  title,
  icon,
  value,
  subtitle,
  data,
  color,
}: DashboardMetricCardProps) {
  const [hovered, setHovered] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const theme = THEMES[color]

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (data.length < 2) return
      const rect = e.currentTarget.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width
      const idx = Math.min(
        Math.max(Math.round(relX * (data.length - 1)), 0),
        data.length - 1,
      )
      setActiveIndex(idx)
    },
    [data],
  )

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
    setActiveIndex(null)
  }, [])

  const activePoint = activeIndex !== null ? data[activeIndex] : null
  const tooltipLeft =
    activeIndex !== null && data.length > 1
      ? Math.max(12, Math.min(88, (activeIndex / (data.length - 1)) * 100))
      : 50

  return (
    <Card
      className={`relative cursor-pointer overflow-hidden transition-all duration-500 ease-out ${theme.hoverBg} ${theme.hoverBorder}`}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Sparkline background layer */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{ opacity: hovered && data.length > 0 ? 1 : 0 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={theme.fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.gradientFrom} />
                <stop offset="100%" stopColor={theme.gradientTo} />
              </linearGradient>
            </defs>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Area
              type="monotone"
              dataKey="value"
              stroke={theme.stroke}
              strokeWidth={1.5}
              fill={`url(#${theme.fillId})`}
              dot={{ r: 1.5, fill: theme.stroke, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Vertical indicator line */}
      {hovered && activeIndex !== null && data.length > 1 && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-20 w-px transition-opacity duration-150"
          style={{
            left: `${(activeIndex / (data.length - 1)) * 100}%`,
            backgroundColor: theme.stroke,
            opacity: 0.3,
          }}
        />
      )}

      {/* Active point tooltip */}
      {hovered && activePoint && data.length > 1 && (
        <div
          className="pointer-events-none absolute z-20 bottom-1 -translate-x-1/2"
          style={{ left: `${tooltipLeft}%` }}
        >
          <div className="rounded-md bg-popover/95 backdrop-blur-sm px-2 py-0.5 text-[10px] shadow-md border whitespace-nowrap">
            <span className="font-semibold">{activePoint.value.toLocaleString()}</span>
            <span className="text-muted-foreground ml-1.5">{formatSparkDate(activePoint.date)}</span>
          </div>
        </div>
      )}

      {/* Content layer */}
      <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
