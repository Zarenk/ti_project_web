"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import { cn } from "@/lib/utils"
import type { SubscriptionSummary, SubscriptionStatus } from "@/types/subscription"
import {
  cancelSubscription,
  fetchSubscriptionPlans,
  requestPlanChange,
  grantComplimentarySubscription,
  type SubscriptionPlan,
} from "../billing.api"
import { useAccountAccessGuard } from "../use-account-access"
import { listOrganizationsWithCompanies, type OrganizationCompaniesOverview } from "@/app/dashboard/tenancy/tenancy.api"
import { useAuth } from "@/context/auth-context"

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

const COMPLIMENTARY_DURATIONS = [
  { value: "1", label: "1 mes" },
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "1 año" },
]

type GlobalPlanUsage = {
  orgId: number
  orgName: string
  planName: string
  planCode: string
  status: SubscriptionStatus
  users: UsageMetric
  invoices: UsageMetric
  storageMB: UsageMetric
  alert: string
  hasIssue: boolean
  summary: SubscriptionSummary | null
}

type UsageMetric = {
  used: number
  limit: number | null
  percent: number | null
}

export default function PlanUsagePage() {
  const accessReady = useAccountAccessGuard()
  const { selection, version } = useTenantSelection()
  const { role } = useAuth()
  const searchParams = useSearchParams()
  const organizationId = selection?.orgId ?? null
  const normalizedRole = role?.toUpperCase() ?? ""
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL"
  const planSectionRef = useRef<HTMLDivElement | null>(null)
  const cleanedQueryRef = useRef(false)
  const requestedOrgId = useMemo(() => {
    const raw = searchParams?.get("orgId") ?? ""
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [searchParams])
  const shouldAutoFocus = useMemo(() => {
    const focus = searchParams?.get("focus")
    return focus === "plan"
  }, [searchParams])

  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [planCode, setPlanCode] = useState("")
  const [planLockedToSummary, setPlanLockedToSummary] = useState(true)
  const [effectiveImmediately, setEffectiveImmediately] = useState(false)
  const [planSubmitting, setPlanSubmitting] = useState(false)
  const [complimentaryDuration, setComplimentaryDuration] = useState("1")
  const [complimentaryReason, setComplimentaryReason] = useState("")
  const [complimentaryPlanCode, setComplimentaryPlanCode] = useState("")
  const [complimentarySubmitting, setComplimentarySubmitting] = useState(false)

  const [cancelReason, setCancelReason] = useState("")
  const [cancelNotes, setCancelNotes] = useState("")
  const [cancelImmediately, setCancelImmediately] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [globalUsage, setGlobalUsage] = useState<GlobalPlanUsage[]>([])
  const [globalUsageLoading, setGlobalUsageLoading] = useState(false)
  const [globalUsageError, setGlobalUsageError] = useState<string | null>(null)
  const [globalSearch, setGlobalSearch] = useState("")
  const [globalPageSize, setGlobalPageSize] = useState(10)
  const [globalPage, setGlobalPage] = useState(1)
  const [globalSelectedOrgId, setGlobalSelectedOrgId] = useState<number | null>(null)
  const [globalSelectedSummary, setGlobalSelectedSummary] = useState<SubscriptionSummary | null>(null)

  const targetOrgId = isGlobalSuperAdmin ? globalSelectedOrgId : organizationId
  const targetSummary = isGlobalSuperAdmin ? globalSelectedSummary : summary
  const planOverviewLoading = isGlobalSuperAdmin
    ? !!globalSelectedOrgId && !globalSelectedSummary
    : summaryLoading

  const loadSummary = useCallback(async () => {
    if (!organizationId) {
      setSummary(null)
      setSummaryLoading(false)
      return
    }
    setSummaryLoading(true)
    try {
      const data = await fetchSubscriptionSummary(organizationId)
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
    if (!organizationId && !isGlobalSuperAdmin) {
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
        if (targetSummary?.plan?.code) return targetSummary.plan.code
        return list[0]?.code ?? ""
      })
    } catch (error) {
      console.error(error)
      toast.error("No pudimos cargar los planes disponibles.")
      setPlans([])
    } finally {
      setPlansLoading(false)
    }
  }, [organizationId, targetSummary?.plan?.code, isGlobalSuperAdmin])

  const refreshGlobalUsage = useCallback(async () => {
    if (!isGlobalSuperAdmin) return
    setGlobalUsageLoading(true)
    try {
      const organizations = await listOrganizationsWithCompanies()
      const rows = await Promise.all(
        organizations.map(async (org) => {
          try {
            const summary = await fetchSubscriptionSummary(org.id)
            return buildGlobalPlanUsage(org, summary)
          } catch (error) {
            console.error("[plan] resumen global", org.id, error)
            return buildGlobalPlanUsage(org, null)
          }
        })
      )
      rows.sort((a, b) => a.orgName.localeCompare(b.orgName, "es", { sensitivity: "base" }))
      setGlobalUsage(rows)
      setGlobalUsageError(null)
    } catch (error) {
      console.error("[plan] listado global", error)
      setGlobalUsage([])
      setGlobalUsageError("No pudimos consultar las organizaciones.")
    } finally {
      setGlobalUsageLoading(false)
    }
  }, [isGlobalSuperAdmin])

  useEffect(() => {
    if (!accessReady) return
    void loadSummary()
  }, [accessReady, loadSummary, version])

  useEffect(() => {
    if (!accessReady) return
    void loadPlans()
  }, [accessReady, loadPlans, version])

  useEffect(() => {
    if (!accessReady || !isGlobalSuperAdmin) return
    void refreshGlobalUsage()
  }, [accessReady, isGlobalSuperAdmin, refreshGlobalUsage])

  useEffect(() => {
    if (!accessReady || !isGlobalSuperAdmin) return
    if (!requestedOrgId) return
    if (globalSelectedOrgId !== requestedOrgId) {
      setGlobalSelectedOrgId(requestedOrgId)
      setGlobalSelectedSummary(null)
    }
  }, [accessReady, isGlobalSuperAdmin, requestedOrgId, globalSelectedOrgId])

  useEffect(() => {
    if (!accessReady || !isGlobalSuperAdmin) return
    if (!shouldAutoFocus && !requestedOrgId) return
    const target = planSectionRef.current
    if (!target) return
    const raf = requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    })
    if (!cleanedQueryRef.current && (requestedOrgId || shouldAutoFocus)) {
      cleanedQueryRef.current = true
      setTimeout(() => {
        if (typeof window !== "undefined") {
          const cleanPath = window.location.pathname
          window.history.replaceState(null, "", cleanPath)
        }
      }, 350)
    }
    return () => cancelAnimationFrame(raf)
  }, [accessReady, isGlobalSuperAdmin, shouldAutoFocus, requestedOrgId])

  useEffect(() => {
    if (!isGlobalSuperAdmin) {
      setGlobalUsage([])
      setGlobalUsageLoading(false)
      setGlobalUsageError(null)
      setGlobalSearch("")
      setGlobalSelectedOrgId(null)
      setGlobalSelectedSummary(null)
    }
  }, [isGlobalSuperAdmin])

  useEffect(() => {
    setPlanLockedToSummary(true)
    setPlanCode("")
    setComplimentaryPlanCode((current) => current || targetSummary?.plan?.code || "")
  }, [targetOrgId])

  useEffect(() => {
    if (!planLockedToSummary) return
    if (targetSummary?.plan?.code) {
      setPlanCode(targetSummary.plan.code)
    } else if (!targetSummary && plans.length > 0 && !planCode) {
      setPlanCode(plans[0].code)
    }
  }, [planLockedToSummary, targetSummary, plans, planCode])

  useEffect(() => {
    if (complimentaryPlanCode) return
    if (targetSummary?.plan?.code) {
      setComplimentaryPlanCode(targetSummary.plan.code)
      return
    }
    if (plans.length > 0) {
      setComplimentaryPlanCode(plans[0].code)
    }
  }, [complimentaryPlanCode, targetSummary?.plan?.code, plans])

  const handlePlanSelect = (value: string) => {
    setPlanLockedToSummary(false)
    setPlanCode(value)
  }

  const selectedPlan = useMemo(() => plans.find((plan) => plan.code === planCode), [planCode, plans])
  const isSamePlan = targetSummary?.plan?.code ? targetSummary.plan.code === planCode : true
  const complimentaryPlan = useMemo(
    () => plans.find((plan) => plan.code === complimentaryPlanCode) ?? null,
    [plans, complimentaryPlanCode],
  )
  const complimentaryPreview = useMemo(() => {
    const months = Number(complimentaryDuration)
    if (!Number.isFinite(months) || months <= 0) return null
    const start = new Date()
    const end = new Date(start)
    end.setMonth(end.getMonth() + months)
    return { start, end, months }
  }, [complimentaryDuration])

  const filteredGlobalUsage = useMemo(() => {
    const needle = globalSearch.trim().toLowerCase()
    if (!needle) return globalUsage
    return globalUsage.filter((row) => {
      return (
        row.orgName.toLowerCase().includes(needle) ||
        row.planName.toLowerCase().includes(needle) ||
        row.planCode.toLowerCase().includes(needle)
      )
    })
  }, [globalUsage, globalSearch])

  useEffect(() => {
    setGlobalPage(1)
  }, [globalSearch, globalPageSize])

  useEffect(() => {
    setGlobalPage(1)
  }, [filteredGlobalUsage.length])

  const globalTotalPages = Math.max(1, Math.ceil(Math.max(filteredGlobalUsage.length, 1) / globalPageSize))

  useEffect(() => {
    if (globalPage > globalTotalPages) {
      setGlobalPage(globalTotalPages)
    }
  }, [globalTotalPages, globalPage])

  const globalStartIndex = filteredGlobalUsage.length === 0 ? 0 : (globalPage - 1) * globalPageSize
  const paginatedGlobalUsage = filteredGlobalUsage.slice(globalStartIndex, globalStartIndex + globalPageSize)
  const globalRangeStart = filteredGlobalUsage.length === 0 ? 0 : globalStartIndex + 1
  const globalRangeEnd =
    filteredGlobalUsage.length === 0 ? 0 : Math.min(globalStartIndex + globalPageSize, filteredGlobalUsage.length)

  const handleGlobalRowSelect = useCallback((row: GlobalPlanUsage) => {
    setGlobalSelectedOrgId(row.orgId)
    setGlobalSelectedSummary(row.summary)
    setPlanLockedToSummary(true)
    setPlanCode("")
  }, [])

  useEffect(() => {
    if (!isGlobalSuperAdmin) return
    if (!globalSelectedOrgId) return
    if (globalUsageLoading) return
    const match = globalUsage.find((row) => row.orgId === globalSelectedOrgId)
    if (!match) {
      if (requestedOrgId && globalSelectedOrgId === requestedOrgId) {
        return
      }
      setGlobalSelectedOrgId(null)
      setGlobalSelectedSummary(null)
      return
    }
    if (match.summary !== globalSelectedSummary) {
      setGlobalSelectedSummary(match.summary)
    }
  }, [
    globalUsage,
    globalUsageLoading,
    globalSelectedOrgId,
    globalSelectedSummary,
    isGlobalSuperAdmin,
    requestedOrgId,
  ])

  const handlePlanChange = async () => {
    if (!targetOrgId) {
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
        organizationId: targetOrgId,
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
      if (isGlobalSuperAdmin) {
        await refreshGlobalUsage()
      } else {
        void loadSummary()
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No pudimos ejecutar el cambio de plan.")
    } finally {
      setPlanSubmitting(false)
    }
  }

  const handleComplimentaryGrant = async () => {
    if (!targetOrgId) {
      toast.error("Selecciona una organizacion activa para continuar.")
      return
    }
    if (!complimentaryPlanCode) {
      toast.error("Selecciona un plan para activar la membresia.")
      return
    }
    const months = Number(complimentaryDuration)
    if (!Number.isFinite(months) || months <= 0) {
      toast.error("Selecciona una duracion valida.")
      return
    }
    setComplimentarySubmitting(true)
    try {
      await grantComplimentarySubscription({
        organizationId: targetOrgId,
        planCode: complimentaryPlanCode,
        durationMonths: months,
        reason: complimentaryReason.trim() || undefined,
      })
      toast.success("Membresia sin pago activada correctamente.")
      setComplimentaryReason("")
      if (isGlobalSuperAdmin) {
        await refreshGlobalUsage()
      } else {
        void loadSummary()
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo activar la membresia sin pago.")
    } finally {
      setComplimentarySubmitting(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!targetOrgId) {
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
        organizationId: targetOrgId,
        cancelImmediately,
        reasonCategory: cancelReason === "other" ? undefined : cancelReason,
        customReason: cancelReason === "other" ? cancelNotes.trim() : cancelNotes.trim() || undefined,
      })
      toast.success("Programamos la cancelacion. Te notificaremos por correo.")
      setCancelNotes("")
      setCancelReason("")
      setCancelImmediately(false)
      if (isGlobalSuperAdmin) {
        await refreshGlobalUsage()
      } else {
        void loadSummary()
      }
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
        {isGlobalSuperAdmin && (
          <GlobalOrganizationsUsageCard
            loading={globalUsageLoading}
            error={globalUsageError}
            rows={paginatedGlobalUsage}
            totalRows={filteredGlobalUsage.length}
            rangeStart={globalRangeStart}
            rangeEnd={globalRangeEnd}
            search={globalSearch}
            onSearchChange={setGlobalSearch}
            onRefresh={refreshGlobalUsage}
            page={globalPage}
            totalPages={globalTotalPages}
            pageSize={globalPageSize}
            onPageChange={setGlobalPage}
            onPageSizeChange={setGlobalPageSize}
            selectedOrgId={globalSelectedOrgId}
            onSelect={handleGlobalRowSelect}
          />
        )}
        <div id="plan-selection" ref={planSectionRef} className="scroll-mt-28">
          {!targetOrgId ? (
            <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Selecciona una organizacion</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-300">
              {isGlobalSuperAdmin
                ? "Elige una organización desde la tabla de supervisión para visualizar y gestionar su plan."
                : "Usa el conmutador de equipos para elegir la organización que deseas administrar. Luego podrás ver su consumo y actualizar el plan."}
            </CardContent>
            </Card>
          ) : (
            <>
            <section className="grid gap-6 lg:grid-cols-2">
              <PlanOverviewCard summary={targetSummary} loading={planOverviewLoading} />
              {targetOrgId ? <SubscriptionQuotaCard organizationId={targetOrgId} /> : null}
            </section>

            {isGlobalSuperAdmin ? (
              <section className="grid gap-6 lg:grid-cols-2">
                <Card className="border-emerald-100 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900">
                  <CardHeader>
                    <CardTitle className="text-slate-800 dark:text-slate-100">
                      Membresia sin pago (solo Super Admin Global)
                    </CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Activa acceso temporal sin cobro y deja registro para auditoria.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {targetSummary?.complimentary?.isActive ? (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-100">
                        <p className="font-semibold">Cortesia activa</p>
                        <p>
                          Vence el {targetSummary.complimentary?.endsAt ? formatDate(targetSummary.complimentary.endsAt) : "—"}.
                        </p>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label htmlFor="complimentary-plan">Plan a aplicar</Label>
                      <Select
                        value={complimentaryPlanCode}
                        onValueChange={setComplimentaryPlanCode}
                        disabled={complimentarySubmitting}
                      >
                        <SelectTrigger id="complimentary-plan">
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

                    <div className="space-y-2">
                      <Label htmlFor="complimentary-duration">Duracion</Label>
                      <Select
                        value={complimentaryDuration}
                        onValueChange={setComplimentaryDuration}
                        disabled={complimentarySubmitting}
                      >
                        <SelectTrigger id="complimentary-duration">
                          <SelectValue placeholder="Selecciona una duracion" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLIMENTARY_DURATIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {complimentaryPreview ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Se aplicara desde hoy hasta {formatDate(complimentaryPreview.end.toISOString())}.
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complimentary-reason">Motivo (opcional)</Label>
                      <Textarea
                        id="complimentary-reason"
                        placeholder="Ej: cortesia comercial, soporte, incidente."
                        value={complimentaryReason}
                        onChange={(event) => setComplimentaryReason(event.target.value)}
                        disabled={complimentarySubmitting}
                        rows={3}
                      />
                    </div>

                    {complimentaryPlan ? (
                      <div className="rounded-lg border border-dashed border-emerald-100 bg-white/70 p-4 text-sm text-slate-700 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900/60 dark:text-slate-200">
                        <p className="font-semibold text-slate-800 dark:text-white">{complimentaryPlan.name}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {complimentaryPlan.interval.toUpperCase()}  {formatPrice(complimentaryPlan.price, complimentaryPlan.currency)}
                        </p>
                      </div>
                    ) : null}

                    <Button
                      className="w-full"
                      onClick={handleComplimentaryGrant}
                      disabled={complimentarySubmitting || plansLoading || plans.length === 0}
                    >
                      {complimentarySubmitting ? "Activando..." : "Activar membresia sin pago"}
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <CardHeader>
                    <CardTitle className="text-slate-800 dark:text-slate-100">Detalles de auditoria</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Esta accion queda registrada en el historial y exportaciones de la organizacion.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>Se registra: plan aplicado, fechas, duracion y usuario administrador que lo activó.</p>
                    {targetSummary?.complimentary?.grantedAt ? (
                      <p>
                        Ultima activacion: {formatDate(targetSummary.complimentary.grantedAt)}.
                      </p>
                    ) : (
                      <p>No hay activaciones registradas para esta organizacion.</p>
                    )}
                  </CardContent>
                </Card>
              </section>
            ) : null}

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
        </div>
      </main>
    </div>
  )
}

type GlobalUsageCardProps = {
  loading: boolean
  error: string | null
  rows: GlobalPlanUsage[]
  totalRows: number
  rangeStart: number
  rangeEnd: number
  page: number
  totalPages: number
  pageSize: number
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  selectedOrgId: number | null
  onSelect: (row: GlobalPlanUsage) => void
}

function GlobalOrganizationsUsageCard({
  loading,
  error,
  rows,
  totalRows,
  rangeStart,
  rangeEnd,
  page,
  totalPages,
  pageSize,
  search,
  onSearchChange,
  onRefresh,
  onPageChange,
  onPageSizeChange,
  selectedOrgId,
  onSelect,
}: GlobalUsageCardProps) {
  return (
    <Card className="border-violet-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-slate-800 dark:text-slate-100">Supervisión del consumo</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Revisa el plan y uso de cada organización para anticipar upgrades o incidencias.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              placeholder="Buscar por organización o plan"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="sm:min-w-[260px]"
            />
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="cursor-pointer">
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`global-plan-skeleton-${index}`} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No encontramos organizaciones con los criterios actuales.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-4">Organización</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Usuarios</th>
                    <th className="py-2 pr-4">Facturas</th>
                    <th className="py-2 pr-4">Almacenamiento</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 text-left">Alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const statusVariant = row.hasIssue || row.status !== "ACTIVE" ? "secondary" : "outline"
                    const isSelected = selectedOrgId === row.orgId
                    return (
                      <tr
                        key={row.orgId}
                        className={cn(
                          "cursor-pointer border-t border-slate-100 text-slate-700 transition-colors hover:bg-sky-50/60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60",
                          isSelected &&
                            "bg-sky-100/70 ring-1 ring-sky-300/70 shadow-sm dark:bg-slate-800/80 dark:ring-sky-700/60"
                        )}
                        onClick={() => onSelect(row)}
                      >
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{row.orgName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">ID #{row.orgId}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-800 dark:text-slate-100">{row.planName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Código {row.planCode}</div>
                        </td>
                        <td className="py-3 pr-4 font-medium">{formatUsageMetric(row.users, "usuarios")}</td>
                        <td className="py-3 pr-4 font-medium">{formatUsageMetric(row.invoices, "facturas")}</td>
                        <td className="py-3 pr-4 font-medium">{formatStorageUsage(row.storageMB)}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusVariant}>{STATUS_LABEL[row.status]}</Badge>
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-xs font-semibold ${
                              row.hasIssue
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {row.alert}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
              <div>
                Mostrando {rangeStart === 0 ? 0 : rangeStart}-{rangeEnd} de {totalRows} organizaciones
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2">
                  <span>Ver:</span>
                  <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
                    <SelectTrigger className="h-8 w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size} filas
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={page <= 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={page >= totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
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

  const { plan, trial, complimentary } = summary

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
        {summary.organization?.name ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
            Organizacion: {summary.organization.name}
          </div>
        ) : null}
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
        {complimentary?.isActive ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-100">
            <p className="font-medium">Membresia sin pago activa</p>
            <p>
              Vence el {complimentary.endsAt ? formatDate(complimentary.endsAt) : "—"}.
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

function buildGlobalPlanUsage(
  org: OrganizationCompaniesOverview,
  summary: SubscriptionSummary | null
): GlobalPlanUsage {
  const fallbackMetric: UsageMetric = { used: 0, limit: null, percent: null }

  if (!summary) {
    return {
      orgId: org.id,
      orgName: org.name,
      planName: "Sin datos",
      planCode: "N/D",
      status: "ACTIVE",
      users: fallbackMetric,
      invoices: fallbackMetric,
      storageMB: fallbackMetric,
      alert: "Sin datos disponibles",
      hasIssue: true,
      summary: null,
    }
  }

  const planStatus = summary.plan.status
  const users = computeUsageMetric(summary.usage?.users, summary.quotas?.users)
  const invoices = computeUsageMetric(summary.usage?.invoices, summary.quotas?.invoices)
  const storageMB = computeUsageMetric(summary.usage?.storageMB, summary.quotas?.storageMB)

  let alert = "Consumo saludable"
  let hasIssue = false

  const metrics = [users, invoices, storageMB]
  const exceeded = metrics.some((metric) => metric.percent !== null && metric.percent >= 100)
  const warning = metrics.some((metric) => metric.percent !== null && metric.percent >= 90)

  if (exceeded) {
    alert = "Límite excedido en uno de los recursos"
    hasIssue = true
  } else if (warning) {
    alert = "Cerca al límite permitido"
    hasIssue = true
  }

  if (planStatus !== "ACTIVE") {
    alert = `Estado ${STATUS_LABEL[planStatus].toLowerCase()}`
    hasIssue = true
  }

  return {
    orgId: org.id,
    orgName: org.name,
    planName: summary.plan.name,
    planCode: summary.plan.code,
    status: planStatus,
    users,
    invoices,
    storageMB,
    alert,
    hasIssue,
    summary,
  }
}

function computeUsageMetric(used?: number, limit?: number | null): UsageMetric {
  const safeUsed = typeof used === "number" && Number.isFinite(used) ? used : 0
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.max(1, Math.floor(limit)) : null
  const percent = safeLimit ? Math.round((safeUsed / safeLimit) * 100) : null
  return {
    used: safeUsed,
    limit: safeLimit,
    percent: percent !== null ? Math.min(percent, 999) : null,
  }
}

function formatUsageMetric(metric: UsageMetric, label: string) {
  if (metric.limit === null) {
    return `${metric.used} ${label} (sin límite)`
  }
  const percentText = metric.percent !== null ? ` (${metric.percent}%)` : ""
  return `${metric.used}/${metric.limit} ${label}${percentText}`
}

function formatStorageUsage(metric: UsageMetric) {
  const used = formatStorageValue(metric.used)
  const total = metric.limit === null ? "sin límite" : formatStorageValue(metric.limit)
  const percentText = metric.percent !== null ? ` (${metric.percent}%)` : ""
  return `${used} / ${total}${percentText}`
}

function formatStorageValue(value: number) {
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} GB`
  }
  return `${value} MB`
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
