"use client"

import { useState, type ReactElement } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ContextHistoryList } from "../context-history-list"
import { ContextMetricsOverview } from "../context-metrics-overview"
import { Button } from "@/components/ui/button"
import { ContextAnalyticsPanel } from "@/components/context-analytics-panel"

export default function ContextHistoryPage(): ReactElement {
  const [showAnalytics, setShowAnalytics] = useState(false)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3 border-b border-sky-100 pb-4 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-sky-500 dark:text-slate-300">
              Cuenta · Preferencias
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Historial de contextos
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Consulta y restaura cualquiera de tus selecciones recientes de organización y empresa.
            </p>
          </div>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard/account">
              <ArrowLeft className="size-4" />
              Volver a la cuenta
            </Link>
          </Button>
        </div>
      </div>

      <ContextMetricsOverview />

      <ContextHistoryList />

      <div className="rounded-2xl border border-sky-100/80 bg-white/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Analytics de contexto
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Consulta los eventos recientes si necesitas depurar la restauración.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowAnalytics((prev) => !prev)}>
            {showAnalytics ? "Ocultar eventos" : "Ver últimos eventos"}
          </Button>
        </div>
        {showAnalytics ? (
          <div className="mt-4">
            <ContextAnalyticsPanel mode="inline" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
