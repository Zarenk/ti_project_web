"use client"

import { lazy, Suspense, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Download, FileText, History, TrendingUp, XCircle, BarChart3, Grid3x3 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

import {
  fetchCompanyVerticalMetrics,
  downloadFile,
  type VerticalMetricsResponse,
} from "./tenancy.api"

// Lazy load heavy components for better initial bundle size
const VerticalCharts = lazy(() =>
  import("./vertical-charts").then((mod) => ({ default: mod.VerticalCharts })),
)
const VerticalMetricsPdfDocument = lazy(() =>
  import("./VerticalMetricsPdfDocument").then((mod) => ({
    default: mod.VerticalMetricsPdfDocument,
  })),
)

interface VerticalMigrationMetricsProps {
  companyId: number
  companyName: string
  organizationName: string
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("es-PE", {
    dateStyle: "short",
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

export function VerticalMigrationMetrics({ companyId, companyName, organizationName }: VerticalMigrationMetricsProps) {
  const [metrics, setMetrics] = useState<VerticalMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchCompanyVerticalMetrics(companyId)
        setMetrics(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar métricas"
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadMetrics()
  }, [companyId])

  const handleExportPDF = async () => {
    if (!metrics) return

    setExporting(true)
    try {
      // Lazy load PDF dependencies
      const [{ pdf }, { VerticalMetricsPdfDocument: PdfDoc }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./VerticalMetricsPdfDocument"),
      ])

      const doc = <PdfDoc metrics={metrics} companyName={companyName} organizationName={organizationName} />
      const asPdf = pdf(doc)
      const blob = await asPdf.toBlob()
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadFile(blob, `metricas-vertical-${companyId}-${timestamp}.pdf`)

      toast({
        title: "Exportación exitosa",
        description: "El reporte de métricas se ha descargado en formato PDF",
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Métricas de Migración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !metrics) {
    return (
      <Card className="border-dashed border-rose-200 dark:border-rose-700/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-300">
            <AlertCircle className="size-5" />
            Error al cargar métricas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {error || "No se pudieron cargar las métricas"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Métricas de Migración</h3>
          <p className="text-sm text-muted-foreground">
            Estadísticas y progreso de migración de productos
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportPDF}
          disabled={exporting || !metrics}
        >
          <FileText className="size-4 mr-1" />
          {exporting ? "Generando..." : "Exportar PDF"}
        </Button>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary" className="gap-2">
            <Grid3x3 className="size-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-2">
            <BarChart3 className="size-4" />
            Gráficos
          </TabsTrigger>
        </TabsList>

      <TabsContent value="summary" className="space-y-4 mt-4">
        {/* Current Vertical Card */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <TrendingUp className="size-5 text-sky-600 dark:text-sky-400" />
              Vertical Actual
            </span>
            <Badge variant="outline" className={getVerticalColor(metrics.currentVertical)}>
              {getVerticalLabel(metrics.currentVertical)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Migration Progress */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Productos Migrados
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {metrics.migration.migrated} / {metrics.migration.total}
              </span>
            </div>
            <Progress value={metrics.migration.percentage} className="h-2" />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {metrics.migration.percentage}% completado ({metrics.migration.legacy} pendientes)
            </p>
          </div>

          {/* Rollback Status */}
          {metrics.rollbackAvailable && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/40">
              <Clock className="size-4 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-200">
                  Rollback disponible
                </p>
                {metrics.rollbackExpiresAt && (
                  <p className="text-xs text-amber-600 dark:text-amber-300">
                    Expira: {formatDate(metrics.rollbackExpiresAt)}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estadísticas de Migración</CardTitle>
          <CardDescription>Resumen de cambios de vertical</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total de Cambios
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.statistics.totalChanges}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tasa de Éxito
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.statistics.successRate}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Exitosos</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {metrics.statistics.successfulChanges}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="size-4 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Fallidos</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {metrics.statistics.failedChanges}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-5 text-sky-600 dark:text-sky-400" />
            Historial Reciente
          </CardTitle>
          <CardDescription>Últimos 10 cambios de vertical</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.recentHistory.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No hay historial de cambios disponible
            </p>
          ) : (
            <div className="space-y-3">
              {metrics.recentHistory.map((entry) => (
                <div key={entry.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {entry.success ? (
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="size-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getVerticalColor(entry.oldVertical)}`}
                          >
                            {getVerticalLabel(entry.oldVertical)}
                          </Badge>
                          <span className="text-slate-400">→</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getVerticalColor(entry.newVertical)}`}
                          >
                            {getVerticalLabel(entry.newVertical)}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {entry !== metrics.recentHistory[metrics.recentHistory.length - 1] && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="charts" className="mt-4">
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
            </div>
          }
        >
          <VerticalCharts metrics={metrics} />
        </Suspense>
      </TabsContent>
    </Tabs>
    </div>
  )
}
