"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type History = {
  id: number;
  username: string;
  action: string;
  product: string;
  stores: string;
  previousStock: number | null;
  stockChange: number;
  newStock: number | null;
  createdAt: string;
};

export const columns: ColumnDef<History>[] = [
  {
    accessorKey: "username",
    header: "Usuario",
  },
  {
    accessorKey: "action",
    header: "Acción",
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => (
      <span>{format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm")}</span>
    ),
  },
  {
    accessorKey: "product",
    header: "Producto",
  },
  {
    accessorKey: "stores",
    header: "Tienda(s)",
  },
  {
    accessorKey: "previousStock",
    header: "Stock Anterior",
  },
  {
    accessorKey: "stockChange",
    header: "Cambio",
    cell: ({ row }) => (
      <span
        className={cn(
          row.original.stockChange > 0 ? "text-green-600" : "text-red-600"
        )}
      >
        {row.original.stockChange > 0
          ? `+${row.original.stockChange}`
          : row.original.stockChange}
      </span>
    ),
  },
  {
    accessorKey: "newStock",
    header: "Stock Actual",
  },
];