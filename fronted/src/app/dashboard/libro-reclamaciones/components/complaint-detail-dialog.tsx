"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Send, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { ComplaintItem } from "../libro-reclamaciones.api"
import { respondComplaint, reclassifyComplaint } from "../libro-reclamaciones.api"
import { ComplaintDeadlineBadge } from "./complaint-deadline-badge"

interface Props {
  complaint: ComplaintItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function ComplaintDetailDialog({
  complaint,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const [responseText, setResponseText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!complaint) return null

  const handleRespond = async () => {
    if (!responseText.trim()) {
      toast.error("Ingrese una respuesta")
      return
    }
    setSubmitting(true)
    try {
      await respondComplaint(complaint.id, responseText.trim())
      toast.success("Respuesta enviada correctamente")
      setResponseText("")
      onUpdated()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al responder"
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleReclassify = async () => {
    setSubmitting(true)
    try {
      await reclassifyComplaint(complaint.id)
      toast.success("Reclasificado a Reclamo")
      onUpdated()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al reclasificar"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Nº {complaint.correlativeNumber}</span>
            <Badge variant={complaint.complaintType === "RECLAMO" ? "default" : "secondary"}>
              {complaint.complaintType}
              {complaint.reclassified && " (reclasificado)"}
            </Badge>
            <ComplaintDeadlineBadge
              remainingDays={complaint.remainingBusinessDays}
              status={complaint.status}
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Datos del consumidor */}
          <div>
            <h4 className="font-semibold mb-2">1. Consumidor Reclamante</h4>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Nombre:</span> {complaint.consumerName}</div>
              <div><span className="text-muted-foreground">Doc:</span> {complaint.consumerDocType} {complaint.consumerDocNumber}</div>
              <div><span className="text-muted-foreground">Email:</span> {complaint.consumerEmail}</div>
              <div><span className="text-muted-foreground">Teléfono:</span> {complaint.consumerPhone || "-"}</div>
              {complaint.consumerAddress && (
                <div className="col-span-2"><span className="text-muted-foreground">Dirección:</span> {complaint.consumerAddress}</div>
              )}
              {complaint.isMinor && complaint.parentName && (
                <div className="col-span-2"><span className="text-muted-foreground">Padre/Madre:</span> {complaint.parentName}</div>
              )}
            </div>
          </div>

          <Separator />

          {/* Bien contratado */}
          <div>
            <h4 className="font-semibold mb-2">2. Bien Contratado</h4>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Tipo:</span> {complaint.goodType}</div>
              <div><span className="text-muted-foreground">Monto:</span> {complaint.claimedAmount ? `${complaint.amountCurrency} ${complaint.claimedAmount}` : "-"}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Descripción:</span> {complaint.goodDescription}</div>
            </div>
          </div>

          <Separator />

          {/* Detalle */}
          <div>
            <h4 className="font-semibold mb-2">3. Detalle</h4>
            <p className="whitespace-pre-wrap rounded bg-muted/50 p-3">{complaint.detail}</p>
            <p className="mt-2"><span className="text-muted-foreground">Pedido:</span> {complaint.consumerRequest}</p>
          </div>

          <Separator />

          {/* Info adicional */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>Código seguimiento: <span className="font-mono">{complaint.trackingCode}</span></div>
            <div>Registrado: {new Date(complaint.createdAt).toLocaleDateString("es-PE")}</div>
            <div>Límite: {new Date(complaint.deadlineDate).toLocaleDateString("es-PE")}</div>
            <div>Proveedor: {complaint.providerLegalName} (RUC: {complaint.providerRuc})</div>
          </div>

          <Separator />

          {/* Sección 4: Respuesta */}
          <div>
            <h4 className="font-semibold mb-2">4. Observaciones y Acciones del Proveedor</h4>

            {complaint.responseText ? (
              <div className="rounded-md border-l-4 border-primary bg-muted/50 p-4">
                <p className="whitespace-pre-wrap">{complaint.responseText}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Respondido el{" "}
                  {complaint.responseDate
                    ? new Date(complaint.responseDate).toLocaleDateString("es-PE")
                    : "-"}{" "}
                  {complaint.respondedBy && `por ${complaint.respondedBy.username}`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="responseText">Respuesta al consumidor *</Label>
                  <Textarea
                    id="responseText"
                    rows={5}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Ingrese las observaciones y acciones adoptadas..."
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {responseText.length}/2000 caracteres
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleRespond}
                    disabled={submitting || !responseText.trim()}
                    className="cursor-pointer"
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Enviar Respuesta
                  </Button>

                  {complaint.complaintType === "QUEJA" && !complaint.reclassified && (
                    <Button
                      variant="outline"
                      onClick={handleReclassify}
                      disabled={submitting}
                      className="cursor-pointer"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reclasificar a Reclamo
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
