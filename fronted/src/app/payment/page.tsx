"use client"

import React, { useState, useEffect, useMemo } from "react"
import { CreditCard, Building2, Smartphone, Check, ShoppingCart, Loader2 } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import TemplateNavbar from "@/templates/TemplateNavbar"
import { useActiveTemplate } from "@/templates/use-active-template"
import { useTemplateComponents } from "@/templates/use-store-template"
import CheckoutSteps from "@/components/checkout-steps"
import { regions } from "@/lib/region"

import { sanitizeInput, useDebouncedCallback } from "./payment-utils"
import { useCheckout } from "./use-checkout"
import { PaymentSkeleton } from "./PaymentSkeleton"

// ── Small inline components ──

function ProcessingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="mb-4"
      >
        <Loader2 className="h-12 w-12 text-blue-600" />
      </motion.div>
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-xl font-semibold text-blue-800"
      >
        PROCESANDO TU COMPRA...
      </motion.p>
    </div>
  )
}

type DebouncedInputProps = React.ComponentProps<typeof Input> & {
  id: string
  onDebouncedChange: (value: string) => void
}

function DebouncedInput({ id, onDebouncedChange, value, ...props }: DebouncedInputProps) {
  const [localValue, setLocalValue] = useState(String(value ?? ""))

  useEffect(() => {
    setLocalValue(String(value ?? ""))
  }, [value])

  const debouncedChange = useDebouncedCallback(onDebouncedChange, 200)

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = sanitizeInput(id, e.target.value)
    setLocalValue(val)
    debouncedChange(val)
  }

  return <Input {...props} id={id} value={localValue} onChange={handleInput} />
}

// ── Helper to render a labeled debounced field ──

function Field({
  id, label, error, value, onChange, ...rest
}: {
  id: string; label: string; error?: string; value: string;
  onChange: (id: string, val: string) => void
} & Omit<React.ComponentProps<typeof Input>, "onChange" | "value">) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <DebouncedInput
        id={id}
        value={value}
        onDebouncedChange={(val) => onChange(id, val)}
        className="border-gray-300 dark:border-gray-600 focus:border-blue-500"
        {...rest}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}

// ── Step header shared style ──

function StepHeader({ num, title, desc, gradient = "from-blue-600 to-cyan-600" }: {
  num: number; title: string; desc: string; gradient?: string
}) {
  return (
    <CardHeader className={`bg-gradient-to-r ${gradient} text-white rounded-t-lg p-4`}>
      <CardTitle className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold">{num}</span>
        </div>
        {title}
      </CardTitle>
      <CardDescription className="text-blue-100 dark:text-blue-200">{desc}</CardDescription>
    </CardHeader>
  )
}

// ── Main page ──

