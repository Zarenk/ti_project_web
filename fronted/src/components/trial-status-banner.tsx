"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Clock } from "lucide-react"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import type { SubscriptionSummary } from "@/types/subscription"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useTenantSelection } from "@/context/tenant-selection-context"

const STORAGE_PREFIX = "trial-banner:v1"

export function TrialStatusBanner() {
  const { isPublicSignup } = useAuth()
  const { selection } = useTenantSelection()
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const dismissalKey = useMemo(() => {
    if (isPublicSignup !== true) {
      return null
    }
    return selection.orgId ? `${STORAGE_PREFIX}:${selection.orgId}` : null
  }, [isPublicSignup, selection.orgId])

  useEffect(() => {
    if (isPublicSignup !== true) {
      setSummary(null)
      setDismissed(false)
      return
    }
    let mounted = true
    fetchSubscriptionSummary()
      .then((data) => {
        if (!mounted) return
        setSummary(data)
      })
      .catch(() => {
        if (!mounted) return
        setSummary(null)
      })
    return () => {
      mounted = false
    }
  }, [isPublicSignup])

  useEffect(() => {
    if (!summary || !dismissalKey || typeof window === "undefined") {
      setDismissed(false)
      return
    }
    try {
      const stored = window.localStorage.getItem(dismissalKey)
      if (!stored) {
        setDismissed(false)
        return
      }
      const payload = JSON.parse(stored) as { endsAt: string | null } | null
      const encodedEndsAt = summary.trial.endsAt ?? "__open_trial__"
      setDismissed(payload?.endsAt === encodedEndsAt)
    } catch {
      setDismissed(false)
    }
  }, [summary, dismissalKey])

  const needsAttention = useMemo(() => {
    if (!summary) return false
    return summary.trial.isTrial || summary.plan.status === "PAST_DUE"
  }, [summary])

  if (isPublicSignup !== true || !summary || !needsAttention || dismissed) {
    return null
  }

  const isTrial = summary.trial.isTrial
  const days = Math.max(summary.trial.daysLeft ?? 0, 0)
  const urgent = isTrial && (days <= 3 || summary.plan.status === "PAST_DUE")

  const relativeMessage = (() => {
    if (!isTrial) {
      return "Tu suscripción necesita atención. Actualiza tu plan para evitar interrupciones."
    }
    if (days <= 0) {
      return "Tu periodo de prueba termina hoy. Actualiza tu plan para continuar usando la plataforma."
    }
    return `Tu periodo de prueba termina en ${days} día${days === 1 ? "" : "s"}.`
  })()

  const deadlineText = summary.trial.endsAt
    ? new Date(summary.trial.endsAt).toLocaleDateString("es-PE", { dateStyle: "long" })
    : null

  const handleDismiss = () => {
    if (dismissalKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          dismissalKey,
          JSON.stringify({
            endsAt: summary.trial.endsAt ?? "__open_trial__",
            dismissedAt: new Date().toISOString(),
          }),
        )
      } catch {
        /* ignore storage failures */
      }
    }
    setDismissed(true)
  }

  return (
    <div
      className={`mx-4 mb-4 rounded-2xl border p-4 shadow-sm ${
        urgent
          ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-100"
          : "border-amber-100 bg-amber-50 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-100"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-full p-2 ${
              urgent
                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-100"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100"
            }`}
          >
            {urgent ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold">{relativeMessage}</p>
            {deadlineText ? (
              <p className="text-sm opacity-80">Fecha límite: {deadlineText}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant={urgent ? "destructive" : "default"}>
            <Link href="/dashboard/plan">Actualizar plan</Link>
          </Button>
          {isTrial ? (
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              Ocultar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
