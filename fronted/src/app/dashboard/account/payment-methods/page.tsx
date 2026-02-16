"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth-context"
import { useTenantSelection } from "@/context/tenant-selection-context"

import { PaymentMethodCard } from "./payment-methods-card"
import { PaymentMethodModal } from "./payment-method-modal"
import { fetchPaymentMethods, markPaymentMethodAsDefault, removePaymentMethod, type BillingPaymentMethod } from "../billing.api"
import { listOrganizationsWithCompanies, type OrganizationCompaniesOverview } from "@/app/dashboard/tenancy/tenancy.api"
import { useAccountAccessGuard } from "../use-account-access"

const HEALTH_OK_LABEL = "Todo en orden"

type PaymentHealthSummary = {
  organizationId: number
  organizationName: string
  organizationCode: string | null
  superAdminName: string | null
  superAdminEmail: string | null
  defaultMethod: BillingPaymentMethod | null
  fallbackCount: number
  lastUpdated: string | null
  alert: string
  hasIssue: boolean
  statusLabel: string
}

export default function PaymentMethodsPage() {
  const accessReady = useAccountAccessGuard()
  const { selection } = useTenantSelection()
  const { role } = useAuth()
  const normalizedRole = role?.toUpperCase() ?? ""
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL"
  const allowManualSync =
    normalizedRole === "SUPER_ADMIN_GLOBAL" || normalizedRole === "SUPER_ADMIN_ORG"
  const organizationId = selection?.orgId ?? null

  const [methods, setMethods] = useState<BillingPaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<BillingPaymentMethod | null>(null)
  const [orgHealth, setOrgHealth] = useState<PaymentHealthSummary[]>([])
  const [orgHealthLoading, setOrgHealthLoading] = useState(false)
  const [orgHealthError, setOrgHealthError] = useState<string | null>(null)
  const [orgHealthSearch, setOrgHealthSearch] = useState("")

  const refresh = useCallback(() => {
    if (!organizationId) {
      setMethods([])
      return
    }
    setLoading(true)
    fetchPaymentMethods(organizationId)
      .then(setMethods)
      .catch((error) => {
        console.error(error)
        toast.error(error instanceof Error ? error.message : "No pudimos cargar los metodos de pago")
      })
      .finally(() => setLoading(false))
  }, [organizationId])

  const refreshOrgHealth = useCallback(async () => {
    if (!isGlobalSuperAdmin) return
    setOrgHealthLoading(true)
    try {
      const organizations = await listOrganizationsWithCompanies()
      const summaries = await Promise.all(
        organizations.map(async (org) => {
          try {
            const methods = await fetchPaymentMethods(org.id)
            return buildPaymentHealthSummary(org, methods)
          } catch (error) {
            console.error("[payment-methods] overview", error)
            return buildPaymentHealthSummary(org, [], "No se pudo consultar los metodos.")
          }
        })
      )
      summaries.sort((a, b) =>
        a.organizationName.localeCompare(b.organizationName, "es", { sensitivity: "base" })
      )
      setOrgHealth(summaries)
      setOrgHealthError(null)
    } catch (error) {
      console.error("[payment-methods] organizations", error)
      setOrgHealth([])
      setOrgHealthError("No pudimos obtener la informacion de las organizaciones.")
    } finally {
      setOrgHealthLoading(false)
    }
  }, [isGlobalSuperAdmin])

  useEffect(() => {
    if (!accessReady) return
    refresh()
  }, [accessReady, refresh])

  useEffect(() => {
    if (!accessReady || !isGlobalSuperAdmin) return
    refreshOrgHealth()
  }, [accessReady, isGlobalSuperAdmin, refreshOrgHealth])

  useEffect(() => {
    if (!isGlobalSuperAdmin) {
      setOrgHealth([])
      setOrgHealthError(null)
      setOrgHealthLoading(false)
      setOrgHealthSearch("")
    }
  }, [isGlobalSuperAdmin])

  const filteredOrgHealth = useMemo(() => {
    const needle = orgHealthSearch.trim().toLowerCase()
    if (!needle) return orgHealth
    return orgHealth.filter((summary) => {
      const nameMatch = summary.organizationName.toLowerCase().includes(needle)
      const codeMatch = (summary.organizationCode ?? "").toLowerCase().includes(needle)
      const adminMatch =
        (summary.superAdminName ?? "").toLowerCase().includes(needle) ||
        (summary.superAdminEmail ?? "").toLowerCase().includes(needle)
      const methodMatch = getPaymentMethodLabel(summary.defaultMethod).toLowerCase().includes(needle)
      return nameMatch || codeMatch || adminMatch || methodMatch
    })
  }, [orgHealth, orgHealthSearch])

  const sorted = useMemo(() => {
    return methods.slice().sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1))
  }, [methods])

  const handleDefault = async (method: BillingPaymentMethod) => {
    if (!organizationId) return
    try {
      await markPaymentMethodAsDefault(organizationId, method.id)
      toast.success("Metodo definido como predeterminado")
      refresh()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el metodo")
    }
  }

  const handleRemove = async (method: BillingPaymentMethod) => {
    if (!organizationId) return
    try {
      await removePaymentMethod(organizationId, method.id)
      toast.success("Metodo eliminado")
      refresh()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el metodo")
    }
  }

  if (!accessReady) {
    return <PaymentMethodsSkeleton />
  }

  if (!organizationId && !isGlobalSuperAdmin) {
    return (
      <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configuracion de cuenta</p>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Metodos de pago</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Selecciona una organizacion desde el selector superior para administrar tus tarjetas o cuentas bancarias.
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-12 text-slate-600 dark:text-slate-300">
          Esta seccion requiere que elijas una organizacion en el conmutador de equipos.
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configuracion de cuenta</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Metodos de pago</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Administra las tarjetas guardadas y define cual se usara por defecto para los cobros.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" asChild>
              <Link href="/dashboard/account">Volver</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/account/billing">Ver facturacion</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/account/plan">Consumo del plan</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {isGlobalSuperAdmin && (
          <Card className="border-violet-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-slate-800 dark:text-slate-100">Salud de métodos de pago</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Vigila qué organizaciones tienen un método activo, respaldos configurados y tarjetas por vencer.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Input
                    placeholder="Buscar por organización o super admin"
                    value={orgHealthSearch}
                    onChange={(event) => setOrgHealthSearch(event.target.value)}
                    className="sm:min-w-[260px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshOrgHealth}
                    disabled={orgHealthLoading}
                    className="cursor-pointer"
                  >
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {orgHealthLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={`payment-health-skeleton-${index}`} className="h-16 w-full rounded-md" />
                  ))}
                </div>
              ) : orgHealthError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{orgHealthError}</p>
              ) : filteredOrgHealth.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No encontramos organizaciones con los criterios actuales.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-4">Organización</th>
                        <th className="py-2 pr-4">Método principal</th>
                        <th className="py-2 pr-4">Estado</th>
                        <th className="py-2 pr-4">Actualizado</th>
                        <th className="py-2 pr-4 text-center">Respaldos</th>
                        <th className="py-2 text-left">Alertas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrgHealth.map((summary) => {
                        const statusUpper = summary.statusLabel?.toUpperCase() ?? ""
                        const statusVariant: "default" | "secondary" | "outline" =
                          !summary.defaultMethod || !statusUpper || statusUpper === "SIN DATOS" || statusUpper === "SIN MÉTODO"
                            ? "outline"
                            : statusUpper === "ACTIVE"
                            ? "default"
                            : "secondary"
                        return (
                          <tr
                            key={summary.organizationId}
                            className="border-t border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                          >
                            <td className="py-3 pr-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-100">{summary.organizationName}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {summary.organizationCode ? `Código ${summary.organizationCode}` : "Sin código"}
                                {summary.superAdminName
                                  ? ` • Admin: ${summary.superAdminName}${summary.superAdminEmail ? ` (${summary.superAdminEmail})` : ""}`
                                  : " • Sin super admin"}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="font-medium text-slate-800 dark:text-slate-100">
                                {getPaymentMethodLabel(summary.defaultMethod)}
                              </div>
                              {summary.defaultMethod?.provider ? (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Proveedor: {summary.defaultMethod.provider}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500 dark:text-slate-400">Sin registros previos</div>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge variant={statusVariant} className="text-xs capitalize">
                                {formatStatusLabel(summary)}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {formatTimestamp(summary.lastUpdated)}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-center">
                              <span className="text-sm font-semibold">{summary.fallbackCount}</span>
                            </td>
                            <td className="py-3">
                              <span
                                className={`text-xs font-medium ${
                                  summary.hasIssue
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {summary.alert}
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
          </Card>
        )}
        {!isGlobalSuperAdmin && (
          <>
            <div className="flex justify-end">
              <Dialog
                open={managerOpen}
                onOpenChange={(open) => {
                  setManagerOpen(open)
                  if (!open) setSelectedMethod(null)
                }}
              >
                <DialogTrigger asChild>
                  <Button onClick={() => setSelectedMethod(null)}>Nuevo metodo de pago</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedMethod ? "Editar metodo" : "Nuevo metodo de pago"}</DialogTitle>
                    <DialogDescription>
                      Completa los campos para registrar tu tarjeta o cuenta. Tambien puedes sincronizarla desde el PSP si ya existe.
                    </DialogDescription>
                  </DialogHeader>
                  <PaymentMethodModal
                    key={selectedMethod?.id ?? "new"}
                    organizationId={organizationId}
                    method={selectedMethod}
                    onSuccess={() => {
                      setManagerOpen(false)
                      setSelectedMethod(null)
                      refresh()
                    }}
                    allowManualSync={allowManualSync}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <PaymentMethodsSkeleton />
            ) : sorted.length === 0 ? (
              <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-100">Aun no registras metodos</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 dark:text-slate-300">
                  Agrega una tarjeta o sincroniza el metodo usado en MercadoPago para habilitar cobros automaticos.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sorted.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    onMarkDefault={() => handleDefault(method)}
                    onDelete={() => handleRemove(method)}
                    onEdit={() => {
                      setSelectedMethod(method)
                      setManagerOpen(true)
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function buildPaymentHealthSummary(
  org: OrganizationCompaniesOverview,
  methods: BillingPaymentMethod[],
  errorMessage?: string
): PaymentHealthSummary {
  const base = {
    organizationId: org.id,
    organizationName: org.name,
    organizationCode: org.code,
    superAdminName: org.superAdmin?.username ?? null,
    superAdminEmail: org.superAdmin?.email ?? null,
  }

  if (errorMessage) {
    return {
      ...base,
      defaultMethod: null,
      fallbackCount: 0,
      lastUpdated: null,
      alert: errorMessage,
      hasIssue: true,
      statusLabel: "Sin datos",
    }
  }

  const defaultMethod = methods.find((method) => method.isDefault) ?? methods[0] ?? null
  const fallbackCount = defaultMethod ? Math.max(0, methods.length - 1) : Math.max(0, methods.length)
  const lastUpdated = defaultMethod?.updatedAt ?? defaultMethod?.createdAt ?? null
  const statusLabel = defaultMethod?.status ?? "Sin método"
  const expiryStatus = getExpiryStatus(defaultMethod)

  let alert = HEALTH_OK_LABEL
  if (!defaultMethod) {
    alert = "Sin método predeterminado"
  } else if (statusLabel && statusLabel.toUpperCase() !== "ACTIVE") {
    alert = `Estado ${statusLabel.toLowerCase()}`
  } else if (expiryStatus === "EXPIRED") {
    alert = "Método expirado"
  } else if (expiryStatus === "SOON") {
    alert = "Expira pronto"
  } else if (fallbackCount === 0) {
    alert = "Sin respaldo"
  }

  return {
    ...base,
    defaultMethod,
    fallbackCount,
    lastUpdated,
    alert,
    hasIssue: alert !== HEALTH_OK_LABEL,
    statusLabel,
  }
}

function getPaymentMethodLabel(method: BillingPaymentMethod | null) {
  if (!method) return "Sin método registrado"
  const brand = method.brand ?? method.provider ?? "Método"
  const last4 = method.last4 ? `•••• ${method.last4}` : ""
  return `${brand} ${last4}`.trim()
}

type ExpiryStatus = "OK" | "SOON" | "EXPIRED" | "UNKNOWN"

function getExpiryStatus(method: BillingPaymentMethod | null): ExpiryStatus {
  if (!method?.expMonth || !method?.expYear) return "UNKNOWN"
  const lastDayOfMonth = new Date(method.expYear, method.expMonth, 0)
  const diffInDays = (lastDayOfMonth.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diffInDays < 0) return "EXPIRED"
  if (diffInDays <= 60) return "SOON"
  return "OK"
}

function formatTimestamp(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("es-PE", { dateStyle: "medium" })
}

function formatStatusLabel(summary: PaymentHealthSummary) {
  if (!summary.defaultMethod) {
    return summary.statusLabel || "Sin método"
  }
  if (!summary.statusLabel) return "Sin estado"
  const lower = summary.statusLabel.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function PaymentMethodsSkeleton() {
  return (
    <div className="max-w-5xl space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={`method-skeleton-${index}`} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  )
}
