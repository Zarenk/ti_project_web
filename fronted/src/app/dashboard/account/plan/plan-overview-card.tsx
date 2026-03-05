"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { SubscriptionSummary } from "@/types/subscription"
import { STATUS_LABEL, getStatusBadgeClass, formatDate, formatPrice } from "./plan-utils"

interface PlanOverviewCardProps {
  summary: SubscriptionSummary | null
  loading: boolean
}

export function PlanOverviewCard({ summary, loading }: PlanOverviewCardProps) {
  if (loading) {
    return (
      <Card className="border-sky-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-slate-700 dark:bg-slate-900">
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-9 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className="border-sky-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-slate-700 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-slate-800 dark:text-slate-100">Plan de suscripcion</CardTitle>
        </CardHeader>
        <CardContent className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          No pudimos cargar el resumen de suscripcion. Intenta nuevamente o revisa tu conexion.
        </CardContent>
      </Card>
    )
  }

  const { plan, trial, billing, complimentary } = summary

  return (
    <Card className="border-sky-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-slate-700 dark:bg-slate-900">
      <CardHeader className="flex flex-col gap-2 px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base text-slate-800 dark:text-slate-100">
          <span className="break-words min-w-0">Plan actual</span>
          <Badge variant="outline" className={`flex-shrink-0 text-[10px] sm:text-xs ${getStatusBadgeClass(plan.status)}`}>
            {STATUS_LABEL[plan.status]}
          </Badge>
        </CardTitle>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Estas usando el plan <span className="font-medium text-slate-800 dark:text-slate-100">{plan.name}</span>.
        </p>
        {summary.organization?.name ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-[10px] sm:text-xs font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 w-fit">
            Organizacion: {summary.organization.name}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Trial banner */}
        {trial?.isTrial ? (
          <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-800 dark:border-sky-900 dark:bg-sky-900/30 dark:text-slate-100">
            <p className="font-medium">Periodo de prueba activo</p>
            <p>
              {trial.daysLeft !== null
                ? `Te quedan ${trial.daysLeft} dia(s) antes de que termine la prueba.`
                : "Tu prueba se encuentra activa. Aprovecha para completar el onboarding."}
            </p>
          </div>
        ) : null}

        {/* Complimentary banner */}
        {complimentary?.isActive ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-100">
            <p className="font-medium">Membresia sin pago activa</p>
            <p>Vence el {complimentary.endsAt ? formatDate(complimentary.endsAt) : "—"}.</p>
          </div>
        ) : null}

        {/* Cancel pending banner */}
        {billing.cancelAtPeriodEnd ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            <p className="font-medium">Cancelacion programada</p>
            <p>
              Tu suscripcion se cancelara el{" "}
              {billing.currentPeriodEnd ? formatDate(billing.currentPeriodEnd) : "final del periodo"}.
            </p>
          </div>
        ) : null}

        {/* Plan details list */}
        <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-100">Codigo:</span> {plan.code}
          </li>
          {plan.price ? (
            <li>
              <span className="font-medium text-slate-800 dark:text-slate-100">Precio:</span>{" "}
              {formatPrice(plan.price, plan.currency)} / {plan.interval === "MONTHLY" ? "mes" : "ano"}
            </li>
          ) : null}
          {billing.currentPeriodStart && billing.currentPeriodEnd ? (
            <li>
              <span className="font-medium text-slate-800 dark:text-slate-100">Periodo actual:</span>{" "}
              {formatDate(billing.currentPeriodStart)} – {formatDate(billing.currentPeriodEnd)}
            </li>
          ) : null}
          {billing.nextDueDate ? (
            <li>
              <span className="font-medium text-slate-800 dark:text-slate-100">Proximo cobro:</span>{" "}
              {formatDate(billing.nextDueDate)}
            </li>
          ) : null}
          {trial?.endsAt ? (
            <li>
              <span className="font-medium text-slate-800 dark:text-slate-100">Fin de prueba:</span>{" "}
              {formatDate(trial.endsAt)}
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  )
}
