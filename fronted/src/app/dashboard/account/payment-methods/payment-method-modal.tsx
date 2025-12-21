"use client"

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
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

const MERCADOPAGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? ""

type MercadoPagoCardFormInstance = {
  unmount?: () => void
  destroy?: () => void
  getCardFormData: () => Record<string, any>
  submit: () => void
}

type MercadoPagoSdk = {
  cardForm: (config: Record<string, any>) => MercadoPagoCardFormInstance
}

let mercadoPagoPromise: Promise<MercadoPagoSdk | null> | null = null

async function getMercadoPago(): Promise<MercadoPagoSdk | null> {
  if (!MERCADOPAGO_PUBLIC_KEY) {
    return null
  }
  if (!mercadoPagoPromise) {
    mercadoPagoPromise = import("@mercadopago/sdk-js")
      .then(async ({ loadMercadoPago }) => {
        await loadMercadoPago()
        const Constructor = (window as any)?.MercadoPago
        if (!Constructor) {
          throw new Error("MercadoPago SDK no disponible")
        }
        return new Constructor(MERCADOPAGO_PUBLIC_KEY, { locale: "es-PE" })
      })
      .catch((error) => {
        mercadoPagoPromise = null
        throw error
      })
  }
  return mercadoPagoPromise
}

interface PaymentMethodModalProps {
  organizationId: number
  method: BillingPaymentMethod | null
  onSuccess: () => void
  allowManualSync: boolean
}

