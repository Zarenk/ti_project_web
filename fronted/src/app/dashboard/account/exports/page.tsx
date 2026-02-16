"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { useTenantSelection } from "@/context/tenant-selection-context"
import {
  downloadOrganizationExport,
  fetchOrganizationExports,
  requestOrganizationExport,
  type OrganizationExport,
} from "../billing.api"
import { useAccountAccessGuard } from "../use-account-access"
import { listOrganizationsWithCompanies, type OrganizationCompaniesOverview } from "@/app/dashboard/tenancy/tenancy.api"
import { useAuth } from "@/context/auth-context"

const EXPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  COMPLETED: "Completada",
  FAILED: "Fallida",
}

const CLEANUP_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  SCHEDULED: "Programado",
  PROCESSING: "En progreso",
  COMPLETED: "Completado",
  FAILED: "Fallido",
}

export default function ExportsPage() {
  const accessReady = useAccountAccessGuard()
  const { selection } = useTenantSelection()
  const { role } = useAuth()
  const normalizedRole = role?.toUpperCase() ?? ""
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL"
  const [organizationExports, setOrganizationExports] = useState<OrganizationExport[]>([])
  const [exportsLoading, setExportsLoading] = useState(false)
  const [requestingExport, setRequestingExport] = useState(false)
  const [downloadingExportId, setDownloadingExportId] = useState<number | null>(null)
  const [orgTargets, setOrgTargets] = useState<OrganizationCompaniesOverview[]>([])
  const [orgTargetsLoading, setOrgTargetsLoading] = useState(false)
  const [orgTargetsError, setOrgTargetsError] = useState<string | null>(null)
  const [orgSearch, setOrgSearch] = useState("")
  const [orgPreview, setOrgPreview] = useState<Record<number, OrganizationExport | null>>({})
  const [globalSelectedOrgId, setGlobalSelectedOrgId] = useState<number | null>(null)
  const [globalSelectedOrgName, setGlobalSelectedOrgName] = useState<string | null>(null)
  const targetOrgId = isGlobalSuperAdmin ? globalSelectedOrgId : selection?.orgId ?? null

  const refreshExports = useCallback(() => {
    if (!targetOrgId) {
      setOrganizationExports([])
      return
    }
    setExportsLoading(true)
    fetchOrganizationExports(targetOrgId)
      .then((items) => setOrganizationExports(items))
      .catch((error) => {
        console.error(error)
        toast.error(error instanceof Error ? error.message : "No se pudo obtener las exportaciones.")
      })
      .finally(() => setExportsLoading(false))
  }, [targetOrgId])

  useEffect(() => {
    if (!accessReady) return
    refreshExports()
  }, [accessReady, refreshExports])

  const refreshOrgTargets = useCallback(async () => {
    if (!isGlobalSuperAdmin) return
    setOrgTargetsLoading(true)
    try {
      const orgs = await listOrganizationsWithCompanies()
      setOrgTargets(orgs)
      const entries = await Promise.all(
        orgs.map(async (org) => {
          try {
            const exports = await fetchOrganizationExports(org.id)
            const sorted = exports
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.requestedAt ?? b.completedAt ?? "").getTime() -
                  new Date(a.requestedAt ?? a.completedAt ?? "").getTime()
              )
            return [org.id, sorted[0] ?? null] as const
          } catch (error) {
            console.error("[exports] preview", org.id, error)
            return [org.id, null] as const
          }
        })
      )
      setOrgPreview(Object.fromEntries(entries))
      setOrgTargetsError(null)
    } catch (error) {
      console.error("[exports] organizations", error)
      setOrgTargets([])
      setOrgPreview({})
      setOrgTargetsError("No pudimos obtener las organizaciones disponibles.")
    } finally {
      setOrgTargetsLoading(false)
    }
  }, [isGlobalSuperAdmin])

  useEffect(() => {
    if (!accessReady || !isGlobalSuperAdmin) return
    refreshOrgTargets()
  }, [accessReady, isGlobalSuperAdmin, refreshOrgTargets])

  useEffect(() => {
    if (!isGlobalSuperAdmin) {
      setGlobalSelectedOrgId(null)
      setGlobalSelectedOrgName(null)
      return
    }
    if (!globalSelectedOrgId) return
    const match = orgTargets.find((org) => org.id === globalSelectedOrgId)
    if (!match) {
      setGlobalSelectedOrgId(null)
      setGlobalSelectedOrgName(null)
    } else {
      setGlobalSelectedOrgName(match.name)
    }
  }, [isGlobalSuperAdmin, orgTargets, globalSelectedOrgId])

  const filteredOrgTargets = useMemo(() => {
    const needle = orgSearch.trim().toLowerCase()
    if (!needle) return orgTargets
    return orgTargets.filter((org) => {
      const name = org.name.toLowerCase()
      const code = (org.code ?? "").toLowerCase()
      const admin = org.superAdmin?.username?.toLowerCase() ?? ""
      const email = org.superAdmin?.email?.toLowerCase() ?? ""
      return name.includes(needle) || code.includes(needle) || admin.includes(needle) || email.includes(needle)
    })
  }, [orgTargets, orgSearch])

  const targetOrgName = isGlobalSuperAdmin ? globalSelectedOrgName : null

  const handleRequest = async () => {
    if (!targetOrgId) {
      toast.error("Selecciona una organización antes de solicitar la exportación.")
      return
    }
    setRequestingExport(true)
    try {
      await requestOrganizationExport(targetOrgId)
      toast.success("Estamos preparando tu exportación. Te avisaremos cuando esté lista.")
      refreshExports()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No pudimos programar la exportación.")
    } finally {
      setRequestingExport(false)
    }
  }

  const handleDownload = async (exportId: number) => {
    if (!targetOrgId) {
      toast.error("Selecciona una organización activa para descargar la exportación.")
      return
    }
    setDownloadingExportId(exportId)
    try {
      const blob = await downloadOrganizationExport(targetOrgId, exportId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `organization-export-${exportId}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No pudimos descargar la exportación.")
    } finally {
      setDownloadingExportId(null)
    }
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return "—"
    }
    return date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
  }

  if (!accessReady) {
    return <ExportsSkeleton />
  }

  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configuración de cuenta</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Exportaciones de datos</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Genera paquetes ZIP con información clave de tu organización antes de desactivar o limpiar el tenant.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/account">Volver a mi cuenta</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/account/billing">Ver facturación</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {isGlobalSuperAdmin ? (
          <GlobalExportsAdminCard
            loading={orgTargetsLoading}
            error={orgTargetsError}
            organizations={filteredOrgTargets}
            previews={orgPreview}
            search={orgSearch}
            onSearchChange={setOrgSearch}
            onRefresh={refreshOrgTargets}
            selectedOrgId={globalSelectedOrgId}
            onSelect={(org) => {
              setGlobalSelectedOrgId(org.id)
              setGlobalSelectedOrgName(org.name)
            }}
          />
        ) : null}
        <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-slate-800 dark:text-slate-100">Solicitudes recientes</CardTitle>
              {targetOrgName ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">OrganizaciИn: {targetOrgName}</p>
              ) : null}
            </div>
            <Button onClick={handleRequest} disabled={!targetOrgId || requestingExport}>
              {requestingExport ? "Programando..." : "Solicitar exportación"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {!targetOrgId ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Selecciona una organización para solicitar o revisar exportaciones.
              </p>
            ) : exportsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`export-skeleton-${index}`} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : organizationExports.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aún no se ha generado ninguna exportación. Solicita la primera para obtener un ZIP con tus datos.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Estado</th>
                      <th className="py-2 pr-4">Solicitado</th>
                      <th className="py-2 pr-4">Archivo</th>
                      <th className="py-2 pr-4">Limpieza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizationExports.map((exp) => (
                      <tr
                        key={exp.id}
                        className="border-t border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                      >
                        <td className="py-2 pr-4 font-medium">#{exp.id}</td>
                        <td className="py-2 pr-4">
                          {EXPORT_STATUS_LABELS[exp.status] ?? exp.status}
                          {exp.errorMessage ? (
                            <div className="text-xs text-red-500">{exp.errorMessage}</div>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4 text-xs">
                          {formatDateTime(exp.requestedAt)}
                          {exp.completedAt ? (
                            <div className="text-slate-500 dark:text-slate-400">
                              Listo: {formatDateTime(exp.completedAt)}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4">
                          {exp.fileReady ? (
                            <div className="flex flex-col gap-2">
                              {exp.expiresAt ? (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Expira: {formatDateTime(exp.expiresAt)}
                                </span>
                              ) : null}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(exp.id)}
                                disabled={downloadingExportId === exp.id}
                              >
                                {downloadingExportId === exp.id ? "Descargando..." : "Descargar ZIP"}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">Archivo en proceso...</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-xs">
                          {CLEANUP_STATUS_LABELS[exp.cleanupStatus] ?? exp.cleanupStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function ExportsSkeleton() {
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
              <Skeleton key={`exports-skeleton-${index}`} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

type GlobalExportsAdminCardProps = {
  loading: boolean
  error: string | null
  organizations: OrganizationCompaniesOverview[]
  previews: Record<number, OrganizationExport | null>
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  selectedOrgId: number | null
  onSelect: (org: OrganizationCompaniesOverview) => void
}

function GlobalExportsAdminCard({
  loading,
  error,
  organizations,
  previews,
  search,
  onSearchChange,
  onRefresh,
  selectedOrgId,
  onSelect,
}: GlobalExportsAdminCardProps) {
  return (
    <Card className="border-violet-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-slate-800 dark:text-slate-100">Supervision de exportaciones</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Elige una organizacion para revisar o programar sus exportaciones de datos.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              placeholder="Buscar por organizacion o super admin"
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
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`exports-admin-skeleton-${index}`} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : organizations.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No encontramos organizaciones con los criterios aplicados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-4">Organizacion</th>
                  <th className="py-2 pr-4">Super admin</th>
                  <th className="py-2 pr-4">Ultima exportacion</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => {
                  const preview = previews[org.id] ?? null
                  const isSelected = selectedOrgId === org.id
                  const statusLabel = preview ? EXPORT_STATUS_LABELS[preview.status] ?? preview.status : "Sin solicitudes"
                  return (
                    <tr
                      key={org.id}
                      className={`border-t border-slate-100 text-slate-700 transition-colors hover:bg-sky-50/60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60 ${
                        isSelected ? "bg-sky-100/60 dark:bg-slate-800/60" : ""
                      }`}
                    >
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{org.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {org.code ? `Codigo ${org.code}` : "Sin codigo"}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {org.superAdmin ? (
                          <>
                            <div className="font-medium text-slate-700 dark:text-slate-200">
                              {org.superAdmin.username}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400">{org.superAdmin.email}</div>
                          </>
                        ) : (
                          <span className="text-slate-500">Sin asignar</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {preview ? (
                          <>
                            <div>{formatDateTime(preview.requestedAt)}</div>
                            {preview.completedAt ? (
                              <div className="text-slate-500 dark:text-slate-400">
                                Listo: {formatDateTime(preview.completedAt)}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">Sin registros</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs font-semibold">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => onSelect(org)}
                          className="cursor-pointer"
                        >
                          {isSelected ? "Seleccionado" : "Administrar"}
                        </Button>
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
  )
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
}
