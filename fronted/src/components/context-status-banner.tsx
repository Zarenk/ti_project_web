"use client"

import { Loader2, WifiOff, AlertTriangle } from "lucide-react"

import { useTenantSelection } from "@/context/tenant-selection-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ContextStatusBanner() {
  const { status, refresh } = useTenantSelection()

  if (status.state === "idle") {
    return null
  }

  if (status.state === "restoring") {
    return (
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full border border-slate-100 bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100">
        <Loader2 className="size-4 animate-spin text-sky-600 dark:text-sky-400" />
        <span>{status.message ?? "Restaurando tu espacio de trabajo..."}</span>
      </div>
    )
  }

  const isOffline = status.state === "offline"
  const Icon = isOffline ? WifiOff : AlertTriangle
  const message =
    status.message ??
    (isOffline
      ? "Trabajando en modo offline. Algunas funciones pueden no estar disponibles."
      : "No pudimos restaurar tu contexto.")

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-40 flex w-[min(90vw,480px)] -translate-x-1/2 items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur",
        isOffline
          ? "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/60 dark:text-amber-100"
          : "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-400/40 dark:bg-rose-950/60 dark:text-rose-100",
      )}
    >
      <Icon className="mt-1 size-5 flex-shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">
          {isOffline ? "Modo offline" : "No pudimos recuperar tu última organización"}
        </p>
        <p>{message}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => refresh()}
        className="border-current text-current hover:bg-current/10"
      >
        Reintentar
      </Button>
    </div>
  )
}
