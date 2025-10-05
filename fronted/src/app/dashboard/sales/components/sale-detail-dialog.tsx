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
import { Sale } from "../columns";

type SaleDetail = Sale["details"] extends Array<infer Item> ? Item : never;

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

const getDetailTotal = (detail?: SaleDetail | null): number => {
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
}

export function SaleDetailDialog({ sale, open, onOpenChange }: SaleDetailDialogProps) {
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

  const formatCurrency = (value?: number | null) => {
    if (typeof value !== "number") {
      return "—";
    }
    return currencyFormatter.format(value);
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
          <td className="px-4 py-2">{detail.quantity ?? "—"}</td>
          <td className="px-4 py-2">{formatCurrency(detail.price)}</td>
          <td className="px-4 py-2">{formatCurrency(detailTotal)}</td>
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {sale ? `Detalle de la venta #${sale.id}` : "Detalle de la venta"}
          </DialogTitle>
          <DialogDescription>
            {sale
              ? `Información detallada de la transacción realizada el ${formattedDateTime}.`
              : "Selecciona una venta para ver la información completa."}
          </DialogDescription>
        </DialogHeader>

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
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-medium">Producto</th>
                        <th className="px-4 py-2 font-medium">Cantidad</th>
                        <th className="px-4 py-2 font-medium">Precio</th>
                        <th className="px-4 py-2 font-medium">Total</th>
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

            {Array.isArray(sale.payments) && sale.payments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Pagos</h3>
                <div className="space-y-1">
                  {sale.payments.map((payment, index) => (
                    <div
                      key={payment.id ?? `${payment.paymentMethod?.name ?? "pago"}-${index}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {payment.paymentMethod?.name ?? "Método de pago"}
                        </p>
                        {payment.currency && (
                          <p className="text-xs text-muted-foreground uppercase">
                            {payment.currency}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold">
                        {formatCurrency(payment.amount ?? undefined)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecciona una venta para ver sus detalles completos.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


