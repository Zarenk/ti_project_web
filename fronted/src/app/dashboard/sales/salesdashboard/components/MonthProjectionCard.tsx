"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Calendar, Trophy, AlertTriangle } from "lucide-react"
import { MonthlyHistory, InventoryROI, ROIHistory } from "../../sales.api"
import { ProfitTrendChart } from "./ProfitTrendChart"

interface MonthProjectionCardProps {
  current: number
  projected: number
  confidence: number
  trend: 'up' | 'down' | 'stable'
  daysAnalyzed: number
  daysRemaining: number
  breakdown: {
    last30Days: number
    days30to60: number
    days60to90: number
  }
  monthlyHistory: MonthlyHistory
  inventoryROI?: InventoryROI
  roiHistory?: ROIHistory
}

export function MonthProjectionCard({
  current,
  projected,
  confidence,
  trend,
  daysAnalyzed,
  daysRemaining,
  breakdown,
  monthlyHistory,
  inventoryROI,
  roiHistory,
}: MonthProjectionCardProps) {
  const confidenceLevel =
    confidence > 0.7 ? 'Alta' :
    confidence > 0.4 ? 'Media' : 'Baja'

  const confidenceBadgeVariant =
    confidence > 0.7 ? 'default' :
    confidence > 0.4 ? 'secondary' : 'destructive'

  const TrendIcon =
    trend === 'up' ? TrendingUp :
    trend === 'down' ? TrendingDown : Minus

  const trendColor =
    trend === 'up' ? 'text-green-600' :
    trend === 'down' ? 'text-red-600' : 'text-gray-600'

  const projectedChange = projected - current
  const projectedChangePercent = current > 0 ? ((projectedChange / current) * 100).toFixed(1) : '0.0'

  // Calcular cambios porcentuales entre períodos
  const change30to60 = breakdown.days30to60 > 0
    ? ((breakdown.last30Days - breakdown.days30to60) / breakdown.days30to60 * 100).toFixed(1)
    : '0.0'
  const change60to90 = breakdown.days60to90 > 0
    ? ((breakdown.days30to60 - breakdown.days60to90) / breakdown.days60to90 * 100).toFixed(1)
    : '0.0'

  return (
    <Card className="border shadow-md">
      <CardHeader className="pb-1.5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-lg">Proyección Mensual</CardTitle>
            <CardDescription>Utilidad estimada del mes</CardDescription>
          </div>
          <Badge variant={confidenceBadgeVariant} className="cursor-pointer">
            Confianza: {confidenceLevel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {/* Utilidad actual: Layout de 3 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-start">
          {/* Columna izquierda: Título y valor total */}
          <div className="space-y-0.5">
            <p className="text-sm text-muted-foreground">Utilidad Actual (90 días)</p>
            <p className="text-2xl font-bold">S/. {current.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>

          {/* Columna centro: Gráfica animada */}
          <div className="h-80 w-full flex items-start justify-center -mt-2">
            <ProfitTrendChart
              monthlyData={monthlyHistory.months}
            />
          </div>

          {/* Columna derecha: Desglose por períodos */}
          <div className="space-y-1.5 text-xs text-right min-w-[140px]">
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground text-[10px]">Últimos 30 días:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">S/. {(breakdown.last30Days / 1000).toFixed(1)}k</span>
                {breakdown.days30to60 > 0 && (
                  <span className={Number(change30to60) >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ({Number(change30to60) >= 0 ? '+' : ''}{change30to60}%)
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground text-[10px]">Hace 30-60 días:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">S/. {(breakdown.days30to60 / 1000).toFixed(1)}k</span>
                {breakdown.days60to90 > 0 && (
                  <span className={Number(change60to90) >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ({Number(change60to90) >= 0 ? '+' : ''}{change60to90}%)
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground text-[10px]">Hace 60-90 días:</span>
              <span className="font-semibold">S/. {(breakdown.days60to90 / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>

        {/* Proyección */}
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">Proyección Fin de Mes</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-blue-600">S/. {projected.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span>{projectedChange >= 0 ? '+' : ''}{projectedChangePercent}%</span>
            </div>
          </div>
        </div>

        {/* Info adicional */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{daysAnalyzed} días analizados</span>
          </div>
          <span>{daysRemaining} días restantes</span>
        </div>

        {/* Nota de confianza */}
        {confidence < 0.4 && (
          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-md">
            ⚠️ Datos insuficientes para proyección confiable
          </div>
        )}

        {/* Histórico Mensual */}
        {monthlyHistory.months.length > 0 && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Histórico de Utilidades</h3>
            </div>

            {/* Mejor y peor mes */}
            <div className="grid grid-cols-2 gap-3">
              {monthlyHistory.bestMonth && (
                <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Trophy className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Mejor mes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{monthlyHistory.bestMonth.month}</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">
                    S/. {monthlyHistory.bestMonth.profit.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {monthlyHistory.worstMonth && (
                <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Peor mes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{monthlyHistory.worstMonth.month}</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    S/. {monthlyHistory.worstMonth.profit.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            {/* Lista de meses con sparklines y stock histórico */}
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
              {monthlyHistory.months.map((monthData, index) => {
                const isBest = monthData.month === monthlyHistory.bestMonth?.month
                const isWorst = monthData.month === monthlyHistory.worstMonth?.month

                // Obtener el valor del inventario histórico de este mes desde roiHistory
                const roiData = roiHistory?.months.find(r => r.month === monthData.month)
                const inventoryValueForMonth = roiData?.inventoryValue || 0

                // Calcular altura de sparkline basada en posición relativa
                const maxProfit = Math.max(...monthlyHistory.months.map(m => m.profit))
                const barHeight = maxProfit > 0 ? (monthData.profit / maxProfit) * 100 : 0

                return (
                  <div
                    key={monthData.month}
                    className={`flex items-center justify-between gap-3 p-2 rounded-md text-xs transition-colors ${
                      isBest
                        ? 'bg-green-50 dark:bg-green-950/10 hover:bg-green-100 dark:hover:bg-green-950/20'
                        : isWorst
                        ? 'bg-amber-50 dark:bg-amber-950/10 hover:bg-amber-100 dark:hover:bg-amber-950/20'
                        : 'hover:bg-muted/50 dark:hover:bg-muted/20'
                    }`}
                  >
                    {/* Columna 1: Mes */}
                    <span className="font-medium text-muted-foreground whitespace-nowrap w-16">{monthData.month}</span>

                    {/* Columna 2: Utilidad */}
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[10px] text-muted-foreground">Utilidad</span>
                      <span className="font-semibold whitespace-nowrap">
                        S/. {(monthData.profit / 1000).toFixed(1)}k
                      </span>
                    </div>

                    {/* Columna 3: Stock del mes (NUEVO) */}
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[10px] text-muted-foreground">Stock</span>
                      <span className="font-semibold text-blue-600 whitespace-nowrap">
                        S/. {(inventoryValueForMonth / 1000).toFixed(1)}k
                      </span>
                    </div>

                    {/* Columna 4: Sparkline y badges */}
                    <div className="flex items-center gap-2 ml-auto">
                      {/* Sparkline CSS */}
                      <div className="flex items-end gap-0.5 h-4">
                        {monthlyHistory.months.slice(Math.max(0, index - 5), index + 1).map((m, i) => {
                          const h = maxProfit > 0 ? (m.profit / maxProfit) * 16 : 0
                          return (
                            <div
                              key={i}
                              className="w-1 bg-blue-500 rounded-sm"
                              style={{ height: `${h}px` }}
                            />
                          )
                        })}
                      </div>

                      {/* Porcentaje de cambio */}
                      {index < monthlyHistory.months.length - 1 && (
                        <span className={`text-xs font-semibold whitespace-nowrap ${
                          monthData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {monthData.changePercent >= 0 ? '+' : ''}{monthData.changePercent.toFixed(1)}%
                        </span>
                      )}
                      {isBest && <Trophy className="w-3 h-3 text-green-600 flex-shrink-0" />}
                      {isWorst && <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Análisis Costo-Beneficio: ROI del Inventario */}
        {inventoryROI && (() => {
          // Obtener el valor del inventario del mes más reciente del histórico
          // Si no hay histórico, usar el valor actual
          const latestInventoryValue = roiHistory?.months[0]?.inventoryValue || inventoryROI.totalInventoryValue
          const isHistoricalValue = roiHistory?.months && roiHistory.months.length > 0

          // Cálculo del gauge circular para ROI
          const circumference = 2 * Math.PI * 56 // radio 56
          const progress = Math.min(inventoryROI.roiPercent / 20, 1) // Max 20% = 100%
          const offset = circumference - (progress * circumference)

          const getStatusColor = (status: string) => {
            switch (status) {
              case 'critical': return 'text-red-500'
              case 'warning': return 'text-amber-500'
              default: return 'text-green-500'
            }
          }

          return (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Retorno de Inventario (ROI)</h3>
              </div>

              {/* Grid de métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isHistoricalValue ? 'Stock del Mes' : 'Valor Total Inventario'}
                  </p>
                  <p className="text-lg font-bold">
                    S/. {latestInventoryValue.toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  {isHistoricalValue && roiHistory?.months[0] && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {roiHistory.months[0].month}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Utilidad del Mes</p>
                  <p className="text-lg font-bold text-blue-600">
                    S/. {inventoryROI.monthlyProfit.toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              </div>

              {/* Gauge circular con ROI */}
              <div className="flex flex-col items-center gap-3 py-4">
                {/* SVG Gauge */}
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/20"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      className={`transition-all duration-1000 ease-out ${getStatusColor(inventoryROI.status)}`}
                    />
                  </svg>

                  {/* Porcentaje central */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className={`text-3xl font-bold ${getStatusColor(inventoryROI.status)}`}>
                      {inventoryROI.roiPercent.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">ROI Mensual</p>
                  </div>
                </div>

                {/* Leyenda de umbrales */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">&lt; 5%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">5-10%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">&gt; 10%</span>
                  </div>
                </div>

                {/* Alerta condicional */}
                {inventoryROI.status !== 'healthy' && (
                  <div className={`w-full p-3 rounded-lg text-sm ${
                    inventoryROI.status === 'critical'
                      ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900'
                      : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold mb-1">{inventoryROI.alertMessage}</p>
                        <p className="text-xs opacity-90">
                          {inventoryROI.status === 'critical'
                            ? 'Considera reducir inventario de productos de baja rotación'
                            : 'Monitorea la rotación de inventario regularmente'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Histórico de ROI */}
        {roiHistory && roiHistory.months.length > 0 && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Histórico de ROI</h3>
            </div>

            {/* Mejor y peor mes de ROI */}
            <div className="grid grid-cols-2 gap-3">
              {roiHistory.bestMonth && (
                <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Trophy className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Mejor ROI</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{roiHistory.bestMonth.month}</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">
                    {roiHistory.bestMonth.roiPercent.toFixed(1)}%
                  </p>
                </div>
              )}
              {roiHistory.worstMonth && (
                <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Peor ROI</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{roiHistory.worstMonth.month}</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    {roiHistory.worstMonth.roiPercent.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {/* Lista de meses con ROI */}
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {roiHistory.months.map((monthData, index) => {
                const isBest = monthData.month === roiHistory.bestMonth?.month
                const isWorst = monthData.month === roiHistory.worstMonth?.month

                // Determinar si es el mes actual
                const now = new Date()
                const currentMonth = now.getMonth() + 1 // 1-12
                const currentYear = now.getFullYear()
                const isCurrentMonth = monthData.monthNumber === currentMonth && monthData.year === currentYear

                // Generar label dinámico para el stock
                const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                const stockLabel = isCurrentMonth
                  ? 'Stock Actual'
                  : `Stock de ${monthNames[monthData.monthNumber]}`

                // Calcular altura de sparkline basada en ROI relativo
                const maxROI = Math.max(...roiHistory.months.map(m => m.roiPercent))
                const barHeight = maxROI > 0 ? (monthData.roiPercent / maxROI) * 100 : 0

                // Determinar color según umbral de ROI
                const getROIColor = (roi: number) => {
                  if (roi < 5) return 'text-red-600'
                  if (roi < 10) return 'text-amber-600'
                  return 'text-green-600'
                }

                return (
                  <div
                    key={monthData.month}
                    className={`p-2 rounded-md text-xs transition-colors space-y-1.5 ${
                      isBest
                        ? 'bg-green-50 dark:bg-green-950/10 hover:bg-green-100 dark:hover:bg-green-950/20'
                        : isWorst
                        ? 'bg-amber-50 dark:bg-amber-950/10 hover:bg-amber-100 dark:hover:bg-amber-950/20'
                        : 'hover:bg-muted/50 dark:hover:bg-muted/20'
                    }`}
                  >
                    {/* Fila principal con mes y ROI */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium text-muted-foreground whitespace-nowrap">{monthData.month}</span>
                        <span className={`font-semibold ${getROIColor(monthData.roiPercent)}`}>
                          {monthData.roiPercent.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Sparkline CSS */}
                        <div className="flex items-end gap-0.5 h-4">
                          {roiHistory.months.slice(Math.max(0, index - 5), index + 1).map((m, i) => {
                            const h = maxROI > 0 ? (m.roiPercent / maxROI) * 16 : 0
                            const color = m.roiPercent < 5 ? 'bg-red-500' : m.roiPercent < 10 ? 'bg-amber-500' : 'bg-green-500'
                            return (
                              <div
                                key={i}
                                className={`w-1 rounded-sm ${color}`}
                                style={{ height: `${h}px` }}
                              />
                            )
                          })}
                        </div>

                        {/* Porcentaje de cambio */}
                        {index < roiHistory.months.length - 1 && (
                          <span className={`text-xs font-semibold whitespace-nowrap ${
                            monthData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {monthData.changePercent >= 0 ? '+' : ''}{monthData.changePercent.toFixed(1)}%
                          </span>
                        )}
                        {isBest && <Trophy className="w-3 h-3 text-green-600 flex-shrink-0" />}
                        {isWorst && <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                      </div>
                    </div>

                    {/* Detalles del mes */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 pl-1 border-l-2 border-muted/30">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground">Ventas:</span>
                        <span className="text-xs font-semibold text-blue-600">
                          S/. {(monthData.totalSales ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground">Compras:</span>
                        <span className="text-xs font-semibold text-purple-600">
                          S/. {(monthData.totalPurchases ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground">Utilidad:</span>
                        <span className="text-xs font-semibold text-green-600">
                          S/. {monthData.profit.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground">{stockLabel}:</span>
                        <span className="text-xs font-semibold text-slate-600">
                          S/. {(monthData.inventoryValue / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
