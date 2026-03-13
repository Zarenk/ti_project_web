"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandLogo } from "@/components/BrandLogo";
import { Ban, Banknote, CreditCard, FileText, FileX2, Landmark, Loader2, MessageCircle, Printer, ReceiptText, RefreshCw, Send, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { annulSale, retrySunatTransmission, sendInvoiceWhatsApp, getWhatsAppSendCounts } from "../sales.api";
import { Sale } from "../columns";
import { CreditNoteDialog } from "./credit-note-dialog";
import { useModulePermission } from "@/hooks/use-module-permission";
import { useDeleteActionVisibility } from "@/hooks/use-delete-action-visibility";
import { useAuth } from "@/context/auth-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { getCompanyDetail, type CompanyResponse } from "@/app/dashboard/tenancy/tenancy.api";
import { RestaurantReceiptPdf, type RestaurantReceiptData } from "@/app/dashboard/restaurant-orders/components/RestaurantReceiptPdf";
import { TicketRestaurantReceiptPdf } from "@/app/dashboard/restaurant-orders/components/TicketRestaurantReceiptPdf";
import { pdf } from "@react-pdf/renderer";


const parseNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const getDetailTotal = (detail?: NonNullable<Sale["details"]>[number]): number => {
  if (!detail) {
    return 0;
  }

  const directTotal = detail.total ?? detail.subtotal;
  if (typeof directTotal === "number" && Number.isFinite(directTotal)) {
    return directTotal;
  }

  const quantity = parseNumber(detail.quantity);
  const price = parseNumber(detail.price);
  const computed = quantity * price;

  return Number.isFinite(computed) ? computed : 0;
};

const getPaymentIcon = (method?: string | null) => {
  if (!method) {
    return null;
  }
  const upper = method.toUpperCase();
  if (upper.includes("EFECTIVO")) return <Banknote className="h-4 w-4 text-emerald-500" />;
  if (upper.includes("TRANSFERENCIA")) return <Landmark className="h-4 w-4 text-sky-500" />;
  if (upper.includes("VISA")) return <BrandLogo src="/icons/visa.png" alt="Visa" className="h-4 w-4" />;
  if (upper.includes("YAPE")) return <BrandLogo src="/icons/yape.png" alt="Yape" className="h-4 w-4" />;
  if (upper.includes("PLIN")) return <BrandLogo src="/icons/plin.png" alt="Plin" className="h-4 w-4" />;
  if (upper.includes("TARJETA")) return <CreditCard className="h-4 w-4 text-indigo-500" />;
  if (upper.includes("APP") || upper.includes("BILLETERA")) return <Smartphone className="h-4 w-4 text-purple-500" />;
  return null;
};

export type ViewSaleDetailHandler = (sale: Sale) => void;

export interface SaleDetailDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onRefresh?: (saleId: number) => void;
}

