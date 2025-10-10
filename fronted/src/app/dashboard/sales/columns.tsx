"use client";

import { useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { deleteSale } from "./sales.api";
import { ViewSaleDetailHandler } from "./components/sale-detail-dialog";

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
    id?: number | string;
    amount?: number;
    currency?: string;
    transactionId?: string | null;
    referenceNote?: string | null;
    cashTransactionId?: number | string | null;
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

export function createSalesColumns(
  onDeleted: (id: number) => void,
  onViewDetail?: ViewSaleDetailHandler,
): ColumnDef<Sale>[] {  
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
      cell: ({ row }) => (
        <span>{format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm")}</span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Acciones",
      cell: ({ row }) => {
      const [isDialogOpen, setIsDialogOpen] = useState(false);
      const [isDeleting, setIsDeleting] = useState(false);

      const sale = row.original;

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
              onClick={(event) => {
                event.stopPropagation();
                onViewDetail?.(sale);
              }}
            >
              Ver Detalles
            </Button>
            <Button
              variant="destructive"
              onClick={(event) => {
                event.stopPropagation();
                setIsDialogOpen(true);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>

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