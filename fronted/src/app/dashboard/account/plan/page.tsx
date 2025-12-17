"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { SubscriptionQuotaCard } from "@/components/subscription-quota-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import type { SubscriptionSummary, SubscriptionStatus } from "@/types/subscription"
import {
  cancelSubscription,
  fetchSubscriptionPlans,
  requestPlanChange,
  type SubscriptionPlan,
} from "../billing.api"
import { useAccountAccessGuard } from "../use-account-access"

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIAL: "Periodo de prueba",
  ACTIVE: "Activa",
  PAST_DUE: "Cobro pendiente",
  CANCELED: "Cancelada",
}

const CANCEL_REASONS = [
  { value: "missing_features", label: "Necesito funciones adicionales" },
  { value: "support", label: "No recibi el soporte esperado" },
  { value: "price", label: "El precio no se ajusta a mi presupuesto" },
  { value: "not_using", label: "Ya no usamos la plataforma" },
  { value: "data_quality", label: "Problemas con mi informacion" },
  { value: "other", label: "Otro motivo" },
]

export default function PlanUsagePage() {
  const accessReady = useAccountAccessGuard()
  const { selection, version } = useTenantSelection()
  const organizationId = selection?.orgId ?? null

  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [planCode, setPlanCode] = useState("")
  const [planLockedToSummary, setPlanLockedToSummary] = useState(true)
  const [effectiveImmediately, setEffectiveImmediately] = useState(false)
  const [planSubmitting, setPlanSubmitting] = useState(false)

  const [cancelReason, setCancelReason] = useState("")
  const [cancelNotes, setCancelNotes] = useState("")
  const [cancelImmediately, setCancelImmediately] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)

  const loadSummary = useCallback(async () => {
    if (!organizationId) {
      setSummary(null)
      setSummaryLoading(false)
      return
    }
    setSummaryLoading(true)
    try {
      const data = await fetchSubscriptionSummary()
      setSummary(data)
    } catch (error) {
      console.error(error)
      toast.error("No pudimos obtener el estado actual del plan.")
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [organizationId])

  const loadPlans = useCallback(async () => {
    if (!organizationId) {
      setPlans([])
      setPlansLoading(false)
      return
    }
    setPlansLoading(true)
    try {
      const list = await fetchSubscriptionPlans()
      setPlans(list)
      setPlanCode((current) => {
        if (current) return current
        if (summary?.plan?.code) return summary.plan.code
        return list[0]?.code ?? ""
      })
    } catch (error) {
      console.error(error)
      toast.error("No pudimos cargar los planes disponibles.")
      setPlans([])
    } finally {
      setPlansLoading(false)
    }
  }, [organizationId, summary?.plan?.code])

  useEffect(() => {
    if (!accessReady) return
    void loadSummary()
  }, [accessReady, loadSummary, version])

  useEffect(() => {
    if (!accessReady) return
    void loadPlans()
  }, [accessReady, loadPlans, version])

  useEffect(() => {
    setPlanLockedToSummary(true)
    setPlanCode("")
  }, [organizationId])

  useEffect(() => {
    if (!planLockedToSummary) return
    if (summary?.plan?.code) {
      setPlanCode(summary.plan.code)
    } else if (!summary && plans.length > 0 && !planCode) {
      setPlanCode(plans[0].code)
    }
  }, [planLockedToSummary, summary, plans, planCode])

  const handlePlanSelect = (value: string) => {
    setPlanLockedToSummary(false)
    setPlanCode(value)
  }

  const selectedPlan = useMemo(() => plans.find((plan) => plan.code === planCode), [planCode, plans])
  const isSamePlan = summary?.plan?.code ? summary.plan.code === planCode : true

  const handlePlanChange = async () => {
    if (!organizationId) {
      toast.error("Selecciona una organizacion activa para gestionar el plan.")
      return
    }
    if (!planCode || isSamePlan) {
      toast.info("Selecciona un plan diferente para continuar.")
      return
    }
    setPlanSubmitting(true)
    try {
      const response = await requestPlanChange({
        organizationId,
        planCode,
        effectiveImmediately,
      })

      if (response.checkoutUrl) {
        toast.success("Necesitamos confirmar el pago del nuevo plan. Te redirigiremos al portal seguro.")
        window.location.href = response.checkoutUrl
        return
      }

      if (response.effectiveImmediately) {
        toast.success("El cambio de plan se aplico de inmediato.")
      } else {
        toast.success("Registramos el cambio. Se aplicara al finalizar el periodo vigente.")
      }

      setPlanLockedToSummary(true)
      void loadSummary()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No pudimos ejecutar el cambio de plan.")
    } finally {
      setPlanSubmitting(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!organizationId) {
      toast.error("Selecciona una organizacion activa para continuar.")
      return
    }
    if (!cancelReason) {
      toast.error("Selecciona un motivo de cancelacion.")
      return
    }
    if (cancelReason === "other" && !cancelNotes.trim()) {
      toast.error("Detalla el motivo para ayudarnos a mejorar.")
      return
    }
    setCancelSubmitting(true)
    try {
      await cancelSubscription({
        organizationId,
        cancelImmediately,
        reasonCategory: cancelReason === "other" ? undefined : cancelReason,
        customReason: cancelReason === "other" ? cancelNotes.trim() : cancelNotes.trim() || undefined,
      })
      toast.success("Programamos la cancelacion. Te notificaremos por correo.")
      setCancelNotes("")
      setCancelReason("")
      setCancelImmediately(false)
      void loadSummary()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No pudimos cancelar la suscripcion.")
    } finally {
      setCancelSubmitting(false)
    }
  }

  if (!accessReady) {
    return <PlanSkeleton />
  }

  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configuracion de cuenta</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Consumo y gestion del plan</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Revisa el uso de tu suscripcion, cambia de plan o cancela de forma autoservicio.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/account">Volver a mi cuenta</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/dashboard/account/billing">Facturacion</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/account/exports">Exportaciones</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {!organizationId ? (
          <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Selecciona una organizacion</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-300">
              Usa el conmutador de equipos para elegir la organizacion que deseas administrar. Luego podras ver su
              consumo y actualizar el plan.
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-2">
              <PlanOverviewCard summary={summary} loading={summaryLoading} />
              <SubscriptionQuotaCard />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-100">Cambiar de plan</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Selecciona otro plan disponible y decide si el cambio se aplica al instante o al final del ciclo.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {plansLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full rounded-md" />
                      <Skeleton className="h-20 w-full rounded-md" />
                    </div>
                  ) : plans.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No encontramos planes publicados para tu region. Escribenos para ayudarte con el cambio.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="plan-select">Plan disponible</Label>
                        <Select value={planCode} onValueChange={handlePlanSelect} disabled={planSubmitting}>
                          <SelectTrigger id="plan-select">
                            <SelectValue placeholder="Selecciona un plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map((plan) => (
                              <SelectItem key={plan.code} value={plan.code}>
                                <span className="flex flex-col">
                                  <span className="font-medium">{plan.name}</span>
                                  <span className="text-xs text-slate-500">
                                    {formatPrice(plan.price, plan.currency)}  {plan.interval.toUpperCase()}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedPlan ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                          <p className="font-semibold text-slate-800 dark:text-white">{selectedPlan.name}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {selectedPlan.interval.toUpperCase()}  {formatPrice(selectedPlan.price, selectedPlan.currency)}
                          </p>
                          {selectedPlan.description ? (
                            <p className="mt-2 text-slate-600 dark:text-slate-300">{selectedPlan.description}</p>
                          ) : null}
                          {selectedPlan.features ? (
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-300">
                              {Object.entries(selectedPlan.features).map(([feature, value]) => (
                                <li key={feature}>
                                  <span className="font-medium capitalize">{feature.replace(/_/g, " ")}:</span>{" "}
                                  <span>{String(value)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">Aplicar inmediatamente</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Si esta activo, prorratearemos el cambio de plan de forma automatica.
                          </p>
                        </div>
                        <Switch
                          checked={effectiveImmediately}
                          onCheckedChange={setEffectiveImmediately}
                          disabled={planSubmitting}
                        />
                      </div>

                      <Button
                        className="w-full"
                        onClick={handlePlanChange}
                        disabled={planSubmitting || plans.length === 0 || isSamePlan}
                      >
                        {planSubmitting
                          ? "Registrando cambio..."
                          : isSamePlan
                            ? "Plan actualmente vigente"
                            : "Solicitar cambio"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-amber-100 shadow-sm dark:border-amber-800/70 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-100">Cancelar suscripcion</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Inicia el proceso de cancelacion y dinos como podemos mejorar. Puedes solicitar una exportacion de tus
                    datos antes de limpiar la cuenta.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason">Motivo de cancelacion</Label>
                    <Select value={cancelReason} onValueChange={setCancelReason} disabled={cancelSubmitting}>
                      <SelectTrigger id="cancel-reason">
                        <SelectValue placeholder="Selecciona un motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {CANCEL_REASONS.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cancel-notes">Comentarios adicionales</Label>
                    <Textarea
                      id="cancel-notes"
                      placeholder="Cuentanos que ocurrio o que necesitamos mejorar"
                      value={cancelNotes}
                      onChange={(event) => setCancelNotes(event.target.value)}
                      disabled={cancelSubmitting}
                      rows={4}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Usaremos esta informacion para mejorar el producto y apoyar futuros regresos.
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-slate-900/50">
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-300">Cancelar de inmediato</p>
                      <p className="text-xs text-amber-800/80 dark:text-amber-200/90">
                        Si prefieres, podemos mantener el acceso hasta el final del ciclo vigente.
                      </p>
                    </div>
                    <Switch
                      checked={cancelImmediately}
                      onCheckedChange={setCancelImmediately}
                      disabled={cancelSubmitting}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/account/exports">Exportar antes de cancelar</Link>
                    </Button>
                    <span className="self-center">
                      Eliminar datos demo y exportar tu informacion ayuda a que el proceso sea reversible si cambias de
                      opinion.
                    </span>
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleCancelSubscription}
                    disabled={cancelSubmitting}
                  >
                    {cancelSubmitting ? "Procesando..." : "Confirmar cancelacion"}
                  </Button>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function PlanOverviewCard({ summary, loading }: { summary: SubscriptionSummary | null; loading: boolean }) {
  if (loading) {
    return (
      <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
      <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">Plan de suscripcion</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 dark:text-slate-400">
          No pudimos cargar el resumen de suscripcion. Intenta nuevamente o revisa tu conexion.
        </CardContent>
      </Card>
    )
  }

  const { plan, trial } = summary

  return (
    <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <CardHeader className="flex flex-col gap-2">
        <CardTitle className="flex items-center justify-between text-slate-800 dark:text-slate-100">
          Plan actual
          <Badge variant="outline">{STATUS_LABEL[plan.status]}</Badge>
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Estas usando el plan {plan.name}. Cualquier cambio se reflejara en tu proximo ciclo de facturacion.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {trial?.isTrial ? (
          <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-800 dark:border-sky-900 dark:bg-sky-900/30 dark:text-slate-100">
            <p className="font-medium">Periodo de prueba activo</p>
            <p>
              {trial.daysLeft !== null
                ? `Te quedan ${trial.daysLeft} dia(s) antes de que termine la prueba.`
                : "Tu prueba se encuentra activa. Aprovecha para completar el onboarding."}
            </p>
          </div>
        ) : null}
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-100">Codigo:</span> {plan.code}
          </li>
          <li>
            <span className="font-medium text-slate-800 dark:text-slate-100">Estado:</span>{" "}
            {STATUS_LABEL[plan.status]}
          </li>
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

function PlanSkeleton() {
  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <Skeleton className="h-8 w-72" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </main>
    </div>
  )
}

function formatPrice(amount: string, currency: string) {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) {
    return `${currency} ${amount}`
  }
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currency || "PEN",
    minimumFractionDigits: 2,
  }).format(numeric)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString("es-PE", { dateStyle: "medium" })
}
