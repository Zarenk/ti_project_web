
"use client"

import type { ComponentProps } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { SubscriptionPlanOption, SubscriptionSummary } from "@/types/subscription"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import { fetchSubscriptionPlans } from "@/lib/subscription-plans"
import { authFetch } from "@/utils/auth-fetch"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { listOrganizationsWithCompanies, type OrganizationCompaniesOverview } from "@/app/dashboard/tenancy/tenancy.api"
import { toast } from "sonner"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

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

      setInfo("El cambio se programa para el siguiente ciclo de facturacion.")
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
            Los cambios aplicaran inmediatamente despues del pago. Si eliges un plan de menor costo, se programara para el
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
  const { role } = useAuth()
  const normalizedRole = (role ?? "").toUpperCase()
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL"
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalPlans, setGlobalPlans] = useState<GlobalPlanRow[]>([])
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [globalSearch, setGlobalSearch] = useState("")
  const [globalSelectedSummary, setGlobalSelectedSummary] = useState<SubscriptionSummary | null>(null)
  const [globalSelectedOrgId, setGlobalSelectedOrgId] = useState<number | null>(null)
  const [globalPage, setGlobalPage] = useState(1)
  const [globalPageSize, setGlobalPageSize] = useState(10)
  const [globalDetailLoading, setGlobalDetailLoading] = useState(false)
  const detailRequestIdRef = useRef(0)
  const detailSectionRef = useRef<HTMLDivElement | null>(null)
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const data = await fetchSubscriptionSummary()
      setSummary(data)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar la informacion de la suscripcion."
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

  const refreshGlobalPlans = useCallback(async () => {
    if (!isGlobalSuperAdmin) return
    setGlobalLoading(true)
    try {
      const orgs = await listOrganizationsWithCompanies()
      const rows = await Promise.all(
        orgs.map(async (org) => {
          try {
            const summary = await fetchSubscriptionSummary(org.id)
            return buildGlobalPlanRow(org, summary)
          } catch (err) {
            console.error("[plan] global summary", org.id, err)
            return buildGlobalPlanRow(org, null)
          }
        })
      )
      rows.sort((a, b) => a.orgName.localeCompare(b.orgName, "es", { sensitivity: "base" }))
      setGlobalPlans(rows)
      setGlobalError(null)
    } catch (err) {
      console.error("[plan] global overview", err)
      setGlobalPlans([])
      setGlobalError("No pudimos obtener la informacion de las organizaciones.")
    } finally {
      setGlobalLoading(false)
    }
  }, [isGlobalSuperAdmin])

  useEffect(() => {
    let active = true
    Promise.all([loadSummary(), loadPlans()]).catch(() => {
      if (!active) return
    })
    return () => {
      active = false
    }
  }, [loadPlans, loadSummary])

  useEffect(() => {
    if (!isGlobalSuperAdmin) return
    refreshGlobalPlans()
  }, [isGlobalSuperAdmin, refreshGlobalPlans])

  const handleSummaryUpdated = useCallback(() => {
    if (isGlobalSuperAdmin) {
      refreshGlobalPlans()
    } else {
      loadSummary()
    }
  }, [isGlobalSuperAdmin, loadSummary, refreshGlobalPlans])

  const detailSummary = isGlobalSuperAdmin ? globalSelectedSummary : summary
  const currentPlanStatus = detailSummary ? STATUS_BADGE[detailSummary.plan.status] : null
  const summaryForActions: SubscriptionSummary = (detailSummary ?? summary)!
  const shouldShowDetailCards = !isGlobalSuperAdmin || Boolean(detailSummary)

  const summaryContent = useMemo(() => {
    if (!detailSummary) return null
    const contact = detailSummary.contacts.primary
    const companyName = detailSummary.company?.name ?? detailSummary.organization?.name ?? "-"
    const vigenciaSource = detailSummary.billing.currentPeriodEnd ?? detailSummary.trial.endsAt
    const vigenciaLabel = detailSummary.trial.isTrial ? "Fin de prueba" : "Vigencia hasta"

    return (
      <>
        <div className="space-y-2">
          <Label>Administrador de la empresa</Label>
          <Input value={contact ? `${contact.name} (${contact.email})` : "-"} readOnly className="font-medium" />
        </div>
        <div className="space-y-2">
          <Label>Nivel de cuenta</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={detailSummary.plan.name.toUpperCase()} readOnly className="font-semibold uppercase" />
            {currentPlanStatus ? (
              <Badge className={cn("px-3 py-1 text-xs font-semibold", currentPlanStatus.className)}>
                {currentPlanStatus.label}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCurrencyDisplay(detailSummary.plan.price, detailSummary.plan.currency)} / {INTERVAL_LABEL[detailSummary.plan.interval] ?? "mes"}
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
          <Label>Ultima renovacion</Label>
          <Input value={formatDateFromIso(detailSummary.billing.lastInvoicePaidAt)} readOnly />
        </div>
        <div className="space-y-2">
          <Label>Contacto asignado</Label>
          <Input value={contact ? contact.email : "-"} readOnly />
        </div>
      </>
    )
  }, [detailSummary, currentPlanStatus])

  const legacyInfo = useMemo(() => {
    if (!detailSummary?.plan.isLegacy) {
      return null
    }

    if (!detailSummary.plan.legacyGraceUntil) {
      return { show: true, daysLeft: null, formattedDate: null }
    }

    const graceDate = new Date(detailSummary.plan.legacyGraceUntil)
    if (Number.isNaN(graceDate.getTime())) {
      return { show: true, daysLeft: null, formattedDate: null }
    }

    const diffDays = Math.ceil((graceDate.getTime() - Date.now()) / MS_IN_DAY)
    return {
      show: diffDays <= 30,
      daysLeft: diffDays,
      formattedDate: formatDateFromIso(detailSummary.plan.legacyGraceUntil),
    }
  }, [detailSummary])

  const recommendedPlanCode = useMemo(() => {
    if (!detailSummary) return undefined
    return plans.find((plan) => plan.code !== detailSummary.plan.code)?.code
  }, [plans, detailSummary])

  const filteredGlobalPlans = useMemo(() => {
    if (!globalSearch.trim()) return globalPlans
    const needle = globalSearch.trim().toLowerCase()
    return globalPlans.filter((row) => {
      return (
        row.orgName.toLowerCase().includes(needle) ||
        row.planName.toLowerCase().includes(needle) ||
        row.planCode.toLowerCase().includes(needle)
      )
    })
  }, [globalPlans, globalSearch])

  useEffect(() => {
    if (!isGlobalSuperAdmin) return
    setGlobalPage(1)
  }, [globalSearch, isGlobalSuperAdmin])

  useEffect(() => {
    if (!isGlobalSuperAdmin) return
    const totalItems = filteredGlobalPlans.length
    const totalPages = Math.max(1, Math.ceil(totalItems / globalPageSize))
    const clampedPage = Math.min(Math.max(globalPage, 1), totalPages)
    if (clampedPage !== globalPage) {
      setGlobalPage(clampedPage)
    }
  }, [filteredGlobalPlans.length, globalPage, globalPageSize, isGlobalSuperAdmin])

  useEffect(() => {
    if (!isGlobalSuperAdmin || !globalSelectedOrgId) return
    const match = globalPlans.find((row) => row.orgId === globalSelectedOrgId)
    if (!match) {
      setGlobalSelectedOrgId(null)
      setGlobalSelectedSummary(null)
      setGlobalDetailLoading(false)
      return
    }
    if (match.summary !== globalSelectedSummary) {
      setGlobalSelectedSummary(match.summary)
      setGlobalDetailLoading(false)
    }
  }, [globalPlans, globalSelectedOrgId, globalSelectedSummary, isGlobalSuperAdmin])

  const globalPagination = useMemo(() => {
    const totalItems = filteredGlobalPlans.length
    if (totalItems === 0) {
      return {
        rows: [] as GlobalPlanRow[],
        totalItems,
        totalPages: 1,
        rangeStart: 0,
        rangeEnd: 0,
        currentPage: 1,
      }
    }
    const totalPages = Math.max(1, Math.ceil(totalItems / globalPageSize))
    const currentPage = Math.min(Math.max(globalPage, 1), totalPages)
    const startIndex = (currentPage - 1) * globalPageSize
    const endIndex = Math.min(startIndex + globalPageSize, totalItems)
    return {
      rows: filteredGlobalPlans.slice(startIndex, endIndex),
      totalItems,
      totalPages,
      rangeStart: startIndex + 1,
      rangeEnd: endIndex,
      currentPage,
    }
  }, [filteredGlobalPlans, globalPage, globalPageSize])

  const handleGlobalRowSelect = useCallback(
    async (row: GlobalPlanRow) => {
      setGlobalSelectedOrgId(row.orgId)
      setGlobalSelectedSummary(row.summary)
      detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      detailRequestIdRef.current += 1
      const requestId = detailRequestIdRef.current
      setGlobalDetailLoading(true)
      try {
        const latest = await fetchSubscriptionSummary(row.orgId)
        if (detailRequestIdRef.current === requestId) {
          setGlobalSelectedSummary(latest)
        }
      } catch (error) {
        console.error("[plan] detail summary", error)
        if (detailRequestIdRef.current === requestId) {
          toast.error("No pudimos cargar el detalle de la organizacion seleccionada.")
        }
      } finally {
        if (detailRequestIdRef.current === requestId) {
          setGlobalDetailLoading(false)
        }
      }
    },
    [],
  )

  const handleGlobalPageChange = useCallback((page: number) => {
    setGlobalPage(page)
  }, [])

  const handleGlobalPageSizeChange = useCallback((size: number) => {
    setGlobalPageSize(size)
    setGlobalPage(1)
  }, [])

  const paginatedGlobalPlans = globalPagination.rows
  const globalRangeStart = globalPagination.rangeStart
  const globalRangeEnd = globalPagination.rangeEnd
  const globalTotalItems = globalPagination.totalItems
  const globalTotalPages = globalPagination.totalPages
  const globalCurrentPage = globalPagination.currentPage

  const globalPanel = isGlobalSuperAdmin ? (
    <section className="container mx-auto max-w-6xl space-y-4 px-4">
      <GlobalPlanMonitorCard
        loading={globalLoading}
        error={globalError}
        rows={paginatedGlobalPlans}
        search={globalSearch}
        onSearchChange={setGlobalSearch}
        onRefresh={refreshGlobalPlans}
        page={globalCurrentPage}
        pageSize={globalPageSize}
        totalPages={globalTotalPages}
        rangeStart={globalRangeStart}
        rangeEnd={globalRangeEnd}
        totalItems={globalTotalItems}
        selectedOrgId={globalSelectedOrgId}
        onSelectRow={handleGlobalRowSelect}
        onPageChange={handleGlobalPageChange}
        onPageSizeChange={handleGlobalPageSizeChange}
      />
    </section>
  ) : null

  if (loadingSummary) {
    return (
      <div className="space-y-8 py-10">
        {globalPanel}
        <div className="container mx-auto max-w-3xl space-y-8">
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
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="space-y-8 py-10">
        {globalPanel}
        <div className="container mx-auto max-w-3xl space-y-6">
          <p className="text-center text-sm text-rose-600">{error ?? "No se encontr? informaci?n de suscripci?n."}</p>
          <Button onClick={loadSummary}>Reintentar</Button>
        </div>
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
    <div className="space-y-8 py-10">
      {globalPanel}
      <div ref={detailSectionRef} className="container mx-auto max-w-6xl space-y-8 px-4">
        <header className="space-y-2">
          <Badge className="rounded-full bg-sky-600 px-4 py-1 text-sm font-semibold uppercase tracking-wide">Detalles del plan</Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Mi plan</h1>
            <p className="text-muted-foreground">Revisa tu suscripcion actual y gestiona los cambios de forma autoservicio.</p>
          </div>
        </header>

        {shouldShowDetailCards ? (
          <>
            {legacyInfo?.show && detailSummary ? (
              <Alert className="flex flex-col gap-3 border-sky-500/40 bg-sky-50 dark:border-sky-600/40 dark:bg-slate-900">
                <div className="space-y-1">
                  <AlertTitle className="flex items-center gap-2 text-sky-950 dark:text-sky-100">
                    <AlertTriangle className="h-4 w-4" />
                    Tu plan legacy requiere migracion
                  </AlertTitle>
                  <AlertDescription className="text-sky-900/80 dark:text-sky-100/80">{legacyMessage}</AlertDescription>
                </div>
                <UpgradePlanDialog
                  summary={summaryForActions}
                  onUpdated={handleSummaryUpdated}
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
            <CardTitle className="text-2xl">Resumen de la suscripcion</CardTitle>
            <CardDescription>
              Informacion visible unicamente para administradores. Si necesitas ayuda adicional puedes contactar al equipo comercial.
            </CardDescription>
            {isGlobalSuperAdmin && globalDetailLoading ? (
              <p className="text-xs text-muted-foreground">Actualizando datos de la organizacion seleccionada...</p>
            ) : null}
          </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                {summaryContent ?? (
                  <p className="text-sm text-muted-foreground">Selecciona una organizacion para ver su informacion.</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Los cambios de plan quedarian registrados en tu historial de facturacion.
                </div>
                <UpgradePlanDialog
                  summary={summaryForActions}
                  onUpdated={handleSummaryUpdated}
                  plans={plans}
                  loadingPlans={loadingPlans}
                />
              </CardFooter>
            </Card>

            {summaryForActions.plan.restrictions ? (
              <Alert className="border-amber-500/30 bg-amber-50 dark:border-amber-500/40 dark:bg-slate-900">
                <AlertTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  Pago pendiente
                </AlertTitle>
                <AlertDescription className="text-amber-900/80 dark:text-amber-100/80">
                  Tu suscripcion esta limitada temporalmente hasta regularizar el cobro. Completa el pago para recuperar los
                  limites completos de tu plan.
                </AlertDescription>
              </Alert>
            ) : null}

            <SubscriptionUsageCard summary={summaryForActions} />
          </>
        ) : (
          <Card className="border-2 border-dashed">
            <CardHeader>
              <CardTitle>Selecciona una organizacion</CardTitle>
              <CardDescription>
                Elige una fila en la tabla de supervision para cargar el detalle del plan y consumo correspondiente.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Usa la busqueda o la paginacion para ubicar una organizacion. Una vez seleccionada verias aqui sus datos.
            </CardContent>
          </Card>
        )}

        {!isGlobalSuperAdmin && error ? <p className="text-sm text-amber-600">{error}</p> : null}
      </div>
    </div>
  )
}

type GlobalPlanRow = {
  orgId: number
  orgName: string
  planName: string
  planCode: string
  status: SubscriptionSummary["plan"]["status"]
  users: UsageMetric
  invoices: UsageMetric
  storageMB: UsageMetric
  nextDueDate: string | null
  alert: string
  hasIssue: boolean
  summary: SubscriptionSummary | null
}

type UsageMetric = {
  used: number
  limit: number | null
  percent: number | null
}

type GlobalPlanMonitorCardProps = {
  loading: boolean
  error: string | null
  rows: GlobalPlanRow[]
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  page: number
  pageSize: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  totalItems: number
  selectedOrgId: number | null
  onSelectRow: (row: GlobalPlanRow) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

function GlobalPlanMonitorCard({
  loading,
  error,
  rows,
  search,
  onSearchChange,
  onRefresh,
  page,
  pageSize,
  totalPages,
  rangeStart,
  rangeEnd,
  totalItems,
  selectedOrgId,
  onSelectRow,
  onPageChange,
  onPageSizeChange,
}: GlobalPlanMonitorCardProps) {
  const hasRows = rows.length > 0
  const disablePrev = loading || page <= 1 || !hasRows
  const disableNext = loading || page >= totalPages || !hasRows
  const pageSizeOptions = [10, 20, 50]

  return (
    <Card className="border-violet-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-slate-800 dark:text-slate-100">Supervision de planes por organizacion</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Monitorea el estado y consumo de cada tenant para anticipar upgrades o incidencias.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              placeholder="Buscar por organizacion o plan"
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
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={`global-plan-skeleton-${idx}`} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No encontramos organizaciones con los criterios actuales.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-4">Organizacion</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Vigencia</th>
                  <th className="py-2 pr-4">Usuarios</th>
                  <th className="py-2 pr-4">Facturas</th>
                  <th className="py-2 pr-4">Almacenamiento</th>
                  <th className="py-2 pr-4">Alertas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const statusBadge = STATUS_BADGE[row.status]
                  const isSelected = selectedOrgId === row.orgId
                  return (
                    <tr
                      key={row.orgId}
                      onClick={() => onSelectRow(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          onSelectRow(row)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className={cn(
                        "border-t border-slate-100 text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/40",
                        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                        isSelected && "bg-sky-50/70 dark:bg-slate-800/70",
                      )}
                    >
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{row.orgName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">ID #{row.orgId}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{row.planName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Codigo {row.planCode}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {statusBadge ? (
                          <Badge className={cn("px-3 py-1 text-xs font-semibold", statusBadge.className)}>
                            {statusBadge.label}
                          </Badge>
                        ) : (
                          <span className="text-xs font-semibold">{row.status}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {row.nextDueDate ? formatDateFromIso(row.nextDueDate) : "Sin datos"}
                      </td>
                      <td className="py-3 pr-4 font-medium">{formatUsageMetric(row.users, "usuarios")}</td>
                      <td className="py-3 pr-4 font-medium">{formatUsageMetric(row.invoices, "comprobantes")}</td>
                      <td className="py-3 pr-4 font-medium">{formatStorageMetric(row.storageMB)}</td>
                      <td className="py-3 pr-4 text-xs font-semibold">
                        <span
                          className={row.hasIssue ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
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
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-600 dark:text-slate-400">Mostrar</span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="w-[140px] cursor-pointer">
              <SelectValue placeholder={`${pageSize} registros`} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)} className="cursor-pointer">
                  {option} registros
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-600 dark:text-slate-400">
            Mostrando {rangeStart}-{rangeEnd} de {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={disablePrev}
              className="cursor-pointer"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(Math.max(page - 1, 1))}
              disabled={disablePrev}
              className="cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(Math.min(page + 1, totalPages))}
              disabled={disableNext}
              className="cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages)}
              disabled={disableNext}
              className="cursor-pointer"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-slate-600 dark:text-slate-400">
            Pagina {Math.min(page, totalPages)} de {Math.max(totalPages, 1)}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}

function buildGlobalPlanRow(org: OrganizationCompaniesOverview, summary: SubscriptionSummary | null): GlobalPlanRow {
  if (!summary) {
    return {
      orgId: org.id,
      orgName: org.name,
      planName: "Sin datos",
      planCode: "N/D",
      status: "ACTIVE",
      users: { used: 0, limit: null, percent: null },
      invoices: { used: 0, limit: null, percent: null },
      storageMB: { used: 0, limit: null, percent: null },
      nextDueDate: null,
      alert: "Sin datos disponibles",
      hasIssue: true,
      summary: null,
    }
  }

  const users = computeUsageMetric(summary.usage?.users, summary.quotas?.users ?? summary.quotas?.maxUsers)
  const invoices = computeUsageMetric(
    summary.usage?.invoices,
    summary.quotas?.invoices ?? summary.quotas?.maxInvoices
  )
  const storageMB = computeUsageMetric(
    summary.usage?.storageMB,
    summary.quotas?.storageMB ?? summary.quotas?.maxStorageMB
  )
  const nextDueDate = summary.billing.nextDueDate ?? summary.billing.currentPeriodEnd ?? summary.trial.endsAt ?? null
  const status = summary.plan.status

  let alert = "Consumo saludable"
  let hasIssue = false

  const metrics = [users, invoices, storageMB]
  const exceeded = metrics.some((metric) => metric.percent !== null && metric.percent >= 100)
  const warning = metrics.some((metric) => metric.percent !== null && metric.percent >= 90)

  if (status !== "ACTIVE") {
    alert = "Plan con incidencias"
    hasIssue = true
  } else if (exceeded) {
    alert = "Limites excedidos"
    hasIssue = true
  } else if (warning) {
    alert = "Cerca del limite"
    hasIssue = true
  }

  return {
    orgId: org.id,
    orgName: org.name,
    planName: summary.plan.name,
    planCode: summary.plan.code,
    status,
    users,
    invoices,
    storageMB,
    nextDueDate,
    alert,
    hasIssue,
    summary,
  }
}

function computeUsageMetric(used?: number, limit?: number | null): UsageMetric {
  const safeUsed = typeof used === "number" && Number.isFinite(used) ? used : 0
  const safeLimit = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? limit : null
  const percent = safeLimit ? Math.round((safeUsed / safeLimit) * 100) : null
  return {
    used: safeUsed,
    limit: safeLimit,
    percent: percent !== null ? Math.min(percent, 999) : null,
  }
}

function formatUsageMetric(metric: UsageMetric, label: string) {
  if (metric.limit === null) {
    return `${metric.used.toLocaleString("es-PE")} ${label} (sin limite)`
  }
  const percentText = metric.percent !== null ? ` (${metric.percent}%)` : ""
  return `${metric.used.toLocaleString("es-PE")} / ${metric.limit.toLocaleString("es-PE")} ${label}${percentText}`
}

function formatStorageMetric(metric: UsageMetric) {
  const formatValue = (value: number) => {
    if (value >= 1024) {
      return `${(value / 1024).toFixed(1)} GB`
    }
    return `${value} MB`
  }
  const used = formatValue(metric.used)
  const total = metric.limit === null ? "sin limite" : formatValue(metric.limit)
  const percentText = metric.percent !== null ? ` (${metric.percent}%)` : ""
  return `${used} / ${total}${percentText}`
}
