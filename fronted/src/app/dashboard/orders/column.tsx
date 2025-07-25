"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { completeWebOrder, rejectWebOrder } from "../sales/sales.api";
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
import { useState } from "react";

export type Order = {
  id: number;
  code: string;
  createdAt: string;
  client: string;
  total: number;
  status: string;
};

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "code",
    header: "Orden",
  },
  {
    accessorKey: "client",
    header: "Cliente",
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => format(new Date(row.original.createdAt), "dd/MM/yyyy"),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => `S/. ${row.original.total.toFixed(2)}`,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      switch (row.original.status) {
        case "PENDING":
          return "Pendiente";
        case "COMPLETED":
          return "Completado";
        case "DENIED":
          return "Denegado";
        default:
          return row.original.status;
      }
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const [openComplete, setOpenComplete] = useState(false);
      const [openReject, setOpenReject] = useState(false);

      if (row.original.status !== "PENDING") return null;

      return (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setOpenComplete(true)}>
            Completar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setOpenReject(true)}
          >
            Rechazar
          </Button>

          <AlertDialog open={openComplete} onOpenChange={setOpenComplete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Deseas completar esta orden?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Confirma que el cliente realizó el depósito o envió la
                  información de pago necesaria.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await completeWebOrder(row.original.id);
                      toast.success("Orden completada");
                    } catch {
                      toast.error("Error al completar la orden");
                    } finally {
                      setOpenComplete(false);
                    }
                  }}
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={openReject} onOpenChange={setOpenReject}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Rechazar esta orden?</AlertDialogTitle>
                <AlertDialogDescription>
                  Marca la orden como denegada por falta de información.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await rejectWebOrder(row.original.id);
                      toast.success("Orden rechazada");
                    } catch {
                      toast.error("Error al rechazar la orden");
                    } finally {
                      setOpenReject(false);
                    }
                  }}
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];