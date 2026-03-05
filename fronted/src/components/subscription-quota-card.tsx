"use client"

import { useEffect, useState } from "react"
import type { SubscriptionSummary } from "@/types/subscription"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MeterProps {
  label: string
  value: number
  limit?: number | null
  suffix?: string
}

function Meter({ label, value, limit, suffix = "" }: MeterProps) {
  const percentage = limit && limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : null
  const barColor =
    percentage !== null && percentage >= 90
      ? "from-rose-500 to-red-500 dark:from-rose-400 dark:to-red-400"
      : percentage !== null && percentage >= 70
        ? "from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400"
        : "from-sky-500 to-indigo-500 dark:from-sky-400 dark:to-indigo-400"

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>
          {value.toLocaleString("es-PE")}
          {suffix}
          {limit ? ` / ${limit.toLocaleString("es-PE")}${suffix}` : ""}
          {percentage !== null ? ` (${percentage}%)` : ""}
        </span>
      </div>
      {percentage !== null ? (
        <div className="h-1.5 sm:h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : (
        <p className="text-[10px] sm:text-xs text-slate-400">Sin limite definido</p>
      )}
    </div>
  )
}

interface SubscriptionQuotaCardProps {
  organizationId?: number | null
  /** When provided, skip internal fetch (deduplication) */
  summary?: SubscriptionSummary | null
  /** Loading state when using external summary */
  loading?: boolean
}

export function SubscriptionQuotaCard({
  organizationId,
  summary: externalSummary,
  loading: externalLoading,
}: SubscriptionQuotaCardProps) {
  const hasExternalData = externalSummary !== undefined
  const [internalSummary, setInternalSummary] = useState<SubscriptionSummary | null>(null)
  const [internalLoading, setInternalLoading] = useState(!hasExternalData)

  useEffect(() => {
    // Skip fetch if external summary was provided
    if (hasExternalData) return

    let mounted = true
    setInternalLoading(true)
    fetchSubscriptionSummary(organizationId ?? undefined)
      .then((data) => {
        if (!mounted) return
        setInternalSummary(data)
      })
      .catch(() => {
        if (!mounted) return
        setInternalSummary(null)
      })
      .finally(() => {
        if (mounted) setInternalLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [organizationId, hasExternalData])

  const summary = hasExternalData ? externalSummary : internalSummary
  const isLoading = hasExternalData ? (externalLoading ?? false) : internalLoading

  if (isLoading) {
    return (
      <Card className="border-sky-100 w-full min-w-0 overflow-hidden dark:border-slate-700">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
          <Skeleton className="h-4 sm:h-5 w-32 sm:w-40" />
        </CardHeader>
        <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return null
  }

  const { usage, quotas } = summary

  return (
    <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md w-full min-w-0 overflow-hidden dark:border-slate-700 dark:bg-slate-800">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <CardTitle className="text-sm sm:text-base text-slate-800 dark:text-slate-100">Consumo del plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
        <Meter label="Usuarios" value={usage.users} limit={quotas.users ?? quotas.maxUsers ?? null} />
        <Meter
          label="Comprobantes"
          value={usage.invoices}
          limit={quotas.invoices ?? quotas.maxInvoices ?? null}
        />
        <Meter
          label="Almacenamiento"
          value={Math.round(usage.storageMB)}
          limit={quotas.storageMB ?? quotas.maxStorageMB ?? null}
          suffix=" MB"
        />
      </CardContent>
    </Card>
  )
}
