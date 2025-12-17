"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BillingPaymentMethod } from "../billing.api"

interface PaymentMethodCardProps {
  method: BillingPaymentMethod
  onMarkDefault: () => void
  onDelete: () => void
  onEdit: () => void
}

const PROVIDER_LABELS: Record<string, string> = {
  STRIPE: "Stripe",
  MERCADOPAGO: "Mercado Pago",
  CULQI: "Culqi",
  MANUAL: "Manual",
}

export function PaymentMethodCard({ method, onMarkDefault, onDelete, onEdit }: PaymentMethodCardProps) {
  const providerLabel = PROVIDER_LABELS[method.provider] ?? method.provider
  const masked = method.last4 ? `**** ${method.last4}` : method.externalId

  const handleDeleteClick = () => {
    if (confirm("Seguro que deseas eliminar este metodo?")) {
      onDelete()
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            {method.brand ?? providerLabel}
            {method.isDefault ? <Badge>Predeterminado</Badge> : null}
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">{providerLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDeleteClick}>
            Eliminar
          </Button>
          {!method.isDefault ? (
            <Button variant="secondary" size="sm" onClick={onMarkDefault}>
              Marcar como predeterminado
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p>Identificador: {masked}</p>
        {method.expMonth && method.expYear ? (
          <p>
            Expira: {String(method.expMonth).padStart(2, "0")}/{method.expYear}
          </p>
        ) : null}
        {method.billingCustomerId ? <p>Cliente PSP: {method.billingCustomerId}</p> : null}
        <p className="text-xs text-slate-500">Estado: {method.status}</p>
      </CardContent>
    </Card>
  )
}
