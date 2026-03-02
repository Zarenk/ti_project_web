"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Ban, CheckCircle2, Clock, RefreshCw, Send, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  cdrCode?: string | null;
  cdrDescription?: string | null;
};

export type SaleSunatTransmission = SaleSunatStatus & {
  createdAt?: string | null;
};

export type Sale = {
  id: number;
  status?: string;
  annulledAt?: string | null;
  user: { username: string };
  store: { name: string };
  client: {
    name: string;
    type?: string;
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
  invoices?: {
    serie?: string;
    nroCorrelativo?: string;
    tipoComprobante?: string;
    tipoMoneda?: string;
    total?: number;
    fechaEmision?: string;
    companyId?: number;
  } | null;
  companyRuc?: string;
  sunatStatus?: SaleSunatStatus | null;
  sunatTransmissions?: SaleSunatTransmission[];
  creditNotes?: {
    id: number;
    status: string;
    serie: string;
    correlativo: string;
    motivo: string;
    codigoMotivo: string;
    total: number;
    fechaEmision?: string | null;
    createdAt: string;
    sunatTransmissions?: {
      id: number;
      status: string;
      environment?: string | null;
      errorMessage?: string | null;
      cdrCode?: string | null;
      cdrDescription?: string | null;
      createdAt?: string | null;
      updatedAt?: string | null;
    }[];
  }[];
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span>{row.original.id}</span>
          {row.original.status === "ANULADA" && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0 leading-tight">
              <Ban className="h-3 w-3 mr-0.5" />
              ANULADA
            </Badge>
          )}
        </div>
      ),
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
      cell: ({ row }) => (
        <span className={row.original.status === "ANULADA" ? "line-through text-muted-foreground" : ""}>
          S/. {row.original.total.toFixed(2)}
        </span>
      ),
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
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => {
        if (row.original.status === "ANULADA") {
          return (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <Ban className="h-3 w-3" />
              ANULADA
            </Badge>
          );
        }
        return renderSunatStatusBadge(row.original.sunatStatus);
      },
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
            {(() => {
              const sunatIsAccepted = sale.sunatStatus?.status?.toUpperCase() === "ACCEPTED";
              const blockDeletion = sale.invoices && sunatIsAccepted;

              if (blockDeletion) {
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button
                            variant="destructive"
                            disabled
                            className="opacity-50 cursor-not-allowed"
                          >
                            Eliminar
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Aceptada por SUNAT. Emita una nota de crédito para anular.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              return (
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
              );
            })()}
          </div>

          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Deseas eliminar esta venta?</AlertDialogTitle>
                <AlertDialogDescription>
                  {sale.invoices
                    ? "Esta venta tiene un comprobante con error SUNAT. Se eliminará el comprobante junto con la venta. Esta acción no se puede deshacer."
                    : "Esta acción no se puede deshacer y removerá la venta del historial."}
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

const SUNAT_TABLE_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; colorClass: string }> = {
  ACCEPTED: { label: "Aceptado", icon: CheckCircle2, colorClass: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  SENT: { label: "Enviado", icon: Send, colorClass: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  SENDING: { label: "Enviando", icon: RefreshCw, colorClass: "bg-blue-100 text-blue-800 border-blue-200" },
  PENDING: { label: "Pendiente", icon: Clock, colorClass: "bg-amber-100 text-amber-800 border-amber-200" },
  FAILED: { label: "Rechazado", icon: XCircle, colorClass: "bg-red-100 text-red-800 border-red-200" },
  ERROR: { label: "Error", icon: XCircle, colorClass: "bg-red-100 text-red-800 border-red-200" },
  RETRYING: { label: "Reintentando", icon: RefreshCw, colorClass: "bg-indigo-100 text-indigo-800 border-indigo-200" },
};

function renderSunatStatusBadge(status?: SaleSunatStatus | null) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">Sin envíos</span>;
  }

  const normalized = status.status?.toUpperCase() ?? "DESCONOCIDO";
  const config = SUNAT_TABLE_STATUS[normalized];
  const colorClass = config?.colorClass ?? "bg-slate-100 text-slate-800 border-slate-200";
  const label = config?.label ?? normalized;
  const Icon = config?.icon ?? null;
  const isSpinning = normalized === "SENDING" || normalized === "RETRYING";

  const tooltipParts: string[] = [];
  if (status.environment) tooltipParts.push(`Ambiente: ${status.environment}`);
  if (status.ticket) tooltipParts.push(`Ticket: ${status.ticket}`);
  if (status.cdrCode) tooltipParts.push(`Código CDR: ${status.cdrCode}`);
  if (status.cdrDescription) tooltipParts.push(`CDR: ${status.cdrDescription}`);
  if (status.errorMessage) tooltipParts.push(`Último error: ${status.errorMessage}`);
  const title = tooltipParts.join(" • ");

  return (
    <Badge
      variant="outline"
      title={title || undefined}
      className={`text-xs font-medium gap-1 ${colorClass}`}
    >
      {Icon && <Icon className={`h-3 w-3${isSpinning ? " animate-spin" : ""}`} />}
      {label}
    </Badge>
  );
}


