"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AccountingModeToggle } from "@/components/accounting-mode-toggle"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useHealthScore } from "../hooks/useHealthScore"
import {
  Heart,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Shield,
  Target,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type HealthStatus = "EXCELENTE" | "BUENO" | "ATENCIÓN" | "CRÍTICO"

export default function SaludNegocioPage() {
  const { data: healthData, loading, error, refetch } = useHealthScore()

  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success("Datos actualizados")
    } catch {
      toast.error("Error al actualizar datos")
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Error al cargar datos</h3>
                <p className="text-sm text-muted-foreground">
                  No se pudieron cargar los datos de salud del negocio.
                </p>
                <Button onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: HealthStatus | "EXCELENTE") => {
    switch (status) {
      case "EXCELENTE":
        return "text-green-600"
      case "BUENO":
        return "text-blue-600"
      case "ATENCIÓN":
        return "text-yellow-600"
      case "CRÍTICO":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = (status: HealthStatus | "EXCELENTE") => {
    switch (status) {
      case "EXCELENTE":
      case "BUENO":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "ATENCIÓN":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "CRÍTICO":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusBg = (status: HealthStatus | "EXCELENTE") => {
    switch (status) {
      case "EXCELENTE":
      case "BUENO":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      case "ATENCIÓN":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      case "CRÍTICO":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Salud del Negocio</h1>
          <p className="text-muted-foreground mt-1">
            Cómo está tu empresa y qué decisiones puedes tomar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <AccountingModeToggle variant="compact" />
        </div>
      </div>

      {/* Overall Health Score */}
      {loading ? (
        <Card className="border-2">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-12 w-32" />
            </div>
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      ) : healthData ? (
        <Card className={`border-2 ${getStatusBg(healthData.status)}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm">
                  <Heart className={`h-8 w-8 ${getStatusColor(healthData.status)}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Estado: {healthData.status}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {healthData.status === "EXCELENTE" && "Tu negocio está en excelente estado"}
                    {healthData.status === "BUENO" && "Tu negocio está funcionando bien"}
                    {healthData.status === "ATENCIÓN" && "Requiere atención en algunas áreas"}
                    {healthData.status === "CRÍTICO" && "Necesita atención urgente"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{healthData.score}/100</div>
                <p className="text-sm text-muted-foreground mt-1">Puntuación de salud</p>
              </div>
            </div>
            <Progress value={healthData.score} className="mt-4 h-2" />
          </CardContent>
        </Card>
      ) : null}

      {/* Main Metrics - Simplified Language */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lo que Tienes</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                S/ {(healthData?.loQueTienes || 0).toLocaleString('es-PE')}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Efectivo, inventario, equipos, etc.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lo que Debes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">
                S/ {(healthData?.loQueDebes || 0).toLocaleString('es-PE')}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Préstamos, deudas con proveedores, etc.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tu Patrimonio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                S/ {(healthData?.tuPatrimonio || 0).toLocaleString('es-PE')}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Lo que realmente es tuyo (tienes - debes)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicadores Clave</CardTitle>
          <CardDescription>Métricas importantes de tu negocio en lenguaje simple</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : healthData?.indicators && healthData.indicators.length > 0 ? (
            <div className="space-y-4">
              {healthData.indicators.map((indicator, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getStatusBg(indicator.status)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 flex-1">
                      {getStatusIcon(indicator.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{indicator.name}</h4>
                          <span className={`text-lg font-bold ${getStatusColor(indicator.status)}`}>
                            {indicator.value}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {indicator.description}
                        </p>
                        <p className="text-sm mt-2">{indicator.detail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay indicadores disponibles en este momento.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Profitability */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rentabilidad del Mes</CardTitle>
            <CardDescription>¿Estás ganando dinero?</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-7 w-32" />
                  </div>
                </div>
              </div>
            ) : healthData ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Ingresos (ventas)</span>
                    <span className="text-sm font-bold">
                      S/ {healthData.ingresos.toLocaleString('es-PE')}
                    </span>
                  </div>
                  <Progress value={100} className="h-2 bg-green-100" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Costos (gastos)</span>
                    <span className="text-sm font-bold text-red-600">
                      S/ {healthData.costos.toLocaleString('es-PE')}
                    </span>
                  </div>
                  <Progress
                    value={(healthData.costos / healthData.ingresos) * 100}
                    className="h-2 bg-red-100"
                  />
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">Ganancia</span>
                    <span className="text-xl font-bold text-green-600">
                      S/ {healthData.ganancia.toLocaleString('es-PE')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Esto es lo que realmente ganaste este mes
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recomendaciones</CardTitle>
            <CardDescription>Basadas en tu situación actual</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ) : healthData ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Sigue así
                      </p>
                      <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                        Tu margen de ganancia del {healthData.margenGanancia}% es saludable.
                        Mantén tus precios competitivos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Buena capacidad de pago
                      </p>
                      <p className="text-xs text-green-800 dark:text-green-200 mt-1">
                        Puedes negociar mejores plazos con proveedores.
                      </p>
                    </div>
                  </div>
                </div>

                <Button className="w-full" asChild>
                  <Link href="/dashboard/accounting/dinero">
                    Ver estado de mi dinero
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ver detalles técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/accounting/reports/trial-balance">
                Balance de Comprobación
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/accounting/reports/ledger">
                Libro Mayor (detalles por cuenta)
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
