"use client"

import { memo } from "react"
import type { ToolStatsData } from "@/data/help/tools/tool-types"

interface ToolResultStatsProps {
  title: string
  data: ToolStatsData
}

function formatValue(value: number, format: "number" | "currency" | "percentage"): string {
  switch (format) {
    case "currency":
      return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "percentage":
      return `${value.toFixed(1)}%`
    case "number":
    default:
      return value.toLocaleString("es-PE")
  }
}

export const ToolResultStats = memo(function ToolResultStats({ title, data }: ToolResultStatsProps) {
  return (
    <div className="mt-1.5 w-full min-w-0 overflow-hidden rounded-md border border-border/60 bg-background/50">
      {/* Header */}
      <div className="border-b border-border/40 px-2.5 py-1.5">
        <span className="text-[11px] font-semibold text-foreground">{title}</span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-px bg-border/30">
        {data.cards.map((card, i) => (
          <div
            key={i}
            className="flex flex-col gap-0.5 bg-background/50 px-2.5 py-2"
          >
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </span>
            <span className="text-sm font-bold text-foreground">
              {formatValue(card.value, card.format)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
