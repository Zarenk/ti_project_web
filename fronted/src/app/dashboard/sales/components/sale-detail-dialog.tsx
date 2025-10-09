"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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

  const uniquePayments = useMemo(() => {
    if (!Array.isArray(sale?.payments) || sale.payments.length === 0) {
      return [] as NonNullable<Sale["payments"]>;
    }

    const seen = new Set<string>();
    const result: NonNullable<Sale["payments"]> = [];

    for (const payment of sale.payments) {
      if (!payment) {
        continue;
      }

      const rawMethod =
        typeof (payment as { method?: unknown }).method === "string"
          ? ((payment as { method?: string }).method ?? undefined)
          : undefined;
      const normalizedMethod =
        payment.paymentMethod?.name ??
        (rawMethod && rawMethod.trim().length > 0 ? rawMethod : undefined);

      const normalizedAmount =
        typeof payment.amount === "number"
          ? payment.amount.toFixed(2)
          : typeof payment.amount === "string"
          ? payment.amount
          : "";

      const key =
        payment.id !== undefined && payment.id !== null
          ? `id:${payment.id}`
          : [normalizedMethod ?? "", payment.currency ?? "", normalizedAmount].join(
              "|",
            );

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(payment);
    }

    return result;
  }, [sale?.payments]);

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

            {uniquePayments.length > 0 && (
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
                      {uniquePayments.map((payment, index) => {
                        const paymentKey =
                          payment.id ??
                          `${payment.paymentMethod?.name ?? "pago"}-${index}`;
                        const paymentCurrency = payment.currency?.toUpperCase();
                        const rawMethod =
                          typeof (payment as { method?: unknown }).method === "string"
                            ? ((payment as { method?: string }).method ?? undefined)
                            : undefined;
                        const paymentMethodName =
                          payment.paymentMethod?.name ??
                          (rawMethod && rawMethod.trim().length > 0
                            ? rawMethod
                            : "Método de pago");

                        return (
                          <tr key={paymentKey} className="border-t">
                            <td className="px-4 py-2">{paymentMethodName}</td>
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
