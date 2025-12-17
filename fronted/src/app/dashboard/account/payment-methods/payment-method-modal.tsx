"use client"

import { FormEvent, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import {
  type BillingPaymentMethod,
  type BillingPaymentProvider,
  type UpsertPaymentMethodInput,
  upsertPaymentMethod,
} from "../billing.api"

const PROVIDERS: { label: string; value: BillingPaymentProvider }[] = [
  { label: "Mercado Pago", value: "MERCADOPAGO" },
  { label: "Stripe", value: "STRIPE" },
  { label: "Culqi", value: "CULQI" },
  { label: "Manual", value: "MANUAL" },
]

interface PaymentMethodModalProps {
  organizationId: number
  method: BillingPaymentMethod | null
  onSuccess: () => void
}

export function PaymentMethodModal({ organizationId, method, onSuccess }: PaymentMethodModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => ({
    provider: (method?.provider ?? "MERCADOPAGO") as BillingPaymentProvider,
    externalId: method?.externalId ?? "",
    brand: method?.brand ?? "",
    last4: method?.last4 ?? "",
    expMonth: method?.expMonth ? String(method.expMonth).padStart(2, "0") : "",
    expYear: method?.expYear ? String(method.expYear) : "",
    country: method?.country ?? "",
    isDefault: method?.isDefault ?? !method,
    billingCustomerId: method?.billingCustomerId ?? "",
  }))

  const isEditing = Boolean(method)
  const providerOptions = useMemo(() => PROVIDERS, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.externalId.trim()) {
      toast.error("El identificador del metodo es obligatorio")
      return
    }
    setSaving(true)
    const payload: UpsertPaymentMethodInput = {
      organizationId,
      provider: form.provider,
      externalId: form.externalId.trim(),
      brand: form.brand.trim() || null,
      last4: form.last4.trim() || null,
      expMonth: form.expMonth ? Number(form.expMonth) : null,
      expYear: form.expYear ? Number(form.expYear) : null,
      country: form.country.trim() || null,
      isDefault: form.isDefault,
      billingCustomerId: form.billingCustomerId.trim() || null,
    }
    try {
      await upsertPaymentMethod(payload)
      toast.success(isEditing ? "Metodo actualizado" : "Metodo registrado")
      onSuccess()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el metodo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="provider">Proveedor</Label>
          <Select
            value={form.provider}
            onValueChange={(value) => setForm((prev) => ({ ...prev, provider: value as BillingPaymentProvider }))}
          >
            <SelectTrigger id="provider">
              <SelectValue placeholder="Selecciona el proveedor" />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="externalId">Identificador en el PSP</Label>
          <Input
            id="externalId"
            value={form.externalId}
            onChange={(event) => setForm((prev) => ({ ...prev, externalId: event.target.value }))}
            placeholder="ID de la tarjeta o token"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="brand">Marca</Label>
          <Input
            id="brand"
            value={form.brand ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
            placeholder="Visa, MasterCard..."
          />
        </div>
        <div>
          <Label htmlFor="last4">Ultimos 4 digitos</Label>
          <Input
            id="last4"
            value={form.last4 ?? ""}
            maxLength={4}
            onChange={(event) => setForm((prev) => ({ ...prev, last4: event.target.value.replace(/\D/g, "") }))}
            placeholder="1234"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="expMonth">Mes de expiracion</Label>
          <Input
            id="expMonth"
            value={form.expMonth}
            maxLength={2}
            onChange={(event) => setForm((prev) => ({ ...prev, expMonth: event.target.value.replace(/\D/g, "") }))}
            placeholder="08"
          />
        </div>
        <div>
          <Label htmlFor="expYear">Anio de expiracion</Label>
          <Input
            id="expYear"
            value={form.expYear}
            maxLength={4}
            onChange={(event) => setForm((prev) => ({ ...prev, expYear: event.target.value.replace(/\D/g, "") }))}
            placeholder="2026"
          />
        </div>
        <div>
          <Label htmlFor="country">Pais / codigo</Label>
          <Input
            id="country"
            value={form.country ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
            placeholder="PE, US, etc."
          />
        </div>
      </div>

      <div>
        <Label htmlFor="billingCustomerId">ID de cliente en el PSP</Label>
        <Input
          id="billingCustomerId"
          value={form.billingCustomerId ?? ""}
          onChange={(event) => setForm((prev) => ({ ...prev, billingCustomerId: event.target.value }))}
          placeholder="customer_123"
        />
        <p className="mt-1 text-xs text-slate-500">
          Si conectaste la tarjeta desde la consola de Mercado Pago o Stripe, indica aqui el ID de cliente para sincronizarlo.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">Usar como predeterminado</p>
          <p className="text-xs text-slate-500">
            Este metodo se utilizara para los cobros automaticos y reintentos de dunning.
          </p>
        </div>
        <Switch checked={form.isDefault} onCheckedChange={(value) => setForm((prev) => ({ ...prev, isDefault: value }))} />
      </div>

      <div className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-700">
        Si ya agregaste la tarjeta desde el iframe de Mercado Pago, solo ingresa el identificador y el ID de cliente. El sistema
        mantendra ambos datos sincronizados.
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : isEditing ? "Actualizar metodo" : "Guardar metodo"}
        </Button>
      </div>
    </form>
  )
}
