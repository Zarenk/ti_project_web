"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Clock } from "lucide-react"

import { SubscriptionQuotaCard } from "@/components/subscription-quota-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import { useAuth } from "@/context/auth-context"
import { queryKeys } from "@/lib/query-keys"
import { fetchSubscriptionPlans, type SubscriptionPlan } from "../billing.api"
import { useAccountAccessGuard } from "../use-account-access"

import {
  CANCEL_REASONS,
  COMPLIMENTARY_DURATIONS,
  formatDate,
  formatPrice,
  humanizeFeatureKey,
  humanizeFeatureValue,
} from "./plan-utils"
import { usePlanManagement } from "./use-plan-management"
import { useGlobalUsage } from "./use-global-usage"
import { GlobalOrganizationsUsageCard } from "./global-usage-card"
import { PlanOverviewCard } from "./plan-overview-card"
import { PlanSkeleton } from "./plan-skeleton"

// Stable empty array to prevent infinite re-render loops in bridge useEffects.
const STABLE_EMPTY: SubscriptionPlan[] = []

export default function PlanUsagePage() {
  const accessReady = useAccountAccessGuard()
  const { selection } = useTenantSelection()
  const queryClient = useQueryClient()
  const { role } = useAuth()
  const searchParams = useSearchParams()
  const organizationId = selection?.orgId ?? null
  const normalizedRole = role?.toUpperCase() ?? ""
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL"
  const planSectionRef = useRef<HTMLDivElement | null>(null)

  const requestedOrgId = useMemo(() => {
    const raw = searchParams?.get("orgId") ?? ""
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [searchParams])
  const shouldAutoFocus = useMemo(() => searchParams?.get("focus") === "plan", [searchParams])

  // ── Data fetching ────────────────────────────────────────────
  const { data: summary = null, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.subscriptions.plan(selection.orgId, selection.companyId),
    queryFn: async () => {
      if (!organizationId) return null
      return fetchSubscriptionSummary(organizationId)
    },
    enabled: accessReady && !!organizationId,
  })

  const { data: plansData = STABLE_EMPTY, isLoading: plansLoading } = useQuery({
    queryKey: [...queryKeys.subscriptions.root(selection.orgId, selection.companyId), "plans"],
    queryFn: () => fetchSubscriptionPlans(),
    enabled: accessReady && (!!organizationId || isGlobalSuperAdmin),
  })

  // ── Plans list sync ──────────────────────────────────────────
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  useEffect(() => {
    setPlans(plansData)
  }, [plansData])

  // ── Global usage (Super Admin) ───────────────────────────────
  const globalUsage = useGlobalUsage({
    accessReady,
    isGlobalSuperAdmin,
    requestedOrgId,
    shouldAutoFocus,
    planSectionRef,
  })

  const targetOrgId = isGlobalSuperAdmin ? globalUsage.selectedOrgId : organizationId
  const targetSummary = isGlobalSuperAdmin ? globalUsage.selectedSummary : summary
  const planOverviewLoading = isGlobalSuperAdmin
    ? !!globalUsage.selectedOrgId && !globalUsage.selectedSummary
    : summaryLoading

  const loadSummary = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.plan(selection.orgId, selection.companyId) })
  }, [queryClient, selection.orgId, selection.companyId])

  // ── Plan management hook ─────────────────────────────────────
  const mgmt = usePlanManagement({
    targetOrgId,
    targetSummary,
    plans,
    plansLoading,
    isGlobalSuperAdmin,
    refreshGlobalUsage: globalUsage.refresh,
    loadSummary,
  })

  // Sync plan code from plans list
  useEffect(() => {
    if (mgmt.planCode) return
    if (targetSummary?.plan?.code) return
    if (plans.length > 0) {
      mgmt.handlePlanSelect(plans[0].code)
    }
  }, [plans]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!accessReady) return <PlanSkeleton />

  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      {/* ── Header ── */}
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:gap-4 px-4 py-4 sm:py-6 md:flex-row md:items-center md:justify-between md:py-8">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Configuracion de cuenta</p>
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-white">Consumo y gestion del plan</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Revisa el uso de tu suscripcion, cambia de plan o cancela de forma autoservicio.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <Button variant="outline" asChild className="cursor-pointer text-xs sm:text-sm h-8 sm:h-9">
              <Link href="/dashboard/account">Volver a mi cuenta</Link>
            </Button>
            <Button variant="secondary" asChild className="cursor-pointer text-xs sm:text-sm h-8 sm:h-9">
              <Link href="/dashboard/account/billing">Facturacion</Link>
            </Button>
            <Button asChild className="cursor-pointer text-xs sm:text-sm h-8 sm:h-9">
              <Link href="/dashboard/account/exports">Exportaciones</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 sm:space-y-6 px-4 py-4 sm:py-8">
        {/* ── Global usage table (Super Admin) ── */}
        {isGlobalSuperAdmin && (
          <GlobalOrganizationsUsageCard
            loading={globalUsage.loading}
            error={globalUsage.error}
            rows={globalUsage.paginatedRows}
            totalRows={globalUsage.totalRows}
            search={globalUsage.search}
            onSearchChange={globalUsage.setSearch}
            onRefresh={globalUsage.refresh}
            page={globalUsage.page}
            totalPages={globalUsage.totalPages}
            pageSize={globalUsage.pageSize}
            onPageChange={globalUsage.setPage}
            onPageSizeChange={globalUsage.setPageSize}
            selectedOrgId={globalUsage.selectedOrgId}
            onSelect={globalUsage.onSelect}
          />
        )}

        {/* ── Plan section ── */}
        <div id="plan-selection" ref={planSectionRef} className="scroll-mt-28">
          {!targetOrgId ? (
            <Card className="border-sky-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-slate-700 dark:bg-slate-900">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base text-slate-800 dark:text-slate-100">Selecciona una organizacion</CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 px-4 sm:px-6">
                {isGlobalSuperAdmin
                  ? "Elige una organizacion desde la tabla de supervision para visualizar y gestionar su plan."
                  : "Usa el conmutador de equipos para elegir la organizacion que deseas administrar."}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ── Overview + Quota ── */}
              <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                <PlanOverviewCard summary={targetSummary} loading={planOverviewLoading} />
                <SubscriptionQuotaCard
                  organizationId={targetOrgId}
                  summary={targetSummary}
                  loading={planOverviewLoading}
                />
              </section>

              {/* ── Super Admin tools ── */}
              {isGlobalSuperAdmin && (
                <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  {/* Trial config */}
                  <Card className="border-indigo-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-indigo-900/60 dark:bg-slate-900">
                    <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-slate-800 dark:text-slate-100">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 flex-shrink-0" />
                        Configuracion de Trial
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Ajusta la duracion del periodo de prueba para nuevas cuentas.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-4 sm:pb-6">
                      <div className="space-y-2">
                        <Label htmlFor="trial-plan-select" className="text-xs sm:text-sm">Plan</Label>
                        <Select
                          value={mgmt.trialPlanCode}
                          onValueChange={mgmt.handleTrialPlanSelect}
                          disabled={mgmt.trialDaysSubmitting || plansLoading}
                        >
                          <SelectTrigger id="trial-plan-select" className="cursor-pointer h-8 sm:h-9 text-xs sm:text-sm">
                            <SelectValue placeholder="Selecciona un plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map((plan) => (
                              <SelectItem key={plan.code} value={plan.code} className="cursor-pointer text-xs sm:text-sm">
                                {plan.name} ({plan.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trial-days-input" className="text-xs sm:text-sm">Dias de prueba</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            id="trial-days-input"
                            type="number"
                            min={1}
                            max={90}
                            value={mgmt.trialDays}
                            onChange={(e) => mgmt.setTrialDays(e.target.value)}
                            disabled={mgmt.trialDaysSubmitting}
                            placeholder="14"
                            className="w-20 sm:w-24 h-8 sm:h-9 text-xs sm:text-sm"
                          />
                          <Button variant="outline" size="sm" className="cursor-pointer h-8 text-xs" onClick={() => mgmt.setTrialDays("14")} disabled={mgmt.trialDaysSubmitting}>14 dias</Button>
                          <Button variant="outline" size="sm" className="cursor-pointer h-8 text-xs" onClick={() => mgmt.setTrialDays("30")} disabled={mgmt.trialDaysSubmitting}>30 dias</Button>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Valor entre 1 y 90. Trials existentes no se modifican.</p>
                      </div>
                      <Button className="w-full cursor-pointer h-8 sm:h-9 text-xs sm:text-sm" onClick={mgmt.handleTrialDaysUpdate} disabled={mgmt.trialDaysSubmitting || !mgmt.trialPlanCode || !mgmt.trialDays}>
                        {mgmt.trialDaysSubmitting ? "Guardando..." : "Guardar dias de prueba"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Complimentary + Audit */}
                  <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                    <Card className="border-emerald-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-emerald-900/60 dark:bg-slate-900">
                      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
                        <CardTitle className="text-sm sm:text-base text-slate-800 dark:text-slate-100">Membresia sin pago</CardTitle>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Activa acceso temporal sin cobro y deja registro para auditoria.</p>
                      </CardHeader>
                      <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-4 sm:pb-6">
                        {targetSummary?.complimentary?.isActive && (
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-100">
                            <p className="font-semibold">Cortesia activa</p>
                            <p>Vence el {targetSummary.complimentary?.endsAt ? formatDate(targetSummary.complimentary.endsAt) : "—"}.</p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="complimentary-plan" className="text-xs sm:text-sm">Plan a aplicar</Label>
                          <Select value={mgmt.complimentaryPlanCode} onValueChange={mgmt.setComplimentaryPlanCode} disabled={mgmt.complimentarySubmitting}>
                            <SelectTrigger id="complimentary-plan" className="cursor-pointer h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue placeholder="Selecciona un plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((plan) => (
                                <SelectItem key={plan.code} value={plan.code} className="cursor-pointer">
                                  <span className="flex flex-col">
                                    <span className="font-medium text-xs sm:text-sm">{plan.name}</span>
                                    <span className="text-[10px] sm:text-xs text-slate-500">{formatPrice(plan.price, plan.currency)} {plan.interval.toUpperCase()}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="complimentary-duration" className="text-xs sm:text-sm">Duracion</Label>
                          <Select value={mgmt.complimentaryDuration} onValueChange={mgmt.setComplimentaryDuration} disabled={mgmt.complimentarySubmitting}>
                            <SelectTrigger id="complimentary-duration" className="cursor-pointer h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue placeholder="Selecciona una duracion" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPLIMENTARY_DURATIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="cursor-pointer text-xs sm:text-sm">{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {mgmt.complimentaryPreview && (
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                              Se aplicara desde hoy hasta {formatDate(mgmt.complimentaryPreview.end.toISOString())}.
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="complimentary-reason" className="text-xs sm:text-sm">Motivo (opcional)</Label>
                          <Textarea id="complimentary-reason" placeholder="Ej: cortesia comercial, soporte, incidente." value={mgmt.complimentaryReason} onChange={(e) => mgmt.setComplimentaryReason(e.target.value)} disabled={mgmt.complimentarySubmitting} rows={3} className="text-xs sm:text-sm" />
                        </div>
                        {mgmt.complimentaryPlan && (
                          <div className="rounded-lg border border-dashed border-emerald-100 bg-white/70 p-3 sm:p-4 text-xs sm:text-sm text-slate-700 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900/60 dark:text-slate-200">
                            <p className="font-semibold text-slate-800 dark:text-white">{mgmt.complimentaryPlan.name}</p>
                            <p className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {mgmt.complimentaryPlan.interval.toUpperCase()} {formatPrice(mgmt.complimentaryPlan.price, mgmt.complimentaryPlan.currency)}
                            </p>
                          </div>
                        )}
                        <Button className="w-full cursor-pointer h-8 sm:h-9 text-xs sm:text-sm" onClick={mgmt.handleComplimentaryGrant} disabled={mgmt.complimentarySubmitting || plansLoading || plans.length === 0}>
                          {mgmt.complimentarySubmitting ? "Activando..." : "Activar membresia sin pago"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-slate-700 dark:bg-slate-900">
                      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
                        <CardTitle className="text-sm sm:text-base text-slate-800 dark:text-slate-100">Detalles de auditoria</CardTitle>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Esta accion queda registrada en el historial y exportaciones.</p>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 px-4 sm:px-6 pb-4 sm:pb-6">
                        <p>Se registra: plan aplicado, fechas, duracion y usuario administrador que lo activo.</p>
                        {targetSummary?.complimentary?.grantedAt ? (
                          <p>Ultima activacion: {formatDate(targetSummary.complimentary.grantedAt)}.</p>
                        ) : (
                          <p>No hay activaciones registradas para esta organizacion.</p>
                        )}
                      </CardContent>
                    </Card>
                  </section>
                </div>
              )}

              {/* ── Plan change + Cancel ── */}
              <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 mt-4 sm:mt-6">
                {/* Plan change card */}
                <Card className="border-sky-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-slate-700 dark:bg-slate-900">
                  <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
                    <CardTitle className="text-sm sm:text-base text-slate-800 dark:text-slate-100">Cambiar de plan</CardTitle>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Selecciona otro plan disponible y decide si el cambio se aplica al instante o al final del ciclo.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-4 sm:pb-6">
                    {plansLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-8 sm:h-10 w-full rounded-md" />
                        <Skeleton className="h-16 sm:h-20 w-full rounded-md" />
                      </div>
                    ) : plans.length === 0 ? (
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        No encontramos planes publicados para tu region.
                      </p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="plan-select" className="text-xs sm:text-sm">Plan disponible</Label>
                          <Select value={mgmt.planCode} onValueChange={mgmt.handlePlanSelect} disabled={mgmt.planSubmitting}>
                            <SelectTrigger id="plan-select" className="cursor-pointer h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue placeholder="Selecciona un plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((plan) => (
                                <SelectItem key={plan.code} value={plan.code} className="cursor-pointer">
                                  <span className="flex flex-col">
                                    <span className="font-medium text-xs sm:text-sm">{plan.name}</span>
                                    <span className="text-[10px] sm:text-xs text-slate-500">{formatPrice(plan.price, plan.currency)} {plan.interval.toUpperCase()}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Plan preview */}
                        {mgmt.selectedPlan && (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-3 sm:p-4 text-xs sm:text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 w-full min-w-0 overflow-hidden">
                            <p className="font-semibold text-slate-800 dark:text-white break-words">{mgmt.selectedPlan.name}</p>
                            <p className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {mgmt.selectedPlan.interval.toUpperCase()} {formatPrice(mgmt.selectedPlan.price, mgmt.selectedPlan.currency)}
                            </p>
                            {mgmt.selectedPlan.description && (
                              <p className="mt-2 text-slate-600 dark:text-slate-300 break-words">{mgmt.selectedPlan.description}</p>
                            )}
                            {mgmt.selectedPlan.features && (
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-300">
                                {Object.entries(mgmt.selectedPlan.features).map(([feature, value]) => (
                                  <li key={feature}>
                                    <span className="font-medium">{humanizeFeatureKey(feature)}:</span>{" "}
                                    <span>{humanizeFeatureValue(value)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {/* Immediate toggle */}
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm dark:border-slate-800 dark:bg-slate-900/40">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-100">Aplicar inmediatamente</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                              Si esta activo, prorratearemos el cambio de plan.
                            </p>
                          </div>
                          <Switch
                            checked={mgmt.effectiveImmediately}
                            onCheckedChange={mgmt.setEffectiveImmediately}
                            disabled={mgmt.planSubmitting}
                            className="cursor-pointer flex-shrink-0"
                          />
                        </div>

                        <Button
                          className="w-full cursor-pointer h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={mgmt.handlePlanChange}
                          disabled={mgmt.planSubmitting || plans.length === 0 || mgmt.isSamePlan}
                        >
                          {mgmt.planSubmitting
                            ? "Registrando cambio..."
                            : mgmt.isSamePlan
                              ? "Plan actualmente vigente"
                              : "Solicitar cambio"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Cancel subscription card */}
                <Card className="border-amber-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-amber-800/70 dark:bg-slate-900">
                  <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
                    <CardTitle className="text-sm sm:text-base text-slate-800 dark:text-slate-100">Cancelar suscripcion</CardTitle>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Inicia el proceso de cancelacion y dinos como podemos mejorar.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="space-y-2">
                      <Label htmlFor="cancel-reason" className="text-xs sm:text-sm">Motivo de cancelacion</Label>
                      <Select value={mgmt.cancelReason} onValueChange={mgmt.setCancelReason} disabled={mgmt.cancelSubmitting}>
                        <SelectTrigger id="cancel-reason" className="cursor-pointer h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Selecciona un motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {CANCEL_REASONS.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value} className="cursor-pointer text-xs sm:text-sm">{reason.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cancel-notes" className="text-xs sm:text-sm">Comentarios adicionales</Label>
                      <Textarea
                        id="cancel-notes"
                        placeholder="Cuentanos que ocurrio o que necesitamos mejorar"
                        value={mgmt.cancelNotes}
                        onChange={(e) => mgmt.setCancelNotes(e.target.value)}
                        disabled={mgmt.cancelSubmitting}
                        rows={4}
                        className="text-xs sm:text-sm"
                      />
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                        Usaremos esta informacion para mejorar el producto.
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm dark:border-amber-800 dark:bg-slate-900/50">
                      <div className="min-w-0">
                        <p className="font-medium text-amber-900 dark:text-amber-300">Cancelar de inmediato</p>
                        <p className="text-[10px] sm:text-xs text-amber-800/80 dark:text-amber-200/90">
                          Si prefieres, podemos mantener el acceso hasta el final del ciclo.
                        </p>
                      </div>
                      <Switch
                        checked={mgmt.cancelImmediately}
                        onCheckedChange={mgmt.setCancelImmediately}
                        disabled={mgmt.cancelSubmitting}
                        className="cursor-pointer flex-shrink-0"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                      <Button variant="ghost" size="sm" asChild className="cursor-pointer h-7 sm:h-8 text-[10px] sm:text-xs">
                        <Link href="/dashboard/account/exports">Exportar antes de cancelar</Link>
                      </Button>
                    </div>

                    {/* Confirmation AlertDialog */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="w-full cursor-pointer h-8 sm:h-9 text-xs sm:text-sm"
                          disabled={mgmt.cancelSubmitting || !mgmt.cancelReason || (mgmt.cancelReason === "other" && !mgmt.cancelNotes.trim())}
                        >
                          {mgmt.cancelSubmitting ? "Procesando..." : "Confirmar cancelacion"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-md w-full">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-sm sm:text-base">Cancelar suscripcion</AlertDialogTitle>
                          <AlertDialogDescription className="text-xs sm:text-sm">
                            {mgmt.cancelImmediately
                              ? "Tu suscripcion se cancelara de inmediato y perderas acceso a las funcionalidades del plan actual. Esta accion no se puede deshacer."
                              : "Tu suscripcion se cancelara al final del periodo de facturacion vigente. Mantendras acceso hasta esa fecha."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                          <AlertDialogCancel className="cursor-pointer text-xs sm:text-sm h-8 sm:h-9">Volver</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={mgmt.handleCancelSubscription}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer text-xs sm:text-sm h-8 sm:h-9"
                          >
                            Si, cancelar suscripcion
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
