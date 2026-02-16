"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { JSX } from "react"
import type { SubscriptionSummary } from "@/types/subscription"
import { fetchSubscriptionSummary } from "@/lib/subscription-summary"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { SubscriptionUsageCard } from "@/components/subscription-usage-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExclamationTriangleIcon } from "lucide-react"

function formatDateFromIso(value?: string | null): string {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "—"
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed)
}

function formatCurrencyDisplay(value?: string | null, currency = "PEN"): string {
  if (!value) return "—"
  const numeric = Number(value)
  if (Number.isNaN(numeric)) {
    return `${currency} ${value}`
  }
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numeric)
}

export default function BillingPage(): JSX.Element {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSubscriptionSummary()
      setSummary(data)
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo obtener la facturación. Inténtalo nuevamente en unos minutos."
      setError(message)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    loadSummary().catch(() => {
      if (!active) return
    })
    return () => {
      active = false
    }
  }, [loadSummary])

  const resumeContent = useMemo(() => {
    if (!summary) return null
    const contact = summary.contacts.primary
    const companyName = summary.company?.name ?? summary.organization?.name ?? "—"

    return (
      <>
        <div className="space-y-2">
          <Label>Plan activo</Label>
          <Input value={summary.plan.name} readOnly className="font-medium" />
          <p className="text-xs text-muted-foreground">
            {formatCurrencyDisplay(summary.plan.price, summary.plan.currency)} / {summary.plan.interval === "YEARLY" ? "año" : "mes"}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Empresa facturada</Label>
          <Input value={companyName} readOnly className="font-medium" />
        </div>
        <div className="space-y-2">
          <Label>Responsable comercial</Label>
          <Input value={contact ? `${contact.name} (${contact.email})` : "—"} readOnly />
        </div>
        <div className="space-y-2">
          <Label>Próxima renovación</Label>
          <Input value={formatDateFromIso(summary.billing.currentPeriodEnd ?? summary.billing.nextDueDate)} readOnly />
        </div>
      </>
    )
  }, [summary])

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl space-y-8 py-10">
        <Skeleton className="h-8 w-40" />
        <Card className="border-2">
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="container mx-auto max-w-3xl space-y-6 py-10">
        <p className="text-center text-sm text-rose-600">{error ?? "No hay información disponible."}</p>
        <Button onClick={loadSummary}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-10 py-10">
      <header className="space-y-2">
        <Badge className="rounded-full bg-amber-500 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-white">
          Facturación
        </Badge>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Historial de pagos</h1>
          <p className="text-muted-foreground">
            Consulta el estado de tu suscripción y descarga comprobantes oficiales cuando estén disponibles.
          </p>
        </div>
      </header>

      <Card className="border-2">
        <CardHeader className="space-y-3">
          <CardTitle>Resumen de facturación</CardTitle>
          <CardDescription>
            Todos los montos se muestran en soles (PEN). Si detectas alguna diferencia en tus recibos contáctanos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">{resumeContent}</CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            La descarga automática de facturas se habilitará en las próximas iteraciones.
          </p>
          <Button variant="outline" className="rounded-full" disabled>
            Exportar historial
          </Button>
        </CardFooter>
      </Card>

      {summary.plan.restrictions ? (
        <Alert className="border-amber-500/30 bg-amber-50 dark:border-amber-500/40 dark:bg-slate-900">
          <AlertTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Suscripción limitada
          </AlertTitle>
          <AlertDescription className="text-amber-900/80 dark:text-amber-100/80">
            Tu cuenta tiene cobros pendientes y los límites fueron reducidos temporalmente. Reintenta el pago desde la
            sección “Mi plan” para restaurar el acceso completo.
          </AlertDescription>
        </Alert>
      ) : null}

      <SubscriptionUsageCard summary={summary} />

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Pagos recientes</CardTitle>
          <CardDescription>En esta tabla aparecerán tus pagos confirmados y enlaces de descarga.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Comprobante</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="w-32">Fecha</TableHead>
                <TableHead className="w-32 text-right">Importe</TableHead>
                <TableHead className="w-32">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Aún no registramos pagos en esta organización o la integración sigue en curso.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
