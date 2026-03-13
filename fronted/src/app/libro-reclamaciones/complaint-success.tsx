"use client"

import type { ComplaintSubmitResult } from "./complaint-api"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Printer, Search } from "lucide-react"
import Link from "next/link"

interface Props {
  result: ComplaintSubmitResult
  companyName: string
}

export function ComplaintSuccess({ result, companyName }: Props) {
  const createdDate = new Date(result.createdAt).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const deadlineDate = new Date(result.deadlineDate).toLocaleDateString(
    "es-PE",
    { day: "2-digit", month: "2-digit", year: "numeric" }
  )

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
      </div>

      <h2 className="text-2xl font-bold">Reclamo Registrado</h2>
      <p className="text-muted-foreground">
        Su reclamo ha sido registrado exitosamente en el Libro de Reclamaciones
        de <strong>{companyName}</strong>.
      </p>

      <div className="rounded-lg border bg-muted/50 p-6 text-left space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Nº Correlativo:</span>
          <span className="font-mono font-semibold">
            {result.correlativeNumber}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            Código de seguimiento:
          </span>
          <span className="font-mono font-bold text-primary">
            {result.trackingCode}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            Fecha de registro:
          </span>
          <span className="text-sm">{createdDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            Fecha límite de respuesta:
          </span>
          <span className="text-sm font-medium">{deadlineDate}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Se ha enviado una copia de este reclamo a su correo electrónico.
        Guarde su <strong>código de seguimiento</strong> para consultar el
        estado de su reclamo.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="cursor-pointer"
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Link href={`/libro-reclamaciones/consulta?code=${result.trackingCode}`}>
          <Button className="w-full cursor-pointer sm:w-auto">
            <Search className="mr-2 h-4 w-4" />
            Consultar Estado
          </Button>
        </Link>
      </div>
    </div>
  )
}
