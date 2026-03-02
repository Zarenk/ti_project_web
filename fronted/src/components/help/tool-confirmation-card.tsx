"use client"

import { memo, useState } from "react"
import { Check, X, Loader2 } from "lucide-react"
import type { ChatToolConfirmation } from "@/data/help/types"

interface ToolConfirmationCardProps {
  data: ChatToolConfirmation
  onConfirm: () => Promise<void>
  onCancel: () => void
  resolved?: boolean
  resolvedMessage?: string
}

export const ToolConfirmationCard = memo(function ToolConfirmationCard({
  data,
  onConfirm,
  onCancel,
  resolved,
  resolvedMessage,
}: ToolConfirmationCardProps) {
  const [isExecuting, setIsExecuting] = useState(false)

  const handleConfirm = async () => {
    setIsExecuting(true)
    try {
      await onConfirm()
    } finally {
      setIsExecuting(false)
    }
  }

  if (resolved) {
    return (
      <div className="mt-1.5 w-full min-w-0 overflow-hidden rounded-md border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            {resolvedMessage ?? "Acción completada"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-1.5 w-full min-w-0 overflow-hidden rounded-md border border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20">
      {/* Header */}
      <div className="border-b border-amber-200/60 px-2.5 py-1.5 dark:border-amber-800/30">
        <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
          {data.title}
        </span>
        <p className="text-[10px] text-amber-700/80 dark:text-amber-300/70">
          {data.description}
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-0.5 px-2.5 py-1.5">
        {data.fields.map((field, i) => (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{field.label}</span>
            <span className="font-medium text-foreground">{field.value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 border-t border-amber-200/60 px-2.5 py-1.5 dark:border-amber-800/30">
        <button
          className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          onClick={handleConfirm}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Confirmar
        </button>
        <button
          className="flex cursor-pointer items-center justify-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          onClick={onCancel}
          disabled={isExecuting}
        >
          <X className="h-3 w-3" />
          Cancelar
        </button>
      </div>
    </div>
  )
})
