"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface ComparisonData {
  name: string
  value: number
  color?: string
  label?: string
}

interface ComparisonChartProps {
  /**
   * Title of the chart
   */
  title?: string

  /**
   * Description/subtitle
   */
  description?: string

  /**
   * Data to display
   */
  data: ComparisonData[]

  /**
   * Whether to show as horizontal bars
   */
  horizontal?: boolean

  /**
   * Height of the chart in pixels
   */
  height?: number

  /**
   * Whether to show grid lines
   */
  showGrid?: boolean

  /**
   * Whether to show legend
   */
  showLegend?: boolean

  /**
   * Format function for values
   */
  valueFormatter?: (value: number) => string

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Color scheme
   */
  colorScheme?: "default" | "green-red" | "blue" | "custom"
}

const defaultColors = {
  default: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
  "green-red": ["#10b981", "#ef4444"],
  blue: ["#3b82f6", "#60a5fa", "#93c5fd"],
}

export function ComparisonChart({
  title,
  description,
  data,
  horizontal = false,
  height = 300,
  showGrid = true,
  showLegend = false,
  valueFormatter = (value) => value.toLocaleString('es-PE'),
  className,
  colorScheme = "default",
}: ComparisonChartProps) {
  const colors = colorScheme === "custom"
    ? data.map(d => d.color || "#3b82f6")
    : defaultColors[colorScheme]

  const ChartWrapper = title ? Card : "div"

  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}

        {horizontal ? (
          <>
            <XAxis type="number" tickFormatter={valueFormatter} />
            <YAxis dataKey="name" type="category" width={100} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" />
            <YAxis tickFormatter={valueFormatter} />
          </>
        )}

        <Tooltip
          formatter={(value: number) => valueFormatter(value)}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
        />

        {showLegend && <Legend />}

        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || colors[index % colors.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  if (title) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {chart}
        </CardContent>
      </Card>
    )
  }

  return <div className={className}>{chart}</div>
}

/**
 * Simple comparison bar (non-chart version for simple comparisons)
 */
interface SimpleComparisonBarProps {
  label: string
  value: number
  maxValue: number
  color?: string
  className?: string
  valueFormatter?: (value: number) => string
}

export function SimpleComparisonBar({
  label,
  value,
  maxValue,
  color = "#3b82f6",
  className,
  valueFormatter = (v) => v.toLocaleString('es-PE'),
}: SimpleComparisonBarProps) {
  const percentage = (value / maxValue) * 100

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{valueFormatter(value)}</span>
      </div>
      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}

/**
 * Stacked comparison bars
 */
interface StackedComparisonProps {
  title?: string
  items: Array<{
    label: string
    value: number
    color: string
  }>
  total: number
  className?: string
  valueFormatter?: (value: number) => string
}

export function StackedComparison({
  title,
  items,
  total,
  className,
  valueFormatter = (v) => v.toLocaleString('es-PE'),
}: StackedComparisonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && <h4 className="text-sm font-semibold">{title}</h4>}

      {/* Stacked bar */}
      <div className="h-8 w-full bg-muted rounded-lg overflow-hidden flex">
        {items.map((item, index) => {
          const percentage = (item.value / total) * 100
          return (
            <div
              key={index}
              className="h-full transition-all duration-500 ease-out relative group"
              style={{
                width: `${percentage}%`,
                backgroundColor: item.color,
              }}
              title={`${item.label}: ${valueFormatter(item.value)}`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {item.label}: {valueFormatter(item.value)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground truncate">{item.label}</span>
            <span className="font-medium ml-auto">{valueFormatter(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
