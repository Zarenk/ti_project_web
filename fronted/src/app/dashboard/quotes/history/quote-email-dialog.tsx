"use client"

import { useState } from "react"
import { Loader2, Mail, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface QuoteEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyEmail: string
  companyName: string
  quoteNumber: string
  quoteId: number
  clientName?: string | null
  onSend: (params: {
    to: string
    subject: string
    message: string
    fromName: string
    quoteId: number
  }) => Promise<void>
  isSending: boolean
}

export function QuoteEmailDialog({
  open,
  onOpenChange,
  companyEmail,
  companyName,
  quoteNumber,
  quoteId,
  clientName,
  onSend,
  isSending,
}: QuoteEmailDialogProps) {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setTo("")
      setSubject(`Cotización ${quoteNumber} - ${companyName}`)
      setMessage(
        `Estimado/a${clientName ? ` ${clientName}` : ""},\n\nAdjuntamos la cotización ${quoteNumber} para su revisión.\n\nQuedamos atentos a cualquier consulta.\n\nSaludos cordiales,\n${companyName}`,
      )
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    const trimmedTo = to.trim()
    if (!trimmedTo) {
      toast.error("Ingresa el email del destinatario.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedTo)) {
      toast.error("El email del destinatario no es válido.")
      return
    }
    if (!subject.trim()) {
      toast.error("El asunto no puede estar vacío.")
      return
    }

    await onSend({
      to: trimmedTo,
      subject: subject.trim(),
      message,
      fromName: companyName,
      quoteId,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary flex-shrink-0" />
            Enviar cotización por email
          </DialogTitle>
          <DialogDescription>
            Se enviará la cotización {quoteNumber} como archivo PDF adjunto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 w-full min-w-0">
          <div className="space-y-1.5">
            <Label htmlFor="email-from" className="text-xs font-medium text-muted-foreground">
              De
            </Label>
            <Input
              id="email-from"
              value={companyEmail || "Sin email configurado"}
              readOnly
              className="bg-muted/50 text-muted-foreground cursor-default"
              tabIndex={-1}
            />
            {!companyEmail && (
              <p className="text-xs text-destructive">
                Configura el email de la empresa en Ajustes &gt; Empresa &gt; Editar.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-to">Para</Label>
            <Input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="cliente@ejemplo.com"
              autoFocus
              disabled={isSending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Asunto</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo"
              disabled={isSending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-message">Mensaje</Label>
            <Textarea
              id="email-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none text-sm"
              placeholder="Escribe un mensaje..."
              disabled={isSending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSending || !companyEmail}
            className="cursor-pointer gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
