"use client";

import { useMemo } from "react";
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
import { Loader2 } from "lucide-react";
import { Sale } from "../columns";

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

export type ViewSaleDetailHandler = (sale: Sale) => void;

export interface SaleDetailDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
}

export function SaleDetailDialog({
  sale,
  open,
  onOpenChange,
  loading = false,
}: SaleDetailDialogProps) {
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
          {sale ? (
            <div className="space-y-6 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Cliente</p>
                  <p className="text-base font-semibold">{sale.client?.name ?? "—"}</p>
                </div>
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
                <p className="text-base font-semibold">{sale.tipoComprobante ?? "—"}</p>
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
              <h3 className="text-sm font-semibold">Envíos SUNAT</h3>
              {sunatStatus ? (
                <div className="rounded-md border border-dashed p-3 text-sm">
                  <div className="mb-2">{renderSunatStatusBadge(sunatStatus)}</div>
                  <p className="text-xs text-muted-foreground">
                    {sunatStatus.updatedAt
                      ? `Actualizado el ${formatSunatDate(sunatStatus.updatedAt)}`
                      : "Estado más reciente registrado."}
                  </p>
                  {sunatStatus.ticket ? (
                    <p className="text-xs text-muted-foreground">Ticket: {sunatStatus.ticket}</p>
                  ) : null}
                  {sunatStatus.errorMessage ? (
                    <p className="text-xs text-destructive">Error: {sunatStatus.errorMessage}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no se han registrado envíos automáticos para esta venta.
                </p>
              )}
              {sunatLogs.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-md border text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 font-medium">Fecha</th>
                        <th className="px-3 py-2 font-medium">Estado</th>
                        <th className="px-3 py-2 font-medium">Ticket</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sunatLogs.map((log, index) => (
                        <tr
                          key={log.id ?? `${log.status}-${log.updatedAt ?? log.createdAt ?? index}`}
                          className="border-t"
                        >
                          <td className="px-3 py-2">
                            {formatSunatDate(log.updatedAt ?? log.createdAt)}
                          </td>
                          <td className="px-3 py-2">{renderSunatStatusBadge(log)}</td>
                          <td className="px-3 py-2">{log.ticket ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

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
                <div className="overflow-hidden rounded-md border">
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
                        return (
                          <tr key={payment.key} className="border-t">
                            <td className="px-4 py-2">{payment.methodName}</td>
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

        <DialogFooter className="shrink-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SaleSunatTransmissionItem = Sale["sunatTransmissions"] extends Array<infer T>
  ? T
  : never;

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  SENDING: "bg-blue-100 text-blue-800 border-blue-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  ERROR: "bg-red-100 text-red-800 border-red-200",
  RETRYING: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

function renderSunatStatusBadge(
  status?: Sale["sunatStatus"] | SaleSunatTransmissionItem | null,
) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">Sin envíos</span>;
  }
  const normalized = status.status?.toUpperCase() ?? "DESCONOCIDO";
  const colorClass = STATUS_COLORS[normalized] ?? "bg-slate-100 text-slate-800 border-slate-200";
  const tooltipParts: string[] = [];
  if (status.environment) tooltipParts.push(`Ambiente: ${status.environment}`);
  if (status.ticket) tooltipParts.push(`Ticket: ${status.ticket}`);
  if ("errorMessage" in status && status.errorMessage) {
    tooltipParts.push(`Error: ${status.errorMessage}`);
  }

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${colorClass}`}
      title={tooltipParts.join(" • ") || undefined}
    >
      {normalized}
    </Badge>
  );
}

function formatSunatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return format(date, "dd/MM/yyyy HH:mm");
}
