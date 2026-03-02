"use client"

import { memo } from "react"
import { AlertTriangle } from "lucide-react"

interface ToolErrorCardProps {
  title: string
  message: string
}

export const ToolErrorCard = memo(function ToolErrorCard({ title, message }: ToolErrorCardProps) {
  return (
    <div className="mt-1.5 w-full min-w-0 overflow-hidden rounded-md border border-destructive/30 bg-destructive/5 dark:bg-destructive/10">
      <div className="flex items-start gap-2 px-2.5 py-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
        <div className="min-w-0">
          <span className="text-[11px] font-semibold text-destructive">{title}</span>
          <p className="text-[10px] text-destructive/80">{message}</p>
        </div>
      </div>
    </div>
  )
})
