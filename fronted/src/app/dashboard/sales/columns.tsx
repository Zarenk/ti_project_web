"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export type Sale = {
  id: number;
  user: { username: string };
  store: { name: string };
  client: { name: string };
  total: number;
  description?: string;
  createdAt: string;
};

export const columns: ColumnDef<Sale>[] = [
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
    cell: ({ row }) => (
      <Button
        variant="outline"
        onClick={() => {
          console.log("Ver detalles de la venta:", row.original.id);
          // Aquí puedes redirigir a una página de detalles o realizar otra acción
        }}
      >
        Ver Detalles
      </Button>
    ),
  },
];