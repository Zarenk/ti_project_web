"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AccountingModeToggle } from "@/components/accounting-mode-toggle"
import { Skeleton } from "@/components/ui/skeleton"
import { useCashFlow } from "../hooks/useCashFlow"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function MiDineroPage() {
  const { data: cashData, loading, error, refetch } = useCashFlow()

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
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Error al cargar datos</h3>
                <p className="text-sm text-muted-foreground">
                  No se pudieron cargar los datos de flujo de caja. Verifica tu conexión e intenta nuevamente.
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Mode Toggle */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Dinero</h1>
          <p className="text-muted-foreground mt-1">
            Estado de tu efectivo y flujo de caja en tiempo real
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

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dinero Disponible</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">S/ {(cashData?.disponible || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Total en caja y bancos ahora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entró Hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                S/ {(cashData?.entradasHoy || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Ventas y cobros del día
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salió Hoy</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                S/ {(cashData?.salidasHoy || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Gastos y pagos del día
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyección 7 días</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">S/ {(cashData?.proyeccionSemana || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Estimado para la próxima semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimientos Recientes</CardTitle>
            <CardDescription>Últimas entradas y salidas de dinero</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(cashData?.movimientosRecientes || []).map((mov) => (
                  <div key={`${mov.tipo}-${mov.id}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {mov.tipo === "entrada" ? (
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{mov.concepto}</p>
                        <p className="text-xs text-muted-foreground">{mov.fecha}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${mov.tipo === "entrada" ? "text-green-600" : "text-red-600"}`}>
                      {mov.monto > 0 ? "+" : ""}S/ {Math.abs(mov.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/accounting/journals">
                Ver todos los movimientos
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">¿Qué puedo hacer?</CardTitle>
            <CardDescription>Decisiones basadas en tu situación actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : cashData ? (
                <>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                          Gastos recurrentes próximos
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                          Tienes S/ {cashData.gastosRecurrentes.toLocaleString('es-PE')} en gastos fijos para esta semana.
                          Tu dinero actual lo cubre sin problemas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex gap-3">
                      <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm text-green-900 dark:text-green-100">
                          Capacidad de inversión
                        </h4>
                        <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                          Después de gastos fijos, tendrás ~S/ {(cashData.disponible - cashData.gastosRecurrentes).toLocaleString('es-PE')} disponibles.
                          Buen momento para invertir en inventario.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              <Button className="w-full" asChild>
                <Link href="/dashboard/sales/new">
                  Registrar nueva venta
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/sales">Ver ventas del mes</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/entries">Ver compras del mes</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/cashregister">Ver caja registradora</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