export default function PaymentPage() {
  const templateId = useActiveTemplate()
  const { PaymentLayout } = useTemplateComponents(templateId)
  const c = useCheckout()

  const orderItemElements = useMemo(
    () =>
      c.orderItems.map((item) => (
        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Image src={item.image || "/placeholder.svg"} alt={item.name} width={60} height={60} className="rounded-md object-cover" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{item.name}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cantidad: {item.quantity}</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-900 dark:text-gray-100">S/.{(item.price * item.quantity).toFixed(2)}</p>
          </div>
        </div>
      )),
    [c.orderItems],
  )

  if (templateId !== "classic") {
    return (
      <>
        <TemplateNavbar />
        <PaymentLayout />
      </>
    )
  }

  return (
    <div
      aria-busy={c.isProcessing}
      className={`min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-950 ${c.isProcessing ? "pointer-events-none" : ""}`}
    >
      {c.isProcessing && <ProcessingOverlay />}
      <TemplateNavbar />
      <div className="container mx-auto px-4 py-8">
        <CheckoutSteps step={c.checkoutStep} />
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Completa Tu Compra</h1>
          <p className="text-gray-600 dark:text-gray-300">Proceso de compra seguro para tus necesidades tecnológicas</p>
        </div>

        {c.isPageLoading ? (
          <PaymentSkeleton />
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Billing */}
              <Card className="border-blue-200 dark:border-blue-700 shadow-sm p-0">
                <StepHeader num={1} title="Detalles de facturación" desc="Ingrese sus datos de facturación para la emisión de la factura" />
                <CardContent className="p-6 space-y-4" onFocusCapture={() => c.setCheckoutStep(2)}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field id="firstName" label="Nombres Completos *" value={c.formData.firstName} error={c.errors.firstName} onChange={c.handleChange} placeholder="John" />
                    <Field id="lastName" label="Apellidos *" value={c.formData.lastName} error={c.errors.lastName} onChange={c.handleChange} placeholder="Doe" />
                  </div>
                  <Field id="email" label="Email *" type="email" value={c.formData.email} error={c.errors.email} onChange={c.handleChange} placeholder="john.doe@example.com" />
                  <Field id="personalDni" label="DNI *" value={c.formData.personalDni} error={c.errors.personalDni} onChange={c.handleChange} placeholder="12345678" />
                  <Field id="phone" label="Telefono *" value={c.formData.phone} error={c.errors.phone} onChange={c.handleChange} placeholder="+51 999 999 999" />
                  <Field id="address" label="Direccion de Facturacion *" value={c.formData.address} error={c.errors.address} onChange={c.handleChange} placeholder="123 Main Street" />
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state">Región *</Label>
                      <Select value={c.formData.state} onValueChange={(v) => c.setFormData((p) => ({ ...p, state: v, city: "" }))}>
                        <SelectTrigger className="w-full border-gray-300 dark:border-gray-600 focus:border-blue-500 cursor-pointer">
                          <SelectValue placeholder="Seleccione una región" />
                        </SelectTrigger>
                        <SelectContent>
                          {regions.map((r) => (
                            <SelectItem key={r.name} value={r.name} className="cursor-pointer">{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {c.errors.state && <p className="text-red-500 text-sm">{c.errors.state}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ciudad *</Label>
                      <Select value={c.formData.city} onValueChange={(v) => c.setFormData((p) => ({ ...p, city: v }))} disabled={!c.formData.state}>
                        <SelectTrigger className="w-full border-gray-300 dark:border-gray-600 focus:border-blue-500 cursor-pointer">
                          <SelectValue placeholder="Seleccione una ciudad" />
                        </SelectTrigger>
                        <SelectContent>
                          {regions.find((r: any) => r.name === c.formData.state)?.cities.map((city: any) => (
                            <SelectItem key={city} value={city} className="cursor-pointer">{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {c.errors.city && <p className="text-red-500 text-sm">{c.errors.city}</p>}
                    </div>
                    <Field id="postalCode" label="Codigo Postal" value={c.formData.postalCode} error={c.errors.postalCode} onChange={c.handleChange} placeholder="20001" />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Invoice type */}
              <Card className="border-blue-200 dark:border-blue-700 shadow-sm p-0">
                <StepHeader num={2} title="Facturacion" desc="Seleccione el tipo de comprobante" />
                <CardContent className="p-6 space-y-4" onFocusCapture={() => c.setCheckoutStep(2)}>
                  <RadioGroup
                    value={c.formData.invoiceType}
                    onValueChange={(v) => c.setFormData((p) => ({ ...p, invoiceType: v }))}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BOLETA" id="boleta" />
                      <Label htmlFor="boleta" className="cursor-pointer">Boleta</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FACTURA" id="factura" />
                      <Label htmlFor="factura" className="cursor-pointer">Factura</Label>
                    </div>
                  </RadioGroup>

                  {c.formData.invoiceType === "BOLETA" && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field id="dni" label="Numero de Documento (DNI) *" value={c.formData.dni} error={c.errors.dni} onChange={c.handleChange} placeholder="12345678" />
                      <Field id="invoiceName" label="Nombre Completo *" value={c.formData.invoiceName} error={c.errors.invoiceName} onChange={c.handleChange} placeholder="John Doe" />
                    </div>
                  )}

                  {c.formData.invoiceType === "FACTURA" && (
                    <div className="space-y-4">
                      <Field id="ruc" label="RUC *" value={c.formData.ruc} error={c.errors.ruc} onChange={c.handleChange} placeholder="20123456789" />
                      <Field id="razonSocial" label="Razon Social *" value={c.formData.razonSocial} error={c.errors.razonSocial} onChange={c.handleChange} placeholder="Empresa SAC" />
                      <Field id="invoiceAddress" label="Direccion *" value={c.formData.invoiceAddress} error={c.errors.invoiceAddress} onChange={c.handleChange} placeholder="Av. Principal 123" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 3. Shipping */}
              <Card className="border-blue-200 dark:border-blue-700 shadow-sm p-0">
                <StepHeader num={3} title="Informacion de Envio" desc="A donde debemos enviar tu orden?" gradient="from-cyan-600 to-blue-600" />
                <CardContent className="p-6 space-y-4" onFocusCapture={() => c.setCheckoutStep(2)}>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="sameAsShipping" checked={c.sameAsShipping} onCheckedChange={c.handleSameAsShippingChange} className="border-blue-500 data-[state=checked]:bg-blue-600 cursor-pointer" />
                    <Label htmlFor="sameAsShipping" className="text-sm font-medium cursor-pointer">La misma que la direccion de facturacion</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pickupInStore" checked={c.pickupInStore} onCheckedChange={c.handlePickupInStoreChange} className="border-blue-500 data-[state=checked]:bg-blue-600 cursor-pointer" />
                    <Label htmlFor="pickupInStore" className="text-sm font-medium cursor-pointer">Recojo en tienda</Label>
                  </div>

                  {!c.sameAsShipping && !c.pickupInStore && (
                    <div className="space-y-4 pt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field id="shipFirstName" label="Nombres Completos *" value={c.formData.shipFirstName} error={c.errors.shipFirstName} onChange={c.handleChange} placeholder="John" />
                        <Field id="shipLastName" label="Apellidos *" value={c.formData.shipLastName} error={c.errors.shipLastName} onChange={c.handleChange} placeholder="Doe" />
                      </div>
                      <Field id="shipAddress" label="Direccion de Envio *" value={c.formData.shipAddress} error={c.errors.shipAddress} onChange={c.handleChange} placeholder="Avenida 123." />
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field id="shipCity" label="Ciudad *" value={c.formData.shipCity} error={c.errors.shipCity} onChange={c.handleChange} placeholder="Lima" />
                        <Field id="shipPostalCode" label="Codigo postal" value={c.formData.shipPostalCode} error={c.errors.shipPostalCode} onChange={c.handleChange} placeholder="20000" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 4. Payment */}
              <Card className="border-blue-200 dark:border-blue-700 shadow-sm p-0">
                <StepHeader num={4} title="Metodo de Pago" desc="Elija el método de pago que prefiera" />
                <CardContent className="p-6" onFocusCapture={() => c.setCheckoutStep(3)}>
                  <RadioGroup
                    value={c.paymentMethod}
                    onValueChange={(val) => { c.setPaymentMethod(val); c.setCheckoutStep(3) }}
                    className="space-y-4"
                  >
                    {/* Visa */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 transition-colors">
                        <RadioGroupItem value="visa" id="visa" className="border-blue-500 text-blue-600 dark:text-blue-400" />
                        <Label htmlFor="visa" className="flex items-center gap-3 cursor-pointer flex-1">
                          <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <div className="font-medium">Tarjeta de Credito/Debito</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Aceptamos Visa, Mastercard</div>
                          </div>
                        </Label>
                        <Image src="/placeholder.svg?height=24&width=40" alt="Visa" width={40} height={24} className="opacity-70" />
                      </div>
                      {c.paymentMethod === "visa" && (
                        <div className="ml-8 space-y-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                          <Field id="cardNumber" label="Numero de Tarjeta *" value={c.formData.cardNumber} error={c.errors.cardNumber} onChange={c.handleChange} placeholder="1234 5678 9012 3456" />
                          <div className="grid grid-cols-2 gap-4">
                            <Field id="expiry" label="Fecha de Expiracion *" value={c.formData.expiry} error={c.errors.expiry} onChange={c.handleChange} placeholder="MM/YY" />
                            <Field id="cvv" label="CVV *" value={c.formData.cvv} error={c.errors.cvv} onChange={c.handleChange} placeholder="123" />
                          </div>
                          <Field id="cardName" label="Nombre de la Tarjeta *" value={c.formData.cardName} error={c.errors.cardName} onChange={c.handleChange} placeholder="John Doe" />
                        </div>
                      )}
                    </div>

                    {/* Transfer */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 transition-colors">
                        <RadioGroupItem value="transfer" id="transfer" className="border-blue-500 text-blue-600 dark:text-blue-400" />
                        <Label htmlFor="transfer" className="flex items-center gap-3 cursor-pointer flex-1">
                          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <div className="font-medium">Transferencia bancaria</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Transferencia directa al banco</div>
                          </div>
                        </Label>
                      </div>
                      {c.paymentMethod === "transfer" && (
                        <div className="ml-8 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="space-y-3">
                            <h4 className="font-medium text-blue-900 dark:text-blue-300">Instrucciones para transferencia bancaria</h4>
                            <div className="text-sm space-y-1">
                              <p><strong>Banco:</strong> Banco de Crédito del Perú (BCP)</p>
                              <p><strong>Numero de Cuenta:</strong> 540-1639272047</p>
                              <p><strong>Numero de Cuenta(CCI):</strong> 002-540-00163927204736</p>
                              <p><strong>Titular de la Cuenta:</strong> TECNOLOGIA INFORMATICA E.I.R.L.</p>
                              <p><strong>Referencia:</strong> Orden #{c.orderReference}</p>
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-100 bg-blue-100 dark:bg-blue-900 p-2 rounded">
                              Por favor, incluya el número de operación en la descripción de su transferencia
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* YAPE */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 transition-colors">
                        <RadioGroupItem value="yape" id="yape" className="border-blue-500 text-blue-600 dark:text-blue-400" />
                        <Label htmlFor="yape" className="flex items-center gap-3 cursor-pointer flex-1">
                          <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <div className="font-medium">YAPE</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Pago Movil</div>
                          </div>
                        </Label>
                        <div className="text-purple-600 dark:text-purple-400 font-bold text-lg">YAPE</div>
                      </div>
                      {c.paymentMethod === "yape" && (
                        <div className="ml-8 p-4 bg-purple-50 dark:bg-purple-900 rounded-lg border border-purple-200 dark:border-purple-700">
                          <div className="space-y-3">
                            <h4 className="font-medium text-purple-900 dark:text-purple-300">Instrucciones para pagar con YAPE</h4>
                            <div className="text-sm space-y-1">
                              <p><strong>Numero de Celular:</strong> +51 969 337 457</p>
                              <p><strong>Nombre:</strong> TECNOLOGIA INFORMATICA E.I.R.L.</p>
                              <p><strong>Monto:</strong> S/. {c.total.toFixed(2)}</p>
                            </div>
                            <div className="text-xs text-purple-700 dark:text-purple-100 bg-purple-100 dark:bg-purple-900 p-2 rounded">
                              Envíe una captura de pantalla de la confirmación de pago para finalizar su pedido
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="border-blue-200 dark:border-blue-700 shadow-lg sticky top-8 p-0">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg p-4">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Resumen del pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">{orderItemElements}</div>
                  <Separator className="my-6" />
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                      <span className="font-medium">S/.{c.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Envio</span>
                      <span className="font-medium">S/.{c.shipping.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-blue-600 dark:text-blue-400">S/.{c.total.toFixed(2)}</span>
                      <span className="text-blue-600">S/.{c.total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    onClick={c.handlePurchase}
                    disabled={c.isProcessing}
                    className="w-full mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 text-lg shadow-lg cursor-pointer"
                  >
                    {c.isProcessing ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Procesando...
                      </div>
                    ) : (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Completa tu compra
                      </>
                    )}
                  </Button>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Su información de pago es segura y está encriptada</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
