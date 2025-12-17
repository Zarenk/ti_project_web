"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTenantSelection } from "@/context/tenant-selection-context"
import {
  downloadOrganizationExport,
  fetchOrganizationExports,
  requestOrganizationExport,
  type OrganizationExport,
} from "../billing.api"
import { useAccountAccessGuard } from "../use-account-access"

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
  const [organizationExports, setOrganizationExports] = useState<OrganizationExport[]>([])
  const [exportsLoading, setExportsLoading] = useState(false)
  const [requestingExport, setRequestingExport] = useState(false)
  const [downloadingExportId, setDownloadingExportId] = useState<number | null>(null)

  const refreshExports = useCallback(() => {
    if (!selection?.orgId) {
      setOrganizationExports([])
      return
    }
    setExportsLoading(true)
    fetchOrganizationExports(selection.orgId)
      .then((items) => setOrganizationExports(items))
      .catch((error) => {
        console.error(error)
        toast.error(error instanceof Error ? error.message : "No se pudo obtener las exportaciones.")
      })
      .finally(() => setExportsLoading(false))
  }, [selection?.orgId])

  useEffect(() => {
    if (!accessReady) return
    refreshExports()
  }, [accessReady, refreshExports])

  const handleRequest = async () => {
    if (!selection?.orgId) {
      toast.error("Selecciona una organización antes de solicitar la exportación.")
      return
    }
    setRequestingExport(true)
    try {
      await requestOrganizationExport(selection.orgId)
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
    if (!selection?.orgId) {
      toast.error("Selecciona una organización activa para descargar la exportación.")
      return
    }
    setDownloadingExportId(exportId)
    try {
      const blob = await downloadOrganizationExport(selection.orgId, exportId)
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

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Card className="border-sky-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-slate-800 dark:text-slate-100">Solicitudes recientes</CardTitle>
            <Button onClick={handleRequest} disabled={!selection?.orgId || requestingExport}>
              {requestingExport ? "Programando..." : "Solicitar exportación"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selection?.orgId ? (
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
