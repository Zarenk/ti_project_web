"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarIcon, FileWarning, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createCreditNote, generateAndUploadCreditNotePdf } from "../credit-notes.api";
import type { Sale } from "../columns";

// ── Codigos de motivo SUNAT para Notas de Credito ───────────
const MOTIVO_CODES = [
  { code: "01", label: "Anulación de la operación" },
  { code: "02", label: "Anulación por error en el RUC" },
  { code: "03", label: "Corrección por error en la descripción" },
  { code: "04", label: "Descuento global" },
  { code: "05", label: "Descuento por ítem" },
  { code: "06", label: "Devolución total" },
  { code: "07", label: "Devolución por ítem" },
  { code: "09", label: "Bonificación" },
  { code: "10", label: "Disminución en el valor" },
  { code: "13", label: "Ajustes - Pérdidas" },
] as const;

interface CreditNoteDialogProps {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreditNoteDialog({
  sale,
  open,
  onOpenChange,
  onSuccess,
}: CreditNoteDialogProps) {
  const [codigoMotivo, setCodigoMotivo] = useState("01");
  const [motivo, setMotivo] = useState("Anulación de la operación");
  const [fechaEmision, setFechaEmision] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invoice = sale.invoices;

  // SUNAT: fecha NC >= fecha de emisión del comprobante original
  // SUNAT: el documento debe enviarse dentro de 7 días calendario
  //        desde el día siguiente a la fecha de emisión de la NC.
  //        Como enviamos inmediatamente, máximo backdating = 7 días.
  const invoiceFechaEmision = invoice?.fechaEmision
    ? new Date(invoice.fechaEmision)
    : new Date(sale.createdAt);
  const invoiceDate = new Date(invoiceFechaEmision);
  invoiceDate.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Mínimo: el más reciente entre fecha de emisión del comprobante y hace 7 días
  const minDate = invoiceDate > sevenDaysAgo ? invoiceDate : sevenDaysAgo;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const invoiceLabel =
    invoice?.serie && invoice?.nroCorrelativo
      ? `${invoice.serie}-${invoice.nroCorrelativo}`
      : "Sin comprobante";

  const formatter = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  });

  const handleCodigoChange = (value: string) => {
    setCodigoMotivo(value);
    const found = MOTIVO_CODES.find((m) => m.code === value);
    if (found) {
      setMotivo(found.label);
    }
  };

  const handleSubmit = async () => {
    const trimmed = motivo.trim();
    if (!trimmed) {
      toast.error("Debes ingresar un motivo para la nota de crédito.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCreditNote({
        saleId: sale.id,
        motivo: trimmed,
        codigoMotivo,
        fechaEmision: fechaEmision.toISOString(),
      });

      const statusLabel =
        result.status === "ACCEPTED"
          ? "aceptada por SUNAT"
          : result.status === "REJECTED"
            ? "rechazada por SUNAT"
            : "transmitida a SUNAT";

      toast.success(
        `Nota de crédito ${result.serie}-${result.correlativo} emitida (${statusLabel}).`,
      );

      // Generate and upload PDF in background (non-blocking)
      generateAndUploadCreditNotePdf({ creditNote: result, sale }).catch(
        (pdfErr) => {
          console.error("Error al generar PDF de nota de crédito:", pdfErr);
          toast.error("La nota de crédito fue emitida pero el PDF no se pudo generar.");
        },
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Error al emitir la nota de crédito.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full min-w-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-500 flex-shrink-0" />
            Emitir Nota de Crédito
          </DialogTitle>
          <DialogDescription>
            Esta acción enviará una nota de crédito a SUNAT para anular el comprobante
            original. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Info de la venta original ──────────────────── */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1.5 dark:bg-amber-950/20 dark:border-amber-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Comprobante original
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm pl-6">
              <div>
                <p className="text-xs text-muted-foreground">Documento</p>
                <p className="font-medium break-words">{invoiceLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-medium">{formatter.format(sale.total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-medium break-words">
                  {sale.client?.name ?? "Sin cliente"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-medium">
                  {invoice?.tipoComprobante ?? "—"}
                </p>
              </div>
              {invoice?.fechaEmision && (
                <div>
                  <p className="text-xs text-muted-foreground">Fecha emisión</p>
                  <p className="font-medium">
                    {format(new Date(invoice.fechaEmision), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Selector de motivo SUNAT ───────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="cn-codigo">Código de motivo SUNAT</Label>
            <Select
              value={codigoMotivo}
              onValueChange={handleCodigoChange}
              disabled={isSubmitting}
            >
              <SelectTrigger id="cn-codigo" className="cursor-pointer">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVO_CODES.map((m) => (
                  <SelectItem
                    key={m.code}
                    value={m.code}
                    className="cursor-pointer"
                  >
                    {m.code} — {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Fecha de emisión ─────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Fecha de emisión</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal cursor-pointer"
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  {format(fechaEmision, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaEmision}
                  onSelect={(date) => {
                    if (date) {
                      // Combinar fecha seleccionada con la hora actual
                      const now = new Date();
                      date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                      setFechaEmision(date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => date < minDate || date > today}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Fecha que aparecerá en el comprobante SUNAT. Máximo 7 días atrás (plazo de envío SUNAT) y no anterior a la fecha de emisión del comprobante original.
            </p>
          </div>

          {/* ── Motivo libre ──────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="cn-motivo">Descripción del motivo</Label>
            <Input
              id="cn-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe el motivo de la anulación"
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Este texto aparecerá en la nota de crédito enviada a SUNAT.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !motivo.trim()}
            className="cursor-pointer gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Emitiendo...
              </>
            ) : (
              "Confirmar y enviar a SUNAT"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
