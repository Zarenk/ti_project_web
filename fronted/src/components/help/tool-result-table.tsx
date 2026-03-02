"use client"

import { memo } from "react"
import type { ToolTableData } from "@/data/help/tools/tool-types"

interface ToolResultTableProps {
  title: string
  data: ToolTableData
}

function formatCell(value: unknown, colName: string): string {
  if (value == null) return "-"

  // Format currency
  if (colName.toLowerCase().includes("total") || colName.toLowerCase().includes("precio") || colName.toLowerCase().includes("price")) {
    return `S/ ${Number(value).toFixed(2)}`
  }

  // Format date
  if (colName.toLowerCase().includes("fecha") || colName.toLowerCase() === "date") {
    try {
      return new Date(String(value)).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return String(value)
    }
  }

  return String(value)
}

export const ToolResultTable = memo(function ToolResultTable({ title, data }: ToolResultTableProps) {
  const { summary, rows, columns } = data
  const keys = rows[0] ? Object.keys(rows[0]) : []

  return (
    <div className="mt-1.5 w-full min-w-0 overflow-hidden rounded-md border border-border/60 bg-background/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-2.5 py-1.5">
        <span className="text-[11px] font-semibold text-foreground">{title}</span>
        {summary && (
          <span className="text-[10px] text-muted-foreground">
            {summary.count} resultado{summary.count !== 1 ? "s" : ""}
            {summary.total != null && ` · S/ ${summary.total.toFixed(2)}`}
          </span>
        )}
      </div>

      {/* Table */}
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                {columns.map((col, i) => (
                  <th key={i} className="whitespace-nowrap px-2 py-1 text-left font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((row, i) => (
                <tr key={i} className="border-b border-border/20 last:border-0">
                  {keys.map((key, j) => (
                    <td key={j} className="whitespace-nowrap px-2 py-1 text-foreground">
                      {formatCell(row[key], columns[j] ?? key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-2.5 py-3 text-center text-[10px] text-muted-foreground">
          No se encontraron resultados
        </div>
      )}

      {rows.length > 8 && (
        <div className="border-t border-border/30 px-2.5 py-1 text-center">
          <span className="text-[10px] text-muted-foreground">
            +{rows.length - 8} más
          </span>
        </div>
      )}
    </div>
  )
})
