"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Lock, CreditCard, Download, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import type { SubscriptionSummary } from "@/types/subscription"

/**
 * Full-screen overlay shown when a payment-enforced subscription
 * reaches the LOCKED grace tier (22+ days past due).
 *
 * Place this component inside the dashboard layout. It will
 * auto-hide if the subscription is not locked.
 */
export function SubscriptionLockedOverlay() {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)

  useEffect(() => {
    let mounted = true
    fetchSubscriptionSummary()
      .then((data) => {
        if (mounted) setSummary(data)
      })
      .catch(() => {
        if (mounted) setSummary(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  const isLocked =
    summary?.paymentEnforced === true && summary?.graceTier === "LOCKED"

  if (!isLocked) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-lg border-red-200 shadow-2xl dark:border-red-800/60">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
            <Lock className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl">Cuenta suspendida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Tu cuenta ha sido suspendida por falta de pago. Para recuperar el
            acceso completo a la plataforma, regulariza tu situación de pago.
          </p>

          <div className="flex flex-col gap-2">
            <Button asChild className="cursor-pointer gap-2">
              <Link href="/dashboard/account/billing">
                <CreditCard className="h-4 w-4" />
                Regularizar pago
              </Link>
            </Button>
            <Button asChild variant="outline" className="cursor-pointer gap-2">
              <Link href="/dashboard/account/plan">
                Ver planes disponibles
              </Link>
            </Button>
          </div>

          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Mientras tanto puedes:
            </p>
            <div className="flex flex-col gap-1.5">
              <Link
                href="/dashboard/sales"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5 flex-shrink-0" />
                Ver historial y descargar PDFs/XML
              </Link>
              <a
                href="mailto:soporte@facturacloud.pe"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5 flex-shrink-0" />
                Contactar soporte
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
