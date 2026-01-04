"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Clock, Info } from "lucide-react"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import type { SubscriptionSummary } from "@/types/subscription"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useTenantSelection } from "@/context/tenant-selection-context"

const STORAGE_PREFIX = "trial-banner:v1"
const VERTICAL_NOTICE_STORAGE_PREFIX = "vertical-notice:v1"
const VERTICAL_NOTICE_EVENT = "vertical-change:notice"
const MIGRATION_ASSISTANT_PATH = "/dashboard/products/migration"

export function TrialStatusBanner() {
  const { isPublicSignup } = useAuth()
  const { selection } = useTenantSelection()
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [verticalNotice, setVerticalNotice] = useState<string | null>(null)

  const dismissalKey = useMemo(() => {
    if (isPublicSignup !== true) {
      return null
    }
    return selection.companyId ? `${STORAGE_PREFIX}:${selection.companyId}` : null
  }, [isPublicSignup, selection.companyId])

  const verticalNoticeKey = useMemo(() => {
    return selection.companyId
      ? `${VERTICAL_NOTICE_STORAGE_PREFIX}:${selection.companyId}`
      : null
  }, [selection.companyId])

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

  useEffect(() => {
    if (!verticalNoticeKey || typeof window === "undefined") {
      setVerticalNotice(null)
      return
    }

    const readNotice = () => {
      try {
        const stored = window.localStorage.getItem(verticalNoticeKey)
        if (!stored) {
          setVerticalNotice(null)
          return
        }
        const payload = JSON.parse(stored) as { message?: string | null } | null
        if (!payload?.message) {
          setVerticalNotice(null)
          return
        }
        setVerticalNotice(payload.message)
      } catch {
        setVerticalNotice(null)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === verticalNoticeKey) {
        readNotice()
      }
    }

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ companyId?: number }>).detail
      if (!detail?.companyId || detail.companyId === selection.companyId) {
        readNotice()
      }
    }

    readNotice()
    window.addEventListener("storage", handleStorage)
    window.addEventListener(VERTICAL_NOTICE_EVENT, handleCustomEvent as EventListener)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(VERTICAL_NOTICE_EVENT, handleCustomEvent as EventListener)
    }
  }, [verticalNoticeKey, selection.companyId])

  const needsAttention = useMemo(() => {
    if (!summary) return false
    return summary.trial.isTrial || summary.plan.status === "PAST_DUE"
  }, [summary])

  const showTrialBanner =
    isPublicSignup === true && summary && needsAttention && dismissed === false

  const handleNoticeDismiss = () => {
    if (!verticalNoticeKey || typeof window === "undefined") {
      setVerticalNotice(null)
      return
    }
    try {
      window.localStorage.removeItem(verticalNoticeKey)
      window.dispatchEvent(
        new CustomEvent(VERTICAL_NOTICE_EVENT, {
          detail: { companyId: selection.companyId },
        }),
      )
    } catch {
      /* ignore */
    }
    setVerticalNotice(null)
  }

  const isTrial = summary?.trial.isTrial === true
  const days = summary ? Math.max(summary.trial.daysLeft ?? 0, 0) : 0
  const urgent = !!summary && isTrial && (days <= 3 || summary.plan.status === "PAST_DUE")

  const verticalNoticeBanner = verticalNotice ? (
    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sky-900 shadow-sm dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-50">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/40 dark:text-sky-100">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Configuración actualizada</p>
            <p className="text-sm opacity-80">{verticalNotice}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/products">Ir a productos</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={MIGRATION_ASSISTANT_PATH}>Asistente de migración</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNoticeDismiss}>
            Ocultar
          </Button>
        </div>
      </div>
    </div>
  ) : null

  const relativeMessage = (() => {
    if (!isTrial) {
      return "Tu suscripción necesita atención. Actualiza tu plan para evitar interrupciones."
    }
    if (days <= 0) {
      return "Tu periodo de prueba termina hoy. Actualiza tu plan para continuar usando la plataforma."
    }
    return `Tu periodo de prueba termina en ${days} día${days === 1 ? "" : "s"}.`
  })()

  const deadlineText =
    summary?.trial.endsAt != null
      ? new Date(summary.trial.endsAt).toLocaleDateString("es-PE", { dateStyle: "long" })
      : null

  const handleDismiss = () => {
    if (!summary) return
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

  const trialBanner =
    showTrialBanner && summary ? (
      <div
        className={`rounded-2xl border p-4 shadow-sm ${
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
    ) : null

  if (!verticalNoticeBanner && !trialBanner) {
    return null
  }

  return (
    <div className="mx-4 mb-4 space-y-3">
      {verticalNoticeBanner}
      {trialBanner}
    </div>
  )
}
