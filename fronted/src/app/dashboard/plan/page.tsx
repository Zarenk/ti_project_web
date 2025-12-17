
"use client"

import type { ComponentProps } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { SubscriptionPlanOption, SubscriptionSummary } from "@/types/subscription"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import { fetchSubscriptionPlans } from "@/lib/subscription-plans"
import { authFetch } from "@/utils/auth-fetch"
import { cn } from "@/lib/utils"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { SubscriptionUsageCard } from "@/components/subscription-usage-card"
import { ExclamationTriangleIcon } from "lucide-react"

const MS_IN_DAY = 1000 * 60 * 60 * 24

const STATUS_BADGE: Record<
  SubscriptionSummary["plan"]["status"],
  { label: string; className: string }
> = {
  TRIAL: { label: "En prueba", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100" },
  ACTIVE: { label: "Activa", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100" },
  PAST_DUE: {
    label: "Cobro pendiente",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100",
  },
  CANCELED: { label: "Cancelada", className: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
}

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: "mes",
  YEARLY: "a?o",
}

function formatDateFromIso(value?: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatCurrencyDisplay(value?: string | null, currency = "PEN"): string {
  if (!value) return "-"
  const numeric = Number(value)
  if (Number.isNaN(numeric)) {
    return `${currency} ${value}`
  }
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numeric)
}

interface PlanDialogProps {
  summary: SubscriptionSummary
  onUpdated: () => void
  plans: SubscriptionPlanOption[]
  loadingPlans: boolean
  triggerLabel?: string
  triggerVariant?: ComponentProps<typeof Button>["variant"]
  triggerClassName?: string
  presetPlanCode?: string
}

function UpgradePlanDialog({
  summary,
  onUpdated,
  plans,
  loadingPlans,
  triggerLabel = "Actualizar plan",
  triggerVariant = "default",
  triggerClassName,
  presetPlanCode,
}: PlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>(summary.plan.code)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedPlan(presetPlanCode ?? summary.plan.code)
    }
  }, [open, presetPlanCode, summary.plan.code])

  useEffect(() => {
    if (!open) {
      setSelectedPlan(summary.plan.code)
    }
  }, [open, summary.plan.code])

  const handleSubmit = async () => {
    if (!selectedPlan || selectedPlan === summary.plan.code) {
      setError("Selecciona un plan distinto para continuar.")
      return
    }

    setSubmitting(true)
    setError(null)
    setInfo(null)

    try {
      const payload: Record<string, unknown> = {
        planCode: selectedPlan,
        effectiveImmediately: true,
      }
      if (process.env.NEXT_PUBLIC_PUBLIC_URL) {
        const base = process.env.NEXT_PUBLIC_PUBLIC_URL.replace(/\/$/, "")
        payload.successUrl = `${base}/dashboard/account/plan?upgrade=success`
        payload.cancelUrl = `${base}/dashboard/account/plan`
      }

      const res = await authFetch("/subscriptions/me/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "No se pudo solicitar el cambio de plan.")
      }

      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl as string
        return
      }

      setInfo("El cambio se program? para el siguiente ciclo de facturaci?n.")
      setOpen(false)
      onUpdated()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido al actualizar el plan."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className={cn("rounded-full", triggerClassName)}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecciona un plan</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Los cambios aplicar?n inmediatamente despu?s del pago. Si eliges un plan de menor costo, se programar? para el
            siguiente ciclo.
          </p>
        </DialogHeader>
        <div className="space-y-3">
          {loadingPlans ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => {
                const isCurrent = plan.code === summary.plan.code
                const isSelected = plan.code === selectedPlan
                return (
                  <label
                    key={plan.code}
                    className={cn(
                      "flex cursor-pointer flex-col rounded-lg border p-4 transition hover:border-sky-400",
                      isSelected && "border-sky-500 bg-sky-50 dark:bg-slate-800/60",
                      isCurrent && "!cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      value={plan.code}
                      checked={isSelected}
                      onChange={() => setSelectedPlan(plan.code)}
                      disabled={isCurrent}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{plan.name}</div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {formatCurrencyDisplay(plan.price, plan.currency)} / {INTERVAL_LABEL[plan.interval] ?? "mes"}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description ?? "Sin descripci?n disponible."}</p>
                    {isCurrent && <p className="text-xs text-slate-500">Plan actual</p>}
                  </label>
                )
              })}
            </div>
          )}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-600">{info}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loadingPlans}>
            {submitting ? "Procesando..." : "Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PlanPage() {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const data = await fetchSubscriptionSummary()
      setSummary(data)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar la informaci?n de la suscripci?n."
      setError(message)
      setSummary(null)
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true)
    try {
      const data = await fetchSubscriptionPlans()
      setPlans(data)
    } catch (err) {
      console.warn("No se pudo obtener la lista de planes", err)
      setPlans([])
    } finally {
      setLoadingPlans(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([loadSummary(), loadPlans()]).catch(() => {
      if (!active) return
    })
    return () => {
      active = false
    }
  }, [loadPlans, loadSummary])

  const currentPlanStatus = summary ? STATUS_BADGE[summary.plan.status] : null

  const summaryContent = useMemo(() => {
    if (!summary) return null
    const contact = summary.contacts.primary
    const companyName = summary.company?.name ?? summary.organization?.name ?? "-"
    const vigenciaSource = summary.billing.currentPeriodEnd ?? summary.trial.endsAt
    const vigenciaLabel = summary.trial.isTrial ? "Fin de prueba" : "Vigencia hasta"

    return (
      <>
        <div className="space-y-2">
          <Label>Administrador de la empresa</Label>
          <Input value={contact ? `${contact.name} (${contact.email})` : "-"} readOnly className="font-medium" />
        </div>
        <div className="space-y-2">
          <Label>Nivel de cuenta</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={summary.plan.name.toUpperCase()} readOnly className="font-semibold uppercase" />
            {currentPlanStatus ? (
              <Badge className={cn("px-3 py-1 text-xs font-semibold", currentPlanStatus.className)}>
                {currentPlanStatus.label}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCurrencyDisplay(summary.plan.price, summary.plan.currency)} / {INTERVAL_LABEL[summary.plan.interval] ?? "mes"}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Empresa asociada</Label>
          <Input value={companyName} readOnly className="font-medium" />
        </div>
        <div className="space-y-2">
          <Label>{vigenciaLabel}</Label>
          <Input value={formatDateFromIso(vigenciaSource)} readOnly />
        </div>
        <div className="space-y-2">
          <Label>?ltima renovaci?n</Label>
          <Input value={formatDateFromIso(summary.billing.lastInvoicePaidAt)} readOnly />
        </div>
        <div className="space-y-2">
          <Label>Contacto asignado</Label>
          <Input value={contact ? contact.email : "-"} readOnly />
        </div>
      </>
    )
  }, [summary, currentPlanStatus])

  const legacyInfo = useMemo(() => {
    if (!summary?.plan.isLegacy) {
      return null
    }

    if (!summary.plan.legacyGraceUntil) {
      return { show: true, daysLeft: null, formattedDate: null }
    }

    const graceDate = new Date(summary.plan.legacyGraceUntil)
    if (Number.isNaN(graceDate.getTime())) {
      return { show: true, daysLeft: null, formattedDate: null }
    }

    const diffDays = Math.ceil((graceDate.getTime() - Date.now()) / MS_IN_DAY)
    return {
      show: diffDays <= 30,
      daysLeft: diffDays,
      formattedDate: formatDateFromIso(summary.plan.legacyGraceUntil),
    }
  }, [summary])

  const recommendedPlanCode = useMemo(() => {
    if (!summary) return undefined
    return plans.find((plan) => plan.code !== summary.plan.code)?.code
  }, [plans, summary])

  if (loadingSummary) {
    return (
      <div className="container mx-auto max-w-3xl space-y-8 py-10">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Card className="border-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="container mx-auto max-w-3xl space-y-6 py-10">
        <p className="text-center text-sm text-rose-600">{error ?? "No se encontr? informaci?n de suscripci?n."}</p>
        <Button onClick={loadSummary}>Reintentar</Button>
      </div>
    )
  }

  const legacyMessage = legacyInfo
    ? legacyInfo.daysLeft !== null
      ? legacyInfo.daysLeft >= 0
        ? `El plan legacy dejará de estar disponible en ${legacyInfo.formattedDate}. A partir del ${legacyInfo.formattedDate} migraremos automáticamente.`
        : `El período de gracia finalizó el ${legacyInfo.formattedDate}. Te recomendamos migrar cuanto antes.`
      : "Tu plan legacy se migrar? pronto. Te recomendamos actualizarlo para continuar con el servicio."
    : null

  return (
    <div className="container mx-auto max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <Badge className="rounded-full bg-sky-600 px-4 py-1 text-sm font-semibold uppercase tracking-wide">Detalles del plan</Badge>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Mi plan</h1>
          <p className="text-muted-foreground">Revisa tu suscripci?n actual y gestiona los cambios de forma autoservicio.</p>
        </div>
      </header>

      {legacyInfo?.show ? (
        <Alert className="flex flex-col gap-3 border-sky-500/40 bg-sky-50 dark:border-sky-600/40 dark:bg-slate-900">
          <div className="space-y-1">
            <AlertTitle className="flex items-center gap-2 text-sky-950 dark:text-sky-100">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Tu plan legacy requiere migraci?n
            </AlertTitle>
            <AlertDescription className="text-sky-900/80 dark:text-sky-100/80">{legacyMessage}</AlertDescription>
          </div>
          <UpgradePlanDialog
            summary={summary}
            onUpdated={loadSummary}
            plans={plans}
            loadingPlans={loadingPlans}
            triggerLabel="Migrar ahora"
            triggerVariant="outline"
            triggerClassName="rounded-md px-6"
            presetPlanCode={recommendedPlanCode}
          />
        </Alert>
      ) : null}

      <Card className="border-2">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">Resumen de la suscripci?n</CardTitle>
          <CardDescription>
            Informaci?n visible ?nicamente para administradores. Si necesitas ayuda adicional puedes contactar al equipo comercial.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">{summaryContent}</CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">Los cambios de plan quedar?n registrados en tu historial de facturaci?n.</div>
          <UpgradePlanDialog summary={summary} onUpdated={loadSummary} plans={plans} loadingPlans={loadingPlans} />
        </CardFooter>
      </Card>

      {summary.plan.restrictions ? (
        <Alert className="border-amber-500/30 bg-amber-50 dark:border-amber-500/40 dark:bg-slate-900">
          <AlertTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Pago pendiente
          </AlertTitle>
          <AlertDescription className="text-amber-900/80 dark:text-amber-100/80">
            Tu suscripci?n est? limitada temporalmente hasta regularizar el cobro. Completa el pago para recuperar los l?mites completos de tu plan.
          </AlertDescription>
        </Alert>
      ) : null}

      <SubscriptionUsageCard summary={summary} />
      {error ? <p className="text-sm text-amber-600">{error}</p> : null}
    </div>
  )
}
