"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
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
import { DeleteActionsGuard } from "@/components/delete-actions-guard";

export type SaleSunatStatus = {
  id?: number;
  status: string;
  ticket?: string | null;
  environment?: string | null;
  updatedAt?: string | null;
  errorMessage?: string | null;
};

export type SaleSunatTransmission = SaleSunatStatus & {
  createdAt?: string | null;
};

export type Sale = {
  id: number;
  user: { username: string };
  store: { name: string };
  client: {
    name: string;
    documentNumber?: string;
    dni?: string;
    ruc?: string;
  };
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
  sunatStatus?: SaleSunatStatus | null;
  sunatTransmissions?: SaleSunatTransmission[];
};

export function createSalesColumns(
  onDeleted: (id: number) => void,
  onViewDetail?: ViewSaleDetailHandler,
): ColumnDef<Sale>[] {  
  return [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.id}</span>,
    },
    {
      accessorKey: "user.username",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Usuario
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.user.username}</span>,
    },
    {
      accessorKey: "store.name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Tienda
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.store.name}</span>,
    },
    {
      accessorKey: "client.name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Cliente
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.client.name}</span>,
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>S/. {row.original.total.toFixed(2)}</span>,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span>{format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm")}</span>
      ),
    },
    {
      accessorKey: "sunatStatus",
      header: "SUNAT",
      enableSorting: false,
      cell: ({ row }) => renderSunatStatusBadge(row.original.sunatStatus),
    },
    {
      accessorKey: "actions",
      header: "Acciones",
      enableSorting: false,
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
            <DeleteActionsGuard>
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
            </DeleteActionsGuard>
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

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  SENDING: "bg-blue-100 text-blue-800 border-blue-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  ERROR: "bg-red-100 text-red-800 border-red-200",
  RETRYING: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

function renderSunatStatusBadge(status?: SaleSunatStatus | null) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">Sin envíos</span>;
  }

  const normalized = status.status?.toUpperCase() ?? "DESCONOCIDO";
  const colorClass = STATUS_COLORS[normalized] ?? "bg-slate-100 text-slate-800 border-slate-200";
  const tooltipParts: string[] = [];
  if (status.environment) tooltipParts.push(`Ambiente: ${status.environment}`);
  if (status.ticket) tooltipParts.push(`Ticket: ${status.ticket}`);
  if (status.errorMessage) tooltipParts.push(`Último error: ${status.errorMessage}`);
  const title = tooltipParts.join(" • ");

  return (
    <Badge
      variant="outline"
      title={title || undefined}
      className={`text-xs font-medium ${colorClass}`}
    >
      {normalized}
    </Badge>
  );
}