export function SaleDetailDialog({
  sale,
  open,
  onOpenChange,
  loading = false,
  onRefresh,
}: SaleDetailDialogProps) {
  const [creditNoteOpen, setCreditNoteOpen] = useState(false);
  const [isAnnulling, setIsAnnulling] = useState(false);
  const [isRetryingSunat, setIsRetryingSunat] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappPopoverOpen, setWhatsappPopoverOpen] = useState(false);
  const [whatsappSendCount, setWhatsappSendCount] = useState(0);
  const [whatsAppConnected, setWhatsAppConnected] = useState<boolean | null>(null);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [activeCompany, setActiveCompany] = useState<CompanyResponse | null>(null);
  const companyFetched = useRef(false);
  const checkPermission = useModulePermission();
  const whatsappAllowed = checkPermission("whatsapp");
  const canSeeDeleteActions = useDeleteActionVisibility();
  const { role } = useAuth();
  const isEmployee = role?.trim().toUpperCase() === "EMPLOYEE";
  const canEmitCreditNote = canSeeDeleteActions && !isEmployee;
  const { settings } = useSiteSettings();
  const { selection } = useTenantSelection();
  const receiptFormat = settings.company?.receiptFormat ?? "a4";

  // Fetch company detail for receipt generation
  useEffect(() => {
    if (!open || !selection.companyId || companyFetched.current) return;
    companyFetched.current = true;
    getCompanyDetail(selection.companyId)
      .then((data) => setActiveCompany(data))
      .catch(() => {/* non-critical */});
  }, [open, selection.companyId]);

  // Reset company fetch flag when dialog closes
  useEffect(() => {
    if (!open) companyFetched.current = false;
  }, [open]);

  // Check WhatsApp connection status when dialog opens
  useEffect(() => {
    if (!open || !whatsappAllowed) return;
    fetch("/api/whatsapp/status")
      .then((res) => res.json())
      .then((d) => setWhatsAppConnected(d?.isConnected === true))
      .catch(() => setWhatsAppConnected(false));
  }, [open, whatsappAllowed]);

  // Fetch WhatsApp send count when dialog opens with a sale (only if user has whatsapp permission)
  useEffect(() => {
    if (!open || !sale?.id || !whatsappAllowed) {
      setWhatsappSendCount(0);
      return;
    }
    getWhatsAppSendCounts([sale.id]).then((counts) => {
      setWhatsappSendCount(counts[sale.id] ?? 0);
    });
  }, [open, sale?.id, whatsappAllowed]);

  const hasAcceptedCreditNote = useMemo(() => {
    return (sale?.creditNotes ?? []).some((cn) => cn.status === "ACCEPTED");
  }, [sale?.creditNotes]);

  const handleAnnul = async () => {
    if (!sale) return;
    if (!window.confirm("¿Está seguro de anular esta venta? Se revertirá el stock, pagos y movimientos de caja.")) return;

    setIsAnnulling(true);
    try {
      await annulSale(sale.id);
      toast.success("Venta anulada correctamente.");
      if (onRefresh) {
        onRefresh(sale.id);
      } else {
        onOpenChange(false);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al anular la venta";
      toast.error(message);
    } finally {
      setIsAnnulling(false);
    }
  };

  const handleRetrySunat = useCallback(async () => {
    if (!sale || isRetryingSunat) return;

    const logs = Array.isArray(sale.sunatTransmissions) ? sale.sunatTransmissions : [];
    const latestTransmission = logs.length > 0
      ? logs.reduce((latest, log) => {
          if (!latest) return log;
          const latestDate = new Date(latest.updatedAt ?? latest.createdAt ?? 0).getTime();
          const logDate = new Date(log.updatedAt ?? log.createdAt ?? 0).getTime();
          return logDate > latestDate ? log : latest;
        }, logs[0])
      : null;

    if (!latestTransmission?.id) {
      toast.error("No se encontró una transmisión SUNAT para reintentar.");
      return;
    }

    setIsRetryingSunat(true);
    try {
      await retrySunatTransmission(latestTransmission.id);
      toast.success("Reintento de envío a SUNAT iniciado. El resultado puede tardar unos segundos.");
      if (onRefresh) {
        setTimeout(() => onRefresh(sale.id), 3000);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al reintentar el envío a SUNAT";
      toast.error(message);
    } finally {
      setIsRetryingSunat(false);
    }
  }, [sale, isRetryingSunat, onRefresh]);

  const handleSendWhatsApp = async () => {
    if (!sale) return;
    const phone = whatsappPhone.trim();
    if (!phone) {
      toast.warning("Ingresa un numero de telefono");
      return;
    }
    setIsSendingWhatsApp(true);
    try {
      await sendInvoiceWhatsApp(sale.id, phone);
      setWhatsappSendCount((prev) => prev + 1);
      toast.success("Comprobante enviado por WhatsApp");
      setWhatsappPopoverOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al enviar por WhatsApp";
      toast.error(message);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const PAYMENT_LABELS: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    VISA: "Visa",
    YAPE: "Yape",
    PLIN: "Plin",
    TARJETA: "Tarjeta",
  };

  const handleGenerateReceipt = useCallback(async () => {
    if (!sale || isGeneratingReceipt) return;
    setIsGeneratingReceipt(true);
    try {
      const companyName =
        activeCompany?.sunatBusinessName?.trim() ||
        activeCompany?.legalName?.trim() ||
        activeCompany?.name?.trim() ||
        undefined;
      const companyRuc =
        activeCompany?.sunatRuc?.trim() ||
        activeCompany?.taxId?.trim() ||
        undefined;
      const companyAddress = activeCompany?.sunatAddress?.trim() || undefined;
      const companyPhone = activeCompany?.sunatPhone?.trim() || undefined;

      const paymentMethods = (sale.payments ?? [])
        .map((p) => {
          const name = p.paymentMethod?.name?.toUpperCase() ?? "";
          return PAYMENT_LABELS[name] || p.paymentMethod?.name || "Otro";
        })
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(", ") || "No especificado";

      const items = (sale.details ?? []).map((d) => {
        const qty = parseNumber(d.quantity);
        const unitPrice = parseNumber(d.price);
        return {
          name: d.product?.name ?? d.productName ?? d.product_name ?? "Producto",
          quantity: qty,
          unitPrice,
          total: getDetailTotal(d),
        };
      });

      const subtotalRaw = items.reduce((sum, it) => sum + it.total, 0);
      const total = parseNumber(sale.total);
      const igv = +(total - total / 1.18).toFixed(2);
      const subtotal = +(total - igv).toFixed(2);

      const receiptNumber = String(sale.id).padStart(6, "0");

      let dateTime = "";
      try {
        dateTime = format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm");
      } catch {
        dateTime = sale.createdAt;
      }

      const receiptData: RestaurantReceiptData = {
        storeName: sale.store?.name ?? "Tienda",
        companyName,
        companyRuc,
        companyAddress,
        companyPhone,
        receiptNumber,
        orderNumber: String(sale.id),
        orderType: sale.tipoComprobante ?? "SIN COMPROBANTE",
        dateTime,
        items,
        subtotal,
        igv,
        total,
        paymentMethod: paymentMethods,
        tipoComprobante: sale.tipoComprobante ?? "SIN COMPROBANTE",
        notes: sale.description?.trim() || undefined,
      };

      const ReceiptComponent =
        receiptFormat === "ticket"
          ? TicketRestaurantReceiptPdf
          : RestaurantReceiptPdf;

      const blob = await pdf(<ReceiptComponent data={receiptData} />).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("Error generating receipt:", err);
      toast.error("Error al generar la nota de venta");
    } finally {
      setIsGeneratingReceipt(false);
    }
  }, [sale, isGeneratingReceipt, activeCompany, receiptFormat]);

  const currency = useMemo(() => {
    if (!sale) {
      return "PEN";
    }
    const code =
      sale.payments?.find((payment) => payment?.currency)?.currency ||
      sale.tipoMoneda ||
      "PEN";
    return (code || "PEN").toUpperCase();
  }, [sale]);

  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
  }, [currency]);

  const paymentFormatterResolver = useMemo(() => {
    const cache = new Map<string, Intl.NumberFormat>();

    return (code?: string | null) => {
      const normalized =
        typeof code === "string" && code.trim().length === 3
          ? code.trim().toUpperCase()
          : currency;

      if (!cache.has(normalized)) {
        cache.set(
          normalized,
          new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: normalized,
            minimumFractionDigits: 2,
          }),
        );
      }

      return cache.get(normalized)!;
    };
  }, [currency]);

  const formatCurrency = (value?: number | null) => {
    if (typeof value !== "number") {
      return "—";
    }
    return currencyFormatter.format(value);
  };

  const formatPaymentAmount = (value: unknown, currencyCode?: string | null) => {
    if (value === null || value === undefined) {
      return "—";
    }

    const numericValue =
      typeof value === "number"
        ? value
        : typeof value === "string"
        ? Number(value)
        : NaN;

    if (!Number.isFinite(numericValue)) {
      return "—";
    }

    return paymentFormatterResolver(currencyCode).format(numericValue);
  };

  const sunatStatus = sale?.sunatStatus ?? null;
  const sunatLogs = Array.isArray(sale?.sunatTransmissions)
    ? sale!.sunatTransmissions
    : [];

  const invoice = sale?.invoices ?? null;
  const sunatAccepted = sunatLogs.some(
    (log) => log.status?.toUpperCase() === "ACCEPTED",
  );

  const invoicePdfUrl = useMemo(() => {
    if (!invoice?.tipoComprobante || !invoice?.serie || !invoice?.nroCorrelativo) {
      return null;
    }
    const tipo = invoice.tipoComprobante.toLowerCase();
    const code = tipo === "boleta" ? "03" : "01";
    const ruc = sale?.companyRuc ?? "00000000000";
    const file = `${ruc}-${code}-${invoice.serie}-${invoice.nroCorrelativo}.pdf`;
    return `/api/sunat/pdf/${tipo}/${file}`;
  }, [invoice, sale?.companyRuc]);

  const formattedDateTime = useMemo(() => {
    if (!sale?.createdAt) {
      return "";
    }

    try {
      return format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm");
    } catch (error) {
      return sale.createdAt;
    }
  }, [sale?.createdAt]);

  const aggregatedPayments = useMemo(() => {
    if (!Array.isArray(sale?.payments) || sale.payments.length === 0) {
      return [] as Array<{
        key: string;
        methodName: string;
        currency?: string;
        amount: number;
      }>;
    }

    const entries = new Map<
      string,
      {
        key: string;
        methodName: string;
        currency?: string;
        amount: number;
        identifiers: Set<string>;
      }
    >();

    sale.payments.forEach((payment) => {
      if (!payment) {
        return;
      }

      const rawMethod =
        typeof (payment as { method?: unknown }).method === "string"
          ? ((payment as { method?: string }).method ?? undefined)
          : undefined;

      const methodName =
        payment.paymentMethod?.name ??
        (rawMethod && rawMethod.trim().length > 0
          ? rawMethod
          : "Método de pago");

      const normalizedCurrency =
        typeof payment.currency === "string" && payment.currency.trim().length > 0
          ? payment.currency.trim().toUpperCase()
          : undefined;

      const amount = parseNumber(payment.amount);

      const identifiers = new Set<string>();

      if (
        typeof (payment as { transactionId?: unknown }).transactionId === "string" &&
        (payment as { transactionId?: string }).transactionId!.trim().length > 0
      ) {
        identifiers.add(
          `tx:${(payment as { transactionId?: string }).transactionId!.trim()}`,
        );
      }

      if (
        typeof (payment as { cashTransactionId?: unknown }).cashTransactionId ===
          "number" ||
        typeof (payment as { cashTransactionId?: unknown }).cashTransactionId ===
          "string"
      ) {
        identifiers.add(
          `cash:${String(
            (payment as { cashTransactionId?: string | number }).cashTransactionId!,
          )}`,
        );
      }

      if (
        typeof (payment as { referenceNote?: unknown }).referenceNote === "string" &&
        (payment as { referenceNote?: string }).referenceNote!.trim().length > 0
      ) {
        identifiers.add(
          `ref:${(payment as { referenceNote?: string }).referenceNote!.trim()}`,
        );
      }

      if (
        typeof (payment as { id?: unknown }).id === "number" ||
        typeof (payment as { id?: unknown }).id === "string"
      ) {
        identifiers.add(`id:${String((payment as { id?: string | number }).id)}`);
      }

      const key = `${methodName}|${normalizedCurrency ?? currency}`;

      const existing = entries.get(key);

      if (
        existing &&
        Array.from(identifiers).some((identifier) => existing.identifiers.has(identifier))
      ) {
        return;
      }

      if (!existing) {
        entries.set(key, {
          key,
          methodName,
          currency: normalizedCurrency,
          amount,
          identifiers,
        });
        return;
      }

      existing.amount += amount;
      identifiers.forEach((identifier) => existing.identifiers.add(identifier));
    });

    const aggregatedEntries = Array.from(entries.values());
    const aggregatedTotal = aggregatedEntries.reduce(
      (acc, entry) => acc + entry.amount,
      0,
    );

    const expectedTotal = parseNumber(sale?.total);
    const shouldNormalize =
      typeof expectedTotal === "number" &&
      expectedTotal > 0 &&
      aggregatedTotal > 0;

    if (shouldNormalize) {
      const ratio = aggregatedTotal / expectedTotal;
      const roundedRatio = Math.round(ratio);
      const EPSILON = 1e-6;

      if (roundedRatio > 1 && Math.abs(ratio - roundedRatio) <= EPSILON) {
        return aggregatedEntries.map(({ identifiers, ...entry }) => ({
          ...entry,
          amount: entry.amount / roundedRatio,
        }));
      }
    }

    return aggregatedEntries.map(({ identifiers, ...entry }) => entry);
  }, [sale?.payments, currency, sale?.total]);

  const detailRows = useMemo(() => {
    if (!sale?.details || sale.details.length === 0) {
      return null;
    }

    return sale.details.map((detail, index) => {
      const productName =
        detail.product?.name ??
        detail.productName ??
        detail.product_name ??
        "Producto sin nombre";
      const productSku =
        detail.product?.sku ??
        detail.productSku ??
        detail.product_sku ??
        null;
      const seriesList =
        detail.series
          ?.map((item) => {
            if (typeof item === "string") {
              return item;
            }

            if (!item) {
              return undefined;
            }

            return (
              ("number" in item ? item.number : undefined) ??
              ("serie" in item ? (item as Record<string, string>).serie : undefined) ??
              ("code" in item ? (item as Record<string, string>).code : undefined)
            );
          })
          .filter((value): value is string => Boolean(value)) ?? [];

      const detailTotal = getDetailTotal(detail);

      return (
        <tr key={detail.id ?? `${productName}-${index}`} className="border-t">
          <td className="px-4 py-2">
            <div className="flex flex-col">
              <span className="font-medium">{productName}</span>
              {productSku && (
                <span className="text-xs text-muted-foreground">SKU: {productSku}</span>
              )}
            </div>
          </td>
          <td className="px-4 py-2 whitespace-nowrap">{detail.quantity ?? "—"}</td>
          <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(detail.price)}</td>
          <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(detailTotal)}</td>
          <td className="px-4 py-2">{seriesList.length > 0 ? seriesList.join(", ") : "—"}</td>
        </tr>
      );
    });
  }, [sale?.details, currencyFormatter]);

  const detailsTotal = useMemo(() => {
    if (!sale?.details || sale.details.length === 0) {
      return 0;
    }

    return sale.details.reduce((acc, detail) => acc + getDetailTotal(detail), 0);
  }, [sale?.details]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-hidden p-4 sm:max-w-3xl sm:p-6 sm:gap-6 grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {sale ? `Detalle de la venta #${sale.id}` : "Detalle de la venta"}
          </DialogTitle>
          <DialogDescription>
            {sale
              ? `Información detallada de la transacción realizada el ${formattedDateTime}.`
              : "Selecciona una venta para ver la información completa."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-1 sm:pr-2">
          {loading && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-dashed bg-muted/60 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Actualizando información de la venta...</span>
            </div>
          )}
          {sale?.status === "ANULADA" && (
            <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 p-3 dark:bg-rose-950/20 dark:border-rose-700 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 w-full min-w-0">
                <Ban className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                  Venta Anulada
                </p>
                {sale.annulledAt && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 ml-auto flex-shrink-0">
                    {format(new Date(sale.annulledAt), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 break-words">
                Esta venta fue anulada mediante nota de crédito.
                Los comprobantes se mantienen para auditoría SUNAT.
              </p>
            </div>
          )}
          {sale ? (
            <div className="space-y-6 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Cliente</p>
                  <p className="text-base font-semibold">{sale.client?.name ?? "—"}</p>
                </div>
                {(sale.client?.type || sale.client?.documentNumber || sale.client?.ruc || sale.client?.dni) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {sale.client?.type ?? "Documento"}
                    </p>
                    <p className="text-base font-semibold break-words">
                      {sale.client?.ruc ?? sale.client?.dni ?? sale.client?.documentNumber ?? "—"}
                    </p>
                  </div>
                )}
                <div>
                <p className="text-xs font-medium text-muted-foreground">Usuario</p>
                <p className="text-base font-semibold">{sale.user?.username ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tienda</p>
                <p className="text-base font-semibold">{sale.store?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total</p>
                <p className="text-base font-semibold">{formatCurrency(sale.total)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tipo de comprobante</p>
                <p className="text-base font-semibold">{invoice?.tipoComprobante ?? sale.tipoComprobante ?? "SIN COMPROBANTE"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Moneda</p>
                <p className="text-base font-semibold">{currency}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Descripción</p>
                <p className="text-base">
                  {sale.description && sale.description.trim().length > 0
                    ? sale.description
                    : "Sin descripción"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Comprobante</h3>
              {invoice ? (
                <div className="rounded-md border p-3 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Tipo</p>
                      <p className="text-sm font-semibold">{invoice.tipoComprobante ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Serie - Correlativo</p>
                      <p className="text-sm font-semibold">
                        {invoice.serie && invoice.nroCorrelativo
                          ? `${invoice.serie}-${invoice.nroCorrelativo}`
                          : "—"}
                      </p>
                    </div>
                    {invoice.fechaEmision && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Fecha de emisión</p>
                        <p className="text-sm">{formatSunatDate(invoice.fechaEmision)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Estado SUNAT</p>
                      <div className="mt-0.5">
                        {sunatAccepted ? (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-medium">
                            ACEPTADO
                          </Badge>
                        ) : sunatStatus ? (
                          renderSunatStatusBadge(sunatStatus)
                        ) : (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-medium">
                            NO ENVIADO
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {invoicePdfUrl && (
                    <a
                      href={invoicePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted cursor-pointer"
                    >
                      <FileText className="h-4 w-4" />
                      Ver PDF del comprobante
                    </a>
                  )}

                  {sunatStatus?.errorMessage && (
                    <p className="text-xs text-destructive">Error: {sunatStatus.errorMessage}</p>
                  )}

                  {/* Retry button — visible when SUNAT status is a retryable error */}
                  {(() => {
                    const status = sunatStatus?.status?.toUpperCase();
                    const isRetryable = status === "ERROR" || status === "FAILED" || status === "REJECTED";
                    if (!isRetryable || sale?.status === "ANULADA" || isEmployee) return null;

                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetrySunat}
                        disabled={isRetryingSunat}
                        className="cursor-pointer gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30 transition-all duration-200"
                      >
                        {isRetryingSunat ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {isRetryingSunat ? "Reintentando..." : "Reintentar envío SUNAT"}
                      </Button>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Esta venta no tiene comprobante SUNAT.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateReceipt}
                    disabled={isGeneratingReceipt}
                    className="cursor-pointer gap-2 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm active:scale-95"
                  >
                    {isGeneratingReceipt ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    {isGeneratingReceipt ? "Generando..." : `Ver Nota de Venta (${receiptFormat === "ticket" ? "Ticket" : "A4"})`}
                  </Button>
                </div>
              )}

              {sunatLogs.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Historial de envíos SUNAT</p>
                  <div className="max-h-48 overflow-auto rounded-md border text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 font-medium">Fecha</th>
                          <th className="px-3 py-2 font-medium">Estado</th>
                          <th className="px-3 py-2 font-medium">Respuesta SUNAT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sunatLogs.map((log, index) => (
                          <tr
                            key={log.id ?? `${log.status}-${log.updatedAt ?? log.createdAt ?? index}`}
                            className="border-t"
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              {formatSunatDate(log.updatedAt ?? log.createdAt)}
                            </td>
                            <td className="px-3 py-2">{renderSunatStatusBadge(log)}</td>
                            <td className="px-3 py-2">
                              {renderSunatResponse(log)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {sale.creditNotes && sale.creditNotes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-amber-600" />
                  Nota de Crédito
                </h3>
                {sale.creditNotes.map((cn) => {
                  const cnStatusColor =
                    cn.status === "ACCEPTED"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : cn.status === "REJECTED"
                      ? "bg-red-100 text-red-800 border-red-200"
                      : "bg-amber-100 text-amber-800 border-amber-200";
                  const cnStatusLabel =
                    cn.status === "ACCEPTED"
                      ? "ACEPTADA"
                      : cn.status === "REJECTED"
                      ? "RECHAZADA"
                      : cn.status === "DRAFT"
                      ? "BORRADOR"
                      : cn.status === "TRANSMITTED"
                      ? "TRANSMITIDA"
                      : cn.status;
                  return (
                    <div
                      key={cn.id}
                      className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2 dark:bg-amber-950/20 dark:border-amber-700"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Serie - Correlativo</p>
                          <p className="text-sm font-semibold">{cn.serie}-{cn.correlativo}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Estado</p>
                          <Badge variant="outline" className={`text-xs font-medium ${cnStatusColor}`}>
                            {cnStatusLabel}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Motivo</p>
                          <p className="text-sm break-words">{cn.motivo}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total</p>
                          <p className="text-sm font-semibold">{formatCurrency(cn.total)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Fecha de emisión</p>
                          <p className="text-sm">{formatSunatDate(cn.fechaEmision ?? cn.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Fecha de creación</p>
                          <p className="text-sm">{formatSunatDate(cn.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Código SUNAT</p>
                          <p className="text-sm">{cn.codigoMotivo}</p>
                        </div>
                      </div>

                      {sale?.companyRuc && (
                        <a
                          href={`/api/sunat/pdf/nota_credito/${sale.companyRuc}-07-${cn.serie}-${cn.correlativo}.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted cursor-pointer"
                        >
                          <FileText className="h-4 w-4" />
                          Ver PDF de la Nota de Crédito
                        </a>
                      )}

                      {cn.sunatTransmissions && cn.sunatTransmissions.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-xs font-medium text-muted-foreground">Historial de envíos SUNAT (NC)</p>
                          <div className="max-h-36 overflow-auto rounded-md border text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 font-medium">Fecha</th>
                                  <th className="px-3 py-2 font-medium">Estado</th>
                                  <th className="px-3 py-2 font-medium">Respuesta SUNAT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cn.sunatTransmissions.map((t, ti) => (
                                  <tr key={t.id ?? ti} className="border-t">
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      {formatSunatDate(t.updatedAt ?? t.createdAt)}
                                    </td>
                                    <td className="px-3 py-2">{renderSunatStatusBadge(t)}</td>
                                    <td className="px-3 py-2">{renderSunatResponse(t)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {Array.isArray(detailRows) && detailRows.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Productos vendidos</h3>
                <div className="overflow-x-auto rounded-md border md:overflow-hidden">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-muted">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-medium">Producto</th>
                        <th className="px-4 py-2 font-medium whitespace-nowrap">Cantidad</th>
                        <th className="px-4 py-2 font-medium whitespace-nowrap">Precio</th>
                        <th className="px-4 py-2 font-medium whitespace-nowrap">Total</th>
                        <th className="px-4 py-2 font-medium">Series</th>
                      </tr>
                    </thead>
                    <tbody>{detailRows}</tbody>
                  </table>
                </div>
                <div className="flex justify-end rounded-b-md border border-t-0 px-4 py-2 text-sm font-semibold">
                  <span>Total de la salida: {formatCurrency(detailsTotal)}</span>
                </div>
              </div>
            )}

            {aggregatedPayments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Pagos</h3>
                <div className="table-scroll overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-medium">Método de pago</th>
                        <th className="px-4 py-2 font-medium">Moneda</th>
                        <th className="px-4 py-2 font-medium">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                        {aggregatedPayments.map((payment) => {
                          const paymentCurrency = payment.currency?.toUpperCase();
                          const icon = getPaymentIcon(payment.methodName);
                          return (
                            <tr key={payment.key} className="border-t">
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  {icon}
                                  <span>{payment.methodName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 uppercase">
                                {paymentCurrency ?? currency}
                              </td>
                            <td className="px-4 py-2 font-semibold">
                              {formatPaymentAmount(payment.amount, paymentCurrency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">
              Cargando información detallada de la venta...
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecciona una venta para ver sus detalles completos.
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2 flex-col gap-2 sm:flex-row">
          {sale?.status !== "ANULADA" && sunatAccepted && canEmitCreditNote && (!sale?.creditNotes || sale.creditNotes.length === 0) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCreditNoteOpen(true)}
              className="cursor-pointer gap-1.5"
            >
              <FileX2 className="h-4 w-4" />
              Emitir Nota de Crédito
            </Button>
          )}
          {sale?.status !== "ANULADA" && sunatAccepted && whatsappAllowed && (
            <TooltipProvider delayDuration={200}>
            {whatsAppConnected === false ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 opacity-50 cursor-not-allowed text-muted-foreground"
                      disabled
                    >
                      <MessageCircle className="h-4 w-4" />
                      Enviar por WhatsApp
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">WhatsApp no conectado. Conecta tu WhatsApp en Ajustes para enviar.</p>
                </TooltipContent>
              </Tooltip>
            ) : (
            <Popover open={whatsappPopoverOpen} onOpenChange={(popOpen) => {
              setWhatsappPopoverOpen(popOpen);
              if (popOpen) {
                setWhatsappPhone((sale?.client as any)?.phone || "");
              }
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative cursor-pointer gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar por WhatsApp
                  {whatsappSendCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                          {whatsappSendCount}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">
                          Enviado {whatsappSendCount} {whatsappSendCount === 1 ? "vez" : "veces"} por WhatsApp
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 space-y-3" align="end">
                <div className="space-y-1">
                  <Label htmlFor="whatsapp-phone" className="text-sm font-medium">
                    Numero de WhatsApp
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ingresa el numero al que enviar el comprobante
                  </p>
                </div>
                <Input
                  id="whatsapp-phone"
                  type="tel"
                  placeholder="Ej: 51987654321"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSendingWhatsApp) {
                      handleSendWhatsApp();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSendWhatsApp}
                  disabled={isSendingWhatsApp || !whatsappPhone.trim()}
                  className="w-full cursor-pointer gap-1.5"
                >
                  {isSendingWhatsApp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar
                </Button>
              </PopoverContent>
            </Popover>
            )}
            </TooltipProvider>
          )}
          {sale?.status === "ACTIVE" && hasAcceptedCreditNote && canEmitCreditNote && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleAnnul}
              disabled={isAnnulling}
              className="cursor-pointer gap-1.5"
            >
              {isAnnulling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Anular Venta
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>

      {sale && (
        <CreditNoteDialog
          sale={sale}
          open={creditNoteOpen}
          onOpenChange={setCreditNoteOpen}
          onSuccess={() => {
            if (sale && onRefresh) {
              onRefresh(sale.id);
            } else {
              onOpenChange(false);
            }
          }}
        />
      )}
    </Dialog>
  );
}

type SaleSunatTransmissionItem = NonNullable<Sale["sunatTransmissions"]> extends Array<infer T>
  ? T
  : never;

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  OBSERVED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SENT: "bg-amber-100 text-amber-800 border-amber-200",
  SENDING: "bg-blue-100 text-blue-800 border-blue-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  ERROR: "bg-red-100 text-red-800 border-red-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  RETRYING: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: "ACEPTADO",
  SENT: "ENVIADO (sin CDR)",
  SENDING: "ENVIANDO",
  PENDING: "PENDIENTE",
  FAILED: "ERROR",
  ERROR: "ERROR",
  REJECTED: "RECHAZADO",
  OBSERVED: "OBSERVADO",
  RETRYING: "REINTENTANDO",
};

function renderSunatStatusBadge(
  status?: Sale["sunatStatus"] | SaleSunatTransmissionItem | null,
) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">Sin envíos</span>;
  }
  const normalized = status.status?.toUpperCase() ?? "DESCONOCIDO";
  const colorClass = STATUS_COLORS[normalized] ?? "bg-slate-100 text-slate-800 border-slate-200";
  const label = STATUS_LABELS[normalized] ?? normalized;
  const tooltipParts: string[] = [];
  if (status.environment) tooltipParts.push(`Ambiente: ${status.environment}`);
  if (status.ticket) tooltipParts.push(`Ticket: ${status.ticket}`);
  if ("cdrCode" in status && status.cdrCode) {
    tooltipParts.push(`Código CDR: ${status.cdrCode}`);
  }
  if ("cdrDescription" in status && status.cdrDescription) {
    tooltipParts.push(`CDR: ${status.cdrDescription}`);
  }
  if ("errorMessage" in status && status.errorMessage) {
    tooltipParts.push(`Error: ${status.errorMessage}`);
  }

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${colorClass}`}
      title={tooltipParts.join(" • ") || undefined}
    >
      {label}
    </Badge>
  );
}

function renderSunatResponse(
  log: SaleSunatTransmissionItem,
) {
  const cdrCode = "cdrCode" in log ? log.cdrCode : null;
  const cdrDescription = "cdrDescription" in log ? log.cdrDescription : null;
  const errorMessage = "errorMessage" in log ? log.errorMessage : null;

  if (cdrCode && cdrDescription) {
    return (
      <span className="break-words">
        <span className="font-medium">[{cdrCode}]</span> {cdrDescription}
      </span>
    );
  }
  if (cdrDescription) {
    return <span className="break-words">{cdrDescription}</span>;
  }
  if (errorMessage) {
    return <span className="break-words text-destructive">{errorMessage}</span>;
  }
  return <span className="text-muted-foreground">—</span>;
}

function formatSunatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return format(date, "dd/MM/yyyy HH:mm");
}
