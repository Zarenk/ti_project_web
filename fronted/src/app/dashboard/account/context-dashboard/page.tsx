"use client"

// Vista dedicada para monitoreo interno: usa ContextMetricsOverview + analytics inline.

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ContextMetricsOverview } from "../context-metrics-overview"
import { Button } from "@/components/ui/button"
import { ContextAnalyticsPanel } from "@/components/context-analytics-panel"

export default function ContextDashboardPage(): React.ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3 border-b border-sky-100 pb-4 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-sky-500 dark:text-slate-300">
              Cuenta · Métricas
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Dashboard de contexto
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Observabilidad en tiempo real de restauraciones, cambios manuales y límites.
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

      <div className="rounded-2xl border border-sky-100/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Eventos recientes
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Usa este panel para depurar restauraciones, fallos o throttles en vivo.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ContextAnalyticsPanel mode="inline" defaultExpanded />
        </div>
      </div>
    </div>
  )
}
