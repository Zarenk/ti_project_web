"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { DateRange } from "react-day-picker"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { getProfitAnalysis, ProfitAnalysisResponse } from "../../sales.api"
import { Skeleton } from "@/components/ui/skeleton"
import { MonthProjectionCard } from "./MonthProjectionCard"
import { TopProfitableProducts } from "./TopProfitableProducts"
import { LowProfitProducts } from "./LowProfitProducts"
import { InvestmentRecommendations } from "./InvestmentRecommendations"
import { AlertCircle } from "lucide-react"

interface ProfitAnalyticsTabProps {
  dateRange: DateRange
}

export function ProfitAnalyticsTab({ dateRange }: ProfitAnalyticsTabProps) {
  const { selection } = useTenantSelection()

  const from = dateRange?.from?.toISOString() ?? ""
  const to = dateRange?.to?.toISOString() ?? ""

  const { data = null, isLoading, error: queryError } = useQuery<ProfitAnalysisResponse | null>({
    queryKey: [...queryKeys.sales.dashboard(selection.orgId, selection.companyId), "profitAnalysis", { from, to }],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return null

      const fromStr = dateRange.from.toISOString()
      const toStr = dateRange.to.toISOString()

      return await getProfitAnalysis(fromStr, toStr)
    },
    enabled: selection.orgId !== null && !!dateRange?.from && !!dateRange?.to,
  })

  const error = queryError ? (queryError instanceof Error ? queryError.message : "Error desconocido") : null

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error al cargar análisis</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Selecciona un rango de fechas para ver el análisis</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Proyección del mes */}
      <MonthProjectionCard
        current={data.monthProjection.current}
        projected={data.monthProjection.projected}
        confidence={data.monthProjection.confidence}
        trend={data.monthProjection.trend}
        daysAnalyzed={data.monthProjection.daysAnalyzed}
        daysRemaining={data.monthProjection.daysRemaining}
        breakdown={data.monthProjection.breakdown}
        monthlyHistory={data.monthlyHistory}
        inventoryROI={data.inventoryROI}
        roiHistory={data.roiHistory}
      />

      {/* Top 10 rentables y no rentables */}
      <div className="grid gap-6 md:grid-cols-2 w-full min-w-0">
        <TopProfitableProducts products={data.top50Profitable} />
        <LowProfitProducts products={data.top50Unprofitable} />
      </div>

      {/* Recomendaciones de inversión */}
      <InvestmentRecommendations recommendations={data.recommendations} />
    </div>
  )
}
