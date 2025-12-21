"use client"

import { useEffect, useState } from "react"
import type { SubscriptionSummary } from "@/types/subscription"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface MeterProps {
  label: string
  value: number
  limit?: number | null
  suffix?: string
}

function Meter({ label, value, limit, suffix = "" }: MeterProps) {
  const percentage = limit && limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : null
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>
          {value.toLocaleString("es-PE")}
          {suffix}
          {limit ? ` / ${limit.toLocaleString("es-PE")}${suffix}` : ""}
        </span>
      </div>
      {percentage !== null ? (
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 dark:from-slate-500 dark:to-slate-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : (
        <p className="text-xs text-slate-400">Sin límite definido</p>
      )}
    </div>
  )
}

interface SubscriptionQuotaCardProps {
  organizationId?: number | null
}

export function SubscriptionQuotaCard({ organizationId }: SubscriptionQuotaCardProps) {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchSubscriptionSummary(organizationId ?? undefined)
      .then((data) => {
        if (!mounted) return
        setSummary(data)
      })
      .catch(() => {
        if (!mounted) return
        setSummary(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [organizationId])

  if (loading) {
    return (
      <Card className="border-sky-100 dark:border-slate-700">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
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
    <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-800 dark:text-slate-100">Consumo del plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
