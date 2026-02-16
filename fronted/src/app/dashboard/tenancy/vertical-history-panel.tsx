"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  History,
  User,
  XCircle,
  AlertTriangle,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

import {
  fetchCompanyVerticalHistory,
  exportVerticalHistoryCSV,
  downloadFile,
  type VerticalHistoryResponse,
} from "./tenancy.api"

interface VerticalHistoryPanelProps {
  companyId: number
  onRollbackClick?: () => void
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
  })
}

const getVerticalLabel = (vertical: string) => {
  const labels: Record<string, string> = {
    GENERAL: "General",
    RESTAURANTS: "Restaurantes",
    RETAIL: "Retail",
    SERVICES: "Servicios",
    MANUFACTURING: "Manufactura",
    COMPUTERS: "Computación",
  }
  return labels[vertical] || vertical
}

const getVerticalColor = (vertical: string) => {
  const colors: Record<string, string> = {
    GENERAL: "border-slate-600 text-slate-700 dark:border-slate-400 dark:text-slate-300",
    RESTAURANTS: "border-orange-600 text-orange-700 dark:border-orange-400 dark:text-orange-300",
    RETAIL: "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300",
    SERVICES: "border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300",
    MANUFACTURING: "border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300",
    COMPUTERS: "border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-300",
  }
  return colors[vertical] || "border-slate-600 text-slate-700 dark:border-slate-400 dark:text-slate-300"
}

export function VerticalHistoryPanel({ companyId, onRollbackClick }: VerticalHistoryPanelProps) {
  const [history, setHistory] = useState<VerticalHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCompanyVerticalHistory(companyId)
      setHistory(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar historial"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const blob = await exportVerticalHistoryCSV(companyId)
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadFile(blob, `historial-vertical-${companyId}-${timestamp}.csv`)

      toast({
        title: "Exportación exitosa",
        description: "El historial se ha descargado en formato CSV",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al exportar"
      toast({
        variant: "destructive",
        title: "Error al exportar",
        description: message,
      })
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [companyId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Historial de Cambios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !history) {
    return (
      <Card className="border-dashed border-rose-200 dark:border-rose-700/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-300">
            <AlertCircle className="size-5" />
            Error al cargar historial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {error || "No se pudo cargar el historial"}
          </p>
          <Button size="sm" variant="outline" onClick={loadHistory} className="mt-3">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-sky-600 dark:text-sky-400" />
              Historial de Cambios
              <Badge variant="outline" className="text-xs">
                {history.totalChanges} cambios
              </Badge>
            </CardTitle>
            <CardDescription>
              Registro completo de cambios de vertical y migraciones
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            disabled={exporting || history.totalChanges === 0}
            className="shrink-0"
          >
            <Download className="size-4 mr-1" />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rollback Status */}
        {history.rollbackAvailable && history.rollbackSnapshot && (
          <div className="rounded-lg border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/40">
            <div className="flex items-start gap-3">
              <Clock className="size-5 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-200">
                    Snapshot de rollback disponible
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-300">
                    Expira: {formatDate(history.rollbackSnapshot.expiresAt)}
                  </p>
                </div>
                {onRollbackClick && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRollbackClick}
                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950"
                  >
                    <AlertTriangle className="size-4" />
                    Ejecutar Rollback
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        {history.history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
            <History className="mx-auto size-8 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Sin historial de cambios
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No se han registrado cambios de vertical para esta empresa
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.history.map((entry, index) => (
              <div key={entry.id}>
                <div className="flex items-start gap-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full border-2">
                    {entry.success ? (
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="size-5 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    {/* Vertical Change */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={getVerticalColor(entry.oldVertical)}
                      >
                        {getVerticalLabel(entry.oldVertical)}
                      </Badge>
                      <span className="text-slate-400">→</span>
                      <Badge
                        variant="outline"
                        className={getVerticalColor(entry.newVertical)}
                      >
                        {getVerticalLabel(entry.newVertical)}
                      </Badge>
                      <Badge
                        variant={entry.success ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {entry.success ? "Exitoso" : "Fallido"}
                      </Badge>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="size-3" />
                        {formatDate(entry.createdAt)}
                      </div>
                      {entry.user && (
                        <div className="flex items-center gap-2">
                          <User className="size-3" />
                          {entry.user.username} ({entry.user.email})
                        </div>
                      )}
                      {entry.changeReason && (
                        <div className="rounded-md bg-slate-100 p-2 dark:bg-slate-800">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Razón: {entry.changeReason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Warnings */}
                    {entry.warningsJson && Array.isArray(entry.warningsJson) && entry.warningsJson.length > 0 && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950/30">
                        <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-200">
                          Advertencias:
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-xs text-amber-600 dark:text-amber-300">
                          {entry.warningsJson.map((warning: string, idx: number) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {index < history.history.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