export function PaymentMethodModal({ organizationId, method, onSuccess, allowManualSync }: PaymentMethodModalProps) {
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
  const cardFormId = useId()
  const cardFormRef = useRef<any>(null)
  const mpMountedRef = useRef(false)
  const cardFormPendingDefault = useRef<boolean>(form.isDefault)
  const enableCardForm = !method && Boolean(MERCADOPAGO_PUBLIC_KEY)
  const manualOnly = !enableCardForm
  const manualSectionEnabled = manualOnly || allowManualSync
  const [manualMode, setManualMode] = useState(manualOnly)
  const [cardIntegrationStatus, setCardIntegrationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")

  const isEditing = Boolean(method)
  const providerOptions = useMemo(() => PROVIDERS, [])

  const cardFieldIds = useMemo(() => {
    const suffix = cardFormId.replace(/:/g, "-")
    return {
      form: `mp-card-form-${suffix}`,
      cardholderName: `mp-cardholder-name-${suffix}`,
      cardholderEmail: `mp-cardholder-email-${suffix}`,
      cardNumber: `mp-card-number-${suffix}`,
      cardExpirationDate: `mp-card-expiration-${suffix}`,
      securityCode: `mp-card-security-${suffix}`,
      identificationType: `mp-card-id-type-${suffix}`,
      identificationNumber: `mp-card-id-number-${suffix}`,
      issuer: `mp-card-issuer-${suffix}`,
      installments: `mp-card-installments-${suffix}`,
    }
  }, [cardFormId])

  const destroyCardForm = useCallback(() => {
    if (mpMountedRef.current && cardFormRef.current) {
      try {
        cardFormRef.current.unmount?.()
        cardFormRef.current.destroy?.()
      } catch (error) {
        console.warn("[payment-methods] MERCADOPAGO destroy", error)
      }
    }
    mpMountedRef.current = false
    cardFormRef.current = null
    setCardIntegrationStatus("idle")
  }, [])

  const handleCardTokenSubmit = useCallback(
    async (cardData: Record<string, any> | null | undefined) => {
      try {
        if (!cardData?.token) {
          toast.error("No pudimos tokenizar la tarjeta. Verifica los datos ingresados.")
          return
        }
        const expMonthRaw = cardData.cardExpirationMonth ?? cardData.cardExpirationDate?.split("/")[0]
        const expYearRaw = cardData.cardExpirationYear ?? cardData.cardExpirationDate?.split("/")[1]
        const normalizeYear = (value?: string | null) => {
          if (!value) return null
          const cleaned = value.trim()
          if (cleaned.length === 2) {
            return Number(`20${cleaned}`)
          }
          return Number(cleaned)
        }
        const payload: UpsertPaymentMethodInput = {
          organizationId,
          provider: "MERCADOPAGO",
          externalId: cardData.token,
          brand: cardData.paymentMethodId ?? cardData.paymentMethod?.id ?? null,
          last4: cardData.lastFourDigits ?? cardData.cardNumber?.slice(-4) ?? null,
          expMonth: expMonthRaw ? Number(expMonthRaw) : null,
          expYear: normalizeYear(expYearRaw),
          country: cardData.cardholderIdentification?.type ?? null,
          isDefault: cardFormPendingDefault.current,
          billingCustomerId: cardData.customerId ?? null,
          tokenized: true,
          cardholderEmail: cardData.cardholderEmail ?? cardData.cardholder?.email ?? null,
          cardholderName: cardData.cardholderName ?? cardData.cardholder?.name ?? null,
          identificationType: cardData.cardholderIdentification?.type ?? null,
          identificationNumber: cardData.cardholderIdentification?.number ?? null,
        }
        await upsertPaymentMethod(payload)
        toast.success("Metodo registrado")
        onSuccess()
      } catch (error) {
        console.error("[payment-methods] save card token", error)
        toast.error(error instanceof Error ? error.message : "No se pudo guardar el metodo")
      } finally {
        setSaving(false)
      }
    },
    [onSuccess, organizationId],
  )

  useEffect(() => {
    cardFormPendingDefault.current = form.isDefault
  }, [form.isDefault])

  useEffect(() => {
    if (!enableCardForm || manualMode) {
      destroyCardForm()
      if (manualMode) {
        setCardIntegrationStatus("idle")
      }
      return
    }
    if (typeof window === "undefined") {
      setCardIntegrationStatus("error")
      return
    }

    let active = true
    setCardIntegrationStatus("loading")

    const setupCardForm = async () => {
      if (cardFormRef.current) {
        mpMountedRef.current = true
        setCardIntegrationStatus("ready")
        return
      }
      try {
        const mercadoPagoInstance = await getMercadoPago()
        if (!active) return
        if (!mercadoPagoInstance) {
          throw new Error("MercadoPago SDK no disponible")
        }
        const cardForm = mercadoPagoInstance.cardForm({
          amount: "0.00",
          form: {
            id: cardFieldIds.form,
            cardholderName: {
              id: cardFieldIds.cardholderName,
              placeholder: "Nombre del titular",
            },
            cardholderEmail: {
              id: cardFieldIds.cardholderEmail,
              placeholder: "correo@ejemplo.com",
            },
            cardNumber: {
              id: cardFieldIds.cardNumber,
              placeholder: "Numero de tarjeta",
            },
            cardExpirationDate: {
              id: cardFieldIds.cardExpirationDate,
              placeholder: "MM/AA",
            },
            securityCode: {
              id: cardFieldIds.securityCode,
              placeholder: "CVV",
            },
            identificationType: {
              id: cardFieldIds.identificationType,
            },
            identificationNumber: {
              id: cardFieldIds.identificationNumber,
              placeholder: "Documento",
            },
            issuer: {
              id: cardFieldIds.issuer,
            },
            installments: {
              id: cardFieldIds.installments,
            },
          },
          callbacks: {
            onFormMounted: (error: unknown) => {
              if (!active) return
              if (error) {
                console.error("[payment-methods] MERCADOPAGO mount error", error)
                toast.error("No pudimos cargar el formulario de tarjeta.")
                mpMountedRef.current = false
                setCardIntegrationStatus("error")
                return
              }
              mpMountedRef.current = true
              setCardIntegrationStatus("ready")
            },
            onSubmit: (event: Event) => {
              event.preventDefault()
              const cardData = cardForm.getCardFormData()
              handleCardTokenSubmit(cardData)
            },
          },
        })
        if (!active) {
          cardForm.unmount?.()
          cardForm.destroy?.()
          return
        }
        cardFormRef.current = cardForm
      } catch (error) {
        console.error("[payment-methods] MERCADOPAGO init", error)
        if (active) {
          toast.error("No pudimos inicializar el formulario de tarjeta.")
          mpMountedRef.current = false
          setCardIntegrationStatus("error")
        }
      }
    }

    void setupCardForm()

    return () => {
      active = false
      destroyCardForm()
    }
  }, [enableCardForm, manualMode, cardFieldIds, destroyCardForm, handleCardTokenSubmit])

  useEffect(() => {
    if (manualOnly) {
      setManualMode(true)
    }
  }, [manualOnly])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (enableCardForm && !manualMode) {
      if (!cardFormRef.current) {
        toast.error("El formulario de tarjeta no esta listo.")
        return
      }
      setSaving(true)
      try {
        cardFormRef.current.submit()
      } catch (error) {
        console.error("[payment-methods] card submit", error)
        toast.error("No se pudo validar la tarjeta.")
        setSaving(false)
      }
      return
    }

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
    <form id={cardFieldIds.form} className="space-y-4" onSubmit={handleSubmit}>
      {enableCardForm ? (
        <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ingresa tu tarjeta</p>
            <p className="text-xs text-muted-foreground">
              Utilizamos el iframe seguro de Mercado Pago para tokenizar la informacion. Nunca almacenamos el numero completo
              ni el CVV.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={cardFieldIds.cardholderName}>Nombre del titular</Label>
              <Input id={cardFieldIds.cardholderName} placeholder="Nombre y apellidos" autoComplete="cc-name" />
            </div>
            <div>
              <Label htmlFor={cardFieldIds.cardholderEmail}>Correo del titular</Label>
              <Input id={cardFieldIds.cardholderEmail} type="email" placeholder="correo@ejemplo.com" autoComplete="email" />
            </div>
          </div>

          <div>
            <Label htmlFor={cardFieldIds.cardNumber}>Numero de tarjeta</Label>
            <Input
              id={cardFieldIds.cardNumber}
              placeholder="0000 0000 0000 0000"
              autoComplete="cc-number"
              inputMode="numeric"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor={cardFieldIds.cardExpirationDate}>Vencimiento (MM/AA)</Label>
              <Input
                id={cardFieldIds.cardExpirationDate}
                placeholder="MM/AA"
                autoComplete="cc-exp"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor={cardFieldIds.securityCode}>CVV</Label>
              <Input
                id={cardFieldIds.securityCode}
                placeholder="123"
                autoComplete="cc-csc"
                inputMode="numeric"
                maxLength={4}
              />
            </div>
            <div>
              <Label>Cuotas</Label>
              <select
                id={cardFieldIds.installments}
                className="h-11 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Documento</Label>
              <Select disabled>
                <SelectTrigger className="disabled:opacity-100">
                  <SelectValue placeholder="Se completara automaticamente" />
                </SelectTrigger>
              </Select>
              <select id={cardFieldIds.identificationType} className="hidden" />
            </div>
            <div>
              <Label>Numero de documento</Label>
              <Input id={cardFieldIds.identificationNumber} placeholder="Documento de identidad" />
            </div>
          </div>

          <select id={cardFieldIds.issuer} className="hidden" />

          {cardIntegrationStatus === "loading" ? (
            <p className="text-xs text-muted-foreground">Cargando formulario seguro...</p>
          ) : cardIntegrationStatus === "error" ? (
            <p className="text-xs text-rose-500">
              No pudimos cargar el formulario de tarjeta. Intenta de nuevo o usa la opcion de sincronizacion manual.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-700">
          Configura la variable NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY para habilitar el formulario seguro de tarjetas.
        </div>
      )}

      {manualSectionEnabled ? (
      <div className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Sincronizar tarjeta existente</p>
            <p className="text-xs text-muted-foreground">
              Opcion avanzada para admins que ya generaron la tarjeta o token desde la consola del PSP.
            </p>
          </div>
          {allowManualSync && !manualOnly ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setManualMode((prev) => !prev)}>
              {manualMode ? "Ocultar" : "Mostrar"}
            </Button>
          ) : null}
        </div>
        {manualOnly ? (
          <p className="mt-2 text-xs text-amber-500">
            Aun no configuramos el formulario seguro, por lo que esta es la unica forma disponible para registrar metodos.
          </p>
        ) : null}
        {manualMode ? (
          <div className="mt-4 space-y-4">
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
                Si conectaste la tarjeta desde la consola del PSP, ingresa aqui el identificador del cliente.
              </p>
            </div>
          </div>
        ) : null}
      </div>
      ) : null}
      <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">Usar como predeterminado</p>
          <p className="text-xs text-slate-500">
            Este metodo se utilizara para los cobros automaticos y reintentos de dunning.
          </p>
        </div>
        <Switch checked={form.isDefault} onCheckedChange={(value) => setForm((prev) => ({ ...prev, isDefault: value }))} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : isEditing ? "Actualizar metodo" : "Guardar metodo"}
        </Button>
      </div>
    </form>
  )
}
