"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { deleteSale } from "./sales.api";

export type Sale = {
  id: number;
  user: { username: string };
  store: { name: string };
  client: { name: string };
  total: number;
  description?: string;
  createdAt: string;
  tipoComprobante?: string;
  tipoMoneda?: string;
  payments?: {
    id?: number;
    amount?: number;
    currency?: string;
    paymentMethod?: { name?: string } | null;
  }[];
  details?: {
    id?: number;
    quantity?: number;
    price?: number;
    subtotal?: number;
    total?: number;
    product?: { name?: string; sku?: string } | null;
    productName?: string;
    product_name?: string;
    productSku?: string;
    product_sku?: string;
    series?: (string | { number?: string })[];
  }[];
};

export function createSalesColumns(onDeleted: (id: number) => void): ColumnDef<Sale>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <span>{row.original.id}</span>,
    },
    {
      accessorKey: "user.username",
      header: "Usuario",
      cell: ({ row }) => <span>{row.original.user.username}</span>,
    },
    {
      accessorKey: "store.name",
      header: "Tienda",
      cell: ({ row }) => <span>{row.original.store.name}</span>,
    },
    {
      accessorKey: "client.name",
      header: "Cliente",
      cell: ({ row }) => <span>{row.original.client.name}</span>,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => <span>S/. {row.original.total.toFixed(2)}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => <span>{format(new Date(row.original.createdAt), "dd/MM/yyyy")}</span>,
    },
    {
      accessorKey: "actions",
      header: "Acciones",
      cell: ({ row }) => {
      const [isDialogOpen, setIsDialogOpen] = useState(false);
      const [isDeleting, setIsDeleting] = useState(false);
      const [isDetailOpen, setIsDetailOpen] = useState(false);

      const sale = row.original;

      const currency = useMemo(() => {
        const code =
          sale.payments?.find((payment) => payment?.currency)?.currency ||
          sale.tipoMoneda ||
          "PEN";
        return (code || "PEN").toUpperCase();
      }, [sale.payments, sale.tipoMoneda]);

      const currencyFormatter = useMemo(
        () =>
          new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
          }),
        [currency],
      );

      const formatCurrency = (value?: number | null) => {
        if (typeof value !== "number") {
          return "—";
        }
        return currencyFormatter.format(value);
      };

      const formattedDateTime = useMemo(() => {
        try {
          return format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm");
        } catch (error) {
          return sale.createdAt;
        }
      }, [sale.createdAt]);

      const handleRemoveSale = async () => {
        setIsDeleting(true);
        try {
          await deleteSale(row.original.id);
          toast.success("Venta eliminada correctamente.");
          setIsDialogOpen(false);
          onDeleted(row.original.id);
        } catch (error: unknown) {
          console.error("Error al eliminar la venta:", error);
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo eliminar la venta. Inténtalo nuevamente.";
          toast.error(message);
        } finally {
          setIsDeleting(false);
        }
      };

      return (
        <>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailOpen(true);
              }}
            >
              Ver Detalles
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDialogOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>

          <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Detalle de la venta #{sale.id}</DialogTitle>
                <DialogDescription>
                  Información detallada de la transacción realizada el {formattedDateTime}.
                </DialogDescription>
              </DialogHeader>

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

                {Array.isArray(sale.details) && sale.details.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Productos vendidos</h3>
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr className="text-left">
                            <th className="px-4 py-2 font-medium">Producto</th>
                            <th className="px-4 py-2 font-medium">Cantidad</th>
                            <th className="px-4 py-2 font-medium">Precio</th>
                            <th className="px-4 py-2 font-medium">Subtotal</th>
                            <th className="px-4 py-2 font-medium">Series</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sale.details.map((detail, index) => {
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
                              detail.series?.map((item) =>
                                typeof item === "string" ? item : item?.number,
                              ) ?? [];

                            return (
                              <tr
                                key={detail.id ?? `${productName}-${index}`}
                                className="border-t"
                              >
                                <td className="px-4 py-2">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{productName}</span>
                                    {productSku && (
                                      <span className="text-xs text-muted-foreground">
                                        SKU: {productSku}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2">{detail.quantity ?? "—"}</td>
                                <td className="px-4 py-2">{formatCurrency(detail.price)}</td>
                                <td className="px-4 py-2">
                                  {formatCurrency(detail.total ?? detail.subtotal)}
                                </td>
                                <td className="px-4 py-2">
                                  {seriesList.length > 0 ? seriesList.join(", ") : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Deseas eliminar esta venta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer y removerá la venta del
                  historial.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemoveSale}
                  disabled={isDeleting}
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );
    },
  },
 ];
}