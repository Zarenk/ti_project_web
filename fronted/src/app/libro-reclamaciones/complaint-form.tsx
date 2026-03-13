"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { complaintSchema, type ComplaintFormData } from "./complaint-schema"
import type { CompanyComplaintInfo, ComplaintSubmitResult } from "./complaint-api"
import { submitComplaint } from "./complaint-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  slug: string
  company: CompanyComplaintInfo
  onSuccess: (result: ComplaintSubmitResult) => void
}

export function ComplaintForm({ slug, company, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      consumerDocType: "DNI",
      goodType: "PRODUCTO",
      complaintType: "RECLAMO",
      amountCurrency: "PEN",
      isMinor: false,
      signatureConfirmed: false as unknown as true,
    },
  })

  const isMinor = watch("isMinor")
  const complaintType = watch("complaintType")

  const onSubmit = async (data: ComplaintFormData) => {
    setSubmitting(true)
    try {
      const result = await submitComplaint(slug, data)
      onSuccess(result)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al enviar el reclamo"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Header: Datos del proveedor */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="mb-2 font-semibold">Datos del Proveedor</h3>
        <p className="text-sm"><strong>Razón social:</strong> {company.name}</p>
        <p className="text-sm"><strong>RUC:</strong> {company.ruc}</p>
        <p className="text-sm"><strong>Dirección:</strong> {company.address}</p>
      </div>

      {/* Sección 1: Identificación del consumidor */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">
          1. Identificación del Consumidor Reclamante
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="consumerName">Nombre completo *</Label>
            <Input id="consumerName" {...register("consumerName")} />
            {errors.consumerName && (
              <p className="text-xs text-destructive">{errors.consumerName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="consumerEmail">Email *</Label>
            <Input id="consumerEmail" type="email" {...register("consumerEmail")} />
            {errors.consumerEmail && (
              <p className="text-xs text-destructive">{errors.consumerEmail.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Tipo de documento *</Label>
            <Select
              defaultValue="DNI"
              onValueChange={(v) =>
                setValue("consumerDocType", v as "DNI" | "CE")
              }
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DNI" className="cursor-pointer">DNI</SelectItem>
                <SelectItem value="CE" className="cursor-pointer">Carné de Extranjería</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="consumerDocNumber">Nº de documento *</Label>
            <Input id="consumerDocNumber" {...register("consumerDocNumber")} />
            {errors.consumerDocNumber && (
              <p className="text-xs text-destructive">
                {errors.consumerDocNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="consumerPhone">Teléfono</Label>
            <Input id="consumerPhone" {...register("consumerPhone")} />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="consumerAddress">Domicilio</Label>
          <Input id="consumerAddress" {...register("consumerAddress")} />
        </div>

        {/* Menor de edad */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="isMinor"
            checked={isMinor}
            onCheckedChange={(c) => setValue("isMinor", !!c)}
            className="cursor-pointer"
          />
          <Label htmlFor="isMinor" className="cursor-pointer">
            El reclamante es menor de edad
          </Label>
        </div>

        {isMinor && (
          <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="parentName">Nombre del padre/madre *</Label>
              <Input id="parentName" {...register("parentName")} />
              {errors.parentName && (
                <p className="text-xs text-destructive">
                  {errors.parentName.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Tipo doc. padre/madre *</Label>
              <Select
                onValueChange={(v) =>
                  setValue("parentDocType", v as "DNI" | "CE")
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI" className="cursor-pointer">DNI</SelectItem>
                  <SelectItem value="CE" className="cursor-pointer">CE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="parentDocNumber">Nº doc. padre/madre *</Label>
              <Input id="parentDocNumber" {...register("parentDocNumber")} />
            </div>
          </div>
        )}
      </fieldset>

      {/* Sección 2: Bien contratado */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">
          2. Identificación del Bien Contratado
        </legend>

        <div className="space-y-2">
          <Label>Tipo *</Label>
          <RadioGroup
            defaultValue="PRODUCTO"
            onValueChange={(v) =>
              setValue("goodType", v as "PRODUCTO" | "SERVICIO")
            }
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="PRODUCTO" id="gt-prod" className="cursor-pointer" />
              <Label htmlFor="gt-prod" className="cursor-pointer">Producto</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="SERVICIO" id="gt-serv" className="cursor-pointer" />
              <Label htmlFor="gt-serv" className="cursor-pointer">Servicio</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="claimedAmount">Monto reclamado</Label>
            <Input
              id="claimedAmount"
              type="number"
              step="0.01"
              {...register("claimedAmount")}
            />
          </div>
          <div className="space-y-1">
            <Label>Moneda</Label>
            <Select
              defaultValue="PEN"
              onValueChange={(v) =>
                setValue("amountCurrency", v as "PEN" | "USD")
              }
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PEN" className="cursor-pointer">Soles (PEN)</SelectItem>
                <SelectItem value="USD" className="cursor-pointer">Dólares (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="goodDescription">Descripción del bien *</Label>
          <Textarea id="goodDescription" rows={2} {...register("goodDescription")} />
          {errors.goodDescription && (
            <p className="text-xs text-destructive">
              {errors.goodDescription.message}
            </p>
          )}
        </div>
      </fieldset>

      {/* Sección 3: Detalle */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">
          3. Detalle de la Reclamación y Pedido del Consumidor
        </legend>

        <div className="space-y-2">
          <Label>Tipo de reclamo *</Label>
          <RadioGroup
            defaultValue="RECLAMO"
            onValueChange={(v) =>
              setValue("complaintType", v as "RECLAMO" | "QUEJA")
            }
            className="flex flex-col gap-3 sm:flex-row sm:gap-8"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="RECLAMO" id="ct-rec" className="mt-1 cursor-pointer" />
              <div>
                <Label htmlFor="ct-rec" className="cursor-pointer font-medium">
                  Reclamo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Disconformidad relacionada a los productos o servicios.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="QUEJA" id="ct-que" className="mt-1 cursor-pointer" />
              <div>
                <Label htmlFor="ct-que" className="cursor-pointer font-medium">
                  Queja
                </Label>
                <p className="text-xs text-muted-foreground">
                  Disconformidad no relacionada a los productos o servicios; o
                  malestar respecto a la atención al público.
                </p>
              </div>
            </div>
          </RadioGroup>
          {errors.complaintType && (
            <p className="text-xs text-destructive">
              {errors.complaintType.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="detail">Detalle del {complaintType === "QUEJA" ? "queja" : "reclamo"} *</Label>
          <Textarea
            id="detail"
            rows={5}
            placeholder="Describa detalladamente su reclamo o queja..."
            {...register("detail")}
          />
          {errors.detail && (
            <p className="text-xs text-destructive">{errors.detail.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="consumerRequest">Pedido concreto *</Label>
          <Textarea
            id="consumerRequest"
            rows={3}
            placeholder="Indique qué solución espera del proveedor..."
            {...register("consumerRequest")}
          />
          {errors.consumerRequest && (
            <p className="text-xs text-destructive">
              {errors.consumerRequest.message}
            </p>
          )}
        </div>
      </fieldset>

      {/* Firma virtual */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Checkbox
            id="signatureConfirmed"
            onCheckedChange={(c) =>
              setValue("signatureConfirmed", c === true ? true : (false as unknown as true))
            }
            className="mt-1 cursor-pointer"
          />
          <Label htmlFor="signatureConfirmed" className="cursor-pointer text-sm">
            Declaro que la información proporcionada es veraz y confirmo el
            envío de esta hoja de reclamación.
          </Label>
        </div>
        {errors.signatureConfirmed && (
          <p className="text-xs text-destructive">
            {errors.signatureConfirmed.message}
          </p>
        )}
      </div>

      {/* Notas legales */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          * La formulación del reclamo no impide acudir a otras vías de solución
          de controversias ni es requisito previo para interponer una denuncia
          ante el INDECOPI.
        </p>
        <p>
          * El proveedor debe dar respuesta al reclamo o queja en un plazo no
          mayor a quince (15) días hábiles, el cual es improrrogable.
        </p>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full cursor-pointer sm:w-auto"
        size="lg"
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar Reclamación
      </Button>
    </form>
  )
}
