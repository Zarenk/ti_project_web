"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createPaymentOrder, type PaymentProvider, type PaymentOrder } from "../payments.api"

const paymentLinkSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  currency: z.enum(["PEN", "USD"]).default("PEN"),
  provider: z.enum(["culqi", "mercadopago", "manual"]),
  clientName: z.string().optional(),
  clientEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  description: z.string().optional(),
})

type PaymentLinkFormData = z.infer<typeof paymentLinkSchema>

interface PaymentLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (order: PaymentOrder) => void
  defaultOrderId?: number
}

export function PaymentLinkDialog({
  open,
  onOpenChange,
  onCreated,
  defaultOrderId,
}: PaymentLinkDialogProps) {
  const [createdOrder, setCreatedOrder] = useState<PaymentOrder | null>(null)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentLinkFormData>({
    resolver: zodResolver(paymentLinkSchema),
    defaultValues: {
      currency: "PEN",
      provider: "mercadopago",
    },
  })

  const provider = watch("provider")

  const onSubmit = async (data: PaymentLinkFormData) => {
    try {
      setSubmitting(true)
      const order = await createPaymentOrder({
        ...data,
        orderId: defaultOrderId,
        clientEmail: data.clientEmail || undefined,
      })
      setCreatedOrder(order)
      onCreated?.(order)
      toast.success("Orden de pago creada exitosamente")
    } catch (err: any) {
      toast.error(err.message || "Error al crear la orden de pago")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyLink = async () => {
    if (!createdOrder?.paymentUrl) return
    try {
      await navigator.clipboard.writeText(createdOrder.paymentUrl)
      setCopied(true)
      toast.success("Link copiado al portapapeles")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("No se pudo copiar el link")
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setCreatedOrder(null)
      setCopied(false)
      reset()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createdOrder ? "Link de Pago Generado" : "Crear Link de Pago"}
          </DialogTitle>
          <DialogDescription>
            {createdOrder
              ? "Comparte este link con tu cliente para recibir el pago."
              : "Genera un link de pago para enviarlo a tu cliente."}
          </DialogDescription>
        </DialogHeader>

        {createdOrder ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Código de orden
              </p>
              <p className="font-mono text-lg font-bold">{createdOrder.code}</p>
            </div>

            {createdOrder.paymentUrl ? (
              <div className="space-y-2">
                <Label>Link de pago</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={createdOrder.paymentUrl}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="cursor-pointer flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    asChild
                    className="cursor-pointer flex-shrink-0"
                  >
                    <a
                      href={createdOrder.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pago manual — el cliente debe notificar la transferencia.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Monto:</span>{" "}
                <span className="font-medium">
                  {createdOrder.currency} {Number(createdOrder.amount).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Proveedor:</span>{" "}
                <span className="font-medium capitalize">{createdOrder.provider}</span>
              </div>
            </div>

            <Button
              onClick={() => handleClose(false)}
              className="w-full cursor-pointer"
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("amount")}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={watch("currency")}
                  onValueChange={(v) => setValue("currency", v as "PEN" | "USD")}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN" className="cursor-pointer">PEN (Soles)</SelectItem>
                    <SelectItem value="USD" className="cursor-pointer">USD (Dólares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="provider">Proveedor de pago *</Label>
              <Select
                value={provider}
                onValueChange={(v) => setValue("provider", v as PaymentProvider)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mercadopago" className="cursor-pointer">
                    MercadoPago
                  </SelectItem>
                  <SelectItem value="culqi" className="cursor-pointer">
                    Culqi
                  </SelectItem>
                  <SelectItem value="manual" className="cursor-pointer">
                    Manual (Yape/Plin/Transferencia)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clientName">Nombre del cliente</Label>
              <Input id="clientName" placeholder="Juan Pérez" {...register("clientName")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="cliente@email.com"
                  {...register("clientEmail")}
                />
                {errors.clientEmail && (
                  <p className="text-xs text-destructive">{errors.clientEmail.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientPhone">Teléfono</Label>
                <Input
                  id="clientPhone"
                  placeholder="999888777"
                  {...register("clientPhone")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                placeholder="Pago por pedido #123"
                {...register("description")}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full cursor-pointer"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Link de Pago
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
