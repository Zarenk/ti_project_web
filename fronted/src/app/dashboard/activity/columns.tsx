"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";

export type Activity = {
  id: number | string;
  type: 'order' | 'sale' | 'entry' | 'alert';
  description: string;
  createdAt: string;
  href: string;
};

export const columns: ColumnDef<Activity>[] = [
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      const t = row.original.type;
      switch (t) {
        case 'order':
          return 'Orden';
        case 'sale':
          return 'Venta';
        case 'entry':
          return 'Entrada';
        case 'alert':
          return 'Alerta';
        default:
          return t;
      }
    },
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => (
      <Link href={row.original.href} className="text-blue-600 hover:underline">
        {row.original.description}
      </Link>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm"),
  },
];