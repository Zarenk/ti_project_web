"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { completeWebOrder } from "../sales/sales.api";

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
    cell: ({ row }) => (row.original.status === "PENDING" ? "Pendiente" : "Completado"),
  },
  {
    id: "actions",
    cell: ({ row }) =>
      row.original.status === "PENDING" ? (
        <Button
          size="sm"
          onClick={async () => {
            try {
              await completeWebOrder(row.original.id);
              toast.success("Orden completada");
            } catch {
              toast.error("Error al completar la orden");
            }
          }}
        >
          Completar
        </Button>
      ) : null,
  },
];