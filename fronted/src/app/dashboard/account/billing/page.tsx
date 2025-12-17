"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { useAuth } from "@/context/auth-context"
import {
  downloadBillingInvoicePdf,
  fetchBillingInvoices,
  retryBillingInvoice,
  type BillingInvoice,
} from "../billing.api"
import { useAccountAccessGuard } from "../use-account-access"
import { listOrganizationsWithCompanies, type OrganizationCompaniesOverview } from "@/app/dashboard/tenancy/tenancy.api"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  FAILED: "Fallida",
  VOID: "Anulada",
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

export default function BillingPage() {
  const accessReady = useAccountAccessGuard()
  const { selection } = useTenantSelection()
  const { role } = useAuth()
  const normalizedRole = role?.toUpperCase() ?? ""
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL"
  const [billingInvoices, setBillingInvoices] = useState<BillingInvoice[]>([])
  const [billingLoading, setBillingLoading] = useState(false)
  const [retryingInvoiceId, setRetryingInvoiceId] = useState<number | null>(null)
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null)
  const [orgTargets, setOrgTargets] = useState<OrganizationCompaniesOverview[]>([])
  const [orgTargetsLoading, setOrgTargetsLoading] = useState(false)
  const [orgTargetsError, setOrgTargetsError] = useState<string | null>(null)
  const [orgSearch, setOrgSearch] = useState("")
  const [inspectionOrgId, setInspectionOrgId] = useState<number | null>(null)
  const [inspectionOrgName, setInspectionOrgName] = useState<string | null>(null)
  const [orgPageSize, setOrgPageSize] = useState<number>(10)
  const [orgPage, setOrgPage] = useState(1)
  const [invoicePageSize, setInvoicePageSize] = useState<number>(10)
  const [invoicePage, setInvoicePage] = useState(1)

  const resolvedOrgId = inspectionOrgId ?? selection?.orgId ?? null

  const refreshInvoices = useCallback(() => {
    const targetOrgId = inspectionOrgId ?? selection?.orgId
    if (!targetOrgId) {
      setBillingInvoices([])
      return
    }
    setBillingLoading(true)
    fetchBillingInvoices(targetOrgId)
      .then((items) => setBillingInvoices(items))
      .catch((error) => {
        console.error(error)
        toast.error(
          error instanceof Error ? error.message : "No se pudo obtener el historial de facturacion.",
        )
      })
      .finally(() => setBillingLoading(false))
  }, [selection?.orgId, inspectionOrgId])

  useEffect(() => {
    if (!accessReady) return
    refreshInvoices()
  }, [accessReady, refreshInvoices])

  const handleRetryInvoice = async (invoiceId: number) => {
    if (!resolvedOrgId) {
      toast.error("Selecciona una organizacion activa para gestionar facturacion.")
      return
    }
    setRetryingInvoiceId(invoiceId)
    try {
      await retryBillingInvoice(resolvedOrgId, invoiceId)
      toast.success("Programamos un nuevo intento de cobro.")
      refreshInvoices()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo reintentar el cobro.")
    } finally {
      setRetryingInvoiceId(null)
    }
  }

  const handleDownloadInvoice = async (invoiceId: number) => {
    if (!resolvedOrgId) {
      toast.error("Selecciona una organizacion activa para gestionar facturacion.")
      return
    }
    setDownloadingInvoiceId(invoiceId)
    try {
      const blob = await downloadBillingInvoicePdf(resolvedOrgId, invoiceId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo descargar el comprobante.")
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  const formatMoney = (amount: string, currency: string) => {
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

  const formatDate = (value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return ""
    }
    return date.toLocaleDateString("es-PE", { dateStyle: "medium" })
  }

  const refreshOrgTargets = useCallback(() => {
    if (!isGlobalSuperAdmin) {
      setOrgTargets([])
      setOrgTargetsLoading(false)
      setOrgTargetsError(null)
      return
    }
    setOrgTargetsLoading(true)
    listOrganizationsWithCompanies()
      .then((data) => {
        setOrgTargets(data)
        setOrgTargetsError(null)
      })
      .catch((error) => {
        console.error("[billing] org-targets", error)
        setOrgTargets([])
        setOrgTargetsError("No pudimos obtener las organizaciones disponibles.")
      })
      .finally(() => setOrgTargetsLoading(false))
  }, [isGlobalSuperAdmin])

  useEffect(() => {
    if (!accessReady || !isGlobalSuperAdmin) return
    refreshOrgTargets()
  }, [accessReady, isGlobalSuperAdmin, refreshOrgTargets])

  const filteredOrgTargets = useMemo(() => {
    const needle = orgSearch.trim().toLowerCase()
    if (!needle) return orgTargets
    return orgTargets.filter((org) => {
      const orgName = org.name.toLowerCase()
      const orgCode = (org.code ?? "").toLowerCase()
      const superAdminName = org.superAdmin?.username?.toLowerCase() ?? ""
      const superAdminEmail = org.superAdmin?.email?.toLowerCase() ?? ""
      const companyMatches = org.companies?.some((company) =>
        company.name.toLowerCase().includes(needle),
      )
      return (
        orgName.includes(needle) ||
        (!!orgCode && orgCode.includes(needle)) ||
        (!!superAdminName && superAdminName.includes(needle)) ||
        (!!superAdminEmail && superAdminEmail.includes(needle)) ||
        companyMatches
      )
    })
  }, [orgSearch, orgTargets])

  useEffect(() => {
    setOrgPage(1)
  }, [orgPageSize, orgSearch, orgTargets.length])

  const orgTotalPages = Math.max(1, Math.ceil(Math.max(filteredOrgTargets.length, 1) / orgPageSize))

  useEffect(() => {
    if (orgPage > orgTotalPages) {
      setOrgPage(orgTotalPages)
    }
  }, [orgTotalPages, orgPage])

  const orgStartIndex = filteredOrgTargets.length === 0 ? 0 : (orgPage - 1) * orgPageSize
  const paginatedOrgTargets = filteredOrgTargets.slice(orgStartIndex, orgStartIndex + orgPageSize)
  const orgRangeStart = filteredOrgTargets.length === 0 ? 0 : orgStartIndex + 1
  const orgRangeEnd =
    filteredOrgTargets.length === 0 ? 0 : Math.min(orgStartIndex + orgPageSize, filteredOrgTargets.length)

  useEffect(() => {
    setInvoicePage(1)
  }, [resolvedOrgId, invoicePageSize, billingInvoices.length])

  const invoiceTotalPages = Math.max(1, Math.ceil(Math.max(billingInvoices.length, 1) / invoicePageSize))

  useEffect(() => {
    if (invoicePage > invoiceTotalPages) {
      setInvoicePage(invoiceTotalPages)
    }
  }, [invoiceTotalPages, invoicePage])

  const invoiceStartIndex = billingInvoices.length === 0 ? 0 : (invoicePage - 1) * invoicePageSize
  const paginatedInvoices = billingInvoices.slice(invoiceStartIndex, invoiceStartIndex + invoicePageSize)
  const invoiceRangeStart = billingInvoices.length === 0 ? 0 : invoiceStartIndex + 1
  const invoiceRangeEnd =
    billingInvoices.length === 0 ? 0 : Math.min(invoiceStartIndex + invoicePageSize, billingInvoices.length)

  const handleInspectOrganization = (target: OrganizationCompaniesOverview) => {
    setInspectionOrgId(target.id)
    setInspectionOrgName(target.name)
  }

  if (!accessReady) {
    return <BillingPageSkeleton />
  }

  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configuracion de cuenta</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Facturacion y pagos</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Gestiona tus comprobantes, descarga PDFs y programa reintentos de pago.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild className="cursor-pointer">
              <Link href="/dashboard/account">Volver a mi cuenta</Link>
            </Button>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild className="cursor-pointer">
                    <Link href="/dashboard/account/exports">Exportar datos</Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Descarga reportes y comprobantes de suscripción.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {isGlobalSuperAdmin ? (
          <Card className="mb-6 border-violet-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-slate-800 dark:text-slate-100">
                    Supervisión multi-organización
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Ubica a los super admins de cada organización y accede rápidamente a sus facturas.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Input
                    placeholder="Buscar por organización, super admin o empresa"
                    value={orgSearch}
                    onChange={(event) => setOrgSearch(event.target.value)}
                    className="sm:min-w-[280px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshOrgTargets}
                    disabled={orgTargetsLoading}
                  >
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {orgTargetsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={`org-target-skeleton-${index}`} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : orgTargetsError ? (
                <p className="text-sm text-red-600">{orgTargetsError}</p>
              ) : filteredOrgTargets.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No encontramos organizaciones que coincidan con la búsqueda.
                </p>
              ) : (
                <TooltipProvider delayDuration={150}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                          <th className="py-2 pr-4">Organización</th>
                          <th className="py-2 pr-4">Super admin org</th>
                          <th className="py-2 pr-4">Empresas vinculadas</th>
                          <th className="py-2 pr-4">Estado</th>
                          <th className="py-2 text-right">Revisar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedOrgTargets.map((org) => {
                          const isActiveOrg =
                            inspectionOrgId === org.id || (inspectionOrgId === null && selection?.orgId === org.id)
                          const visibleCompanies = org.companies?.slice(0, 3) ?? []
                          const remainingCompanies = Math.max(0, (org.companies?.length ?? 0) - visibleCompanies.length)
                          return (
                            <tr
                              key={org.id}
                              className={`border-t border-slate-100 dark:border-slate-800 ${
                                isActiveOrg ? "bg-sky-50/60 dark:bg-slate-800/60" : ""
                              }`}
                            >
                              <td className="py-3 pr-4">
                                <div className="font-medium text-slate-800 dark:text-slate-100">{org.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {org.code ? `Código ${org.code}` : `Miembros ${org.membershipCount}`}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                {org.superAdmin ? (
                                  <div>
                                    <div className="font-medium text-slate-800 dark:text-slate-100">
                                      {org.superAdmin.username}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      {org.superAdmin.email}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">Sin asignar</span>
                                )}
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex flex-wrap gap-1">
                                  {visibleCompanies.map((company) => (
                                    <Badge key={company.id} variant="outline" className="text-xs">
                                      {company.name}
                                    </Badge>
                                  ))}
                                  {remainingCompanies > 0 ? (
                                    <Badge variant="secondary" className="text-xs">
                                      +{remainingCompanies}
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <Badge
                                  variant={org.status === "ACTIVE" ? "default" : "secondary"}
                                  className="text-xs capitalize"
                                >
                                  {org.status.toLowerCase()}
                                </Badge>
                              </td>
                              <td className="py-3 text-right">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleInspectOrganization(org)}
                                      className="cursor-pointer hover:underline"
                                      aria-label={`Ver facturas de ${org.name}`}
                                    >
                                      Ver facturas
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Ver facturación de {org.name}</TooltipContent>
                                </Tooltip>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Mostrando {orgRangeStart}-{orgRangeEnd} de {filteredOrgTargets.length} organizaciones
                  </span>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Por página</span>
                      <Select value={String(orgPageSize)} onValueChange={(value) => setOrgPageSize(Number(value))}>
                        <SelectTrigger className="w-[120px] cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map((option) => (
                            <SelectItem key={`org-size-${option}`} value={String(option)}>
                              {option} registros
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setOrgPage(1)}
                        disabled={orgPage === 1}
                      >
                        Primera
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setOrgPage((prev) => Math.max(1, prev - 1))}
                        disabled={orgPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setOrgPage((prev) => Math.min(orgTotalPages, prev + 1))}
                        disabled={orgPage >= orgTotalPages}
                      >
                        Siguiente
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setOrgPage(orgTotalPages)}
                        disabled={orgPage >= orgTotalPages}
                      >
                        Última
                      </Button>
                    </div>
                  </div>
                </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
        ) : null}

        <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-slate-800 dark:text-slate-100">
              Historial de facturacion
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={refreshInvoices}
                disabled={billingLoading}
              >
                Actualizar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!resolvedOrgId ? (
              <p
                data-testid="billing-no-selection"
                className="text-sm text-slate-500 dark:text-slate-400"
              >
                Selecciona una organizacion desde el selector superior o usa el listado de supervisión para revisar sus facturas.
              </p>
            ) : billingLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`invoice-skeleton-${index}`} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : billingInvoices.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aun no registramos facturas de suscripcion para esta organizacion.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-4">Comprobante</th>
                        <th className="py-2 pr-4">Importe</th>
                        <th className="py-2 pr-4">Estado</th>
                        <th className="py-2 pr-4">Periodo</th>
                        <th className="py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInvoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="border-t border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                        >
                          <td className="py-2 pr-4">
                            <div className="font-medium">{invoice.code}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {invoice.planName ?? "Plan actual"}
                            </div>
                          </td>
                          <td className="py-2 pr-4">
                            {formatMoney(invoice.amount, invoice.currency)}
                            {invoice.paymentMethod ? (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {invoice.paymentMethod.brand ?? "Tarjeta"} {invoice.paymentMethod.last4 ?? "----"}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge
                              className="text-xs"
                              variant={
                                invoice.status === "PAID"
                                  ? "default"
                                  : invoice.status === "FAILED"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {STATUS_LABELS[invoice.status] ?? invoice.status}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-xs">
                            {formatDate(invoice.billingPeriodStart)} - {formatDate(invoice.billingPeriodEnd)}
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => handleDownloadInvoice(invoice.id)}
                                disabled={!invoice.pdfAvailable || downloadingInvoiceId === invoice.id}
                              >
                                {downloadingInvoiceId === invoice.id ? "Descargando..." : "Descargar"}
                              </Button>
                              {invoice.canRetry ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="cursor-pointer"
                                  onClick={() => handleRetryInvoice(invoice.id)}
                                  disabled={retryingInvoiceId === invoice.id}
                                >
                                  {retryingInvoiceId === invoice.id ? "Programando..." : "Reintentar"}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Mostrando {invoiceRangeStart}-{invoiceRangeEnd} de {billingInvoices.length} comprobantes
                    {inspectionOrgName ? ` de ${inspectionOrgName}` : ""}
                  </span>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Por página</span>
                      <Select
                        value={String(invoicePageSize)}
                        onValueChange={(value) => setInvoicePageSize(Number(value))}
                      >
                        <SelectTrigger className="w-[120px] cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map((option) => (
                            <SelectItem key={`invoice-size-${option}`} value={String(option)}>
                              {option} registros
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setInvoicePage(1)}
                        disabled={invoicePage === 1}
                      >
                        Primera
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setInvoicePage((prev) => Math.max(1, prev - 1))}
                        disabled={invoicePage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setInvoicePage((prev) => Math.min(invoiceTotalPages, prev + 1))}
                        disabled={invoicePage >= invoiceTotalPages}
                      >
                        Siguiente
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setInvoicePage(invoiceTotalPages)}
                        disabled={invoicePage >= invoiceTotalPages}
                      >
                        Última
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function BillingPageSkeleton() {
  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <Skeleton className="h-8 w-64" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`billing-skeleton-${index}`} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
