"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type Activity = {
  id: string;
  username: string;
  action: string;
  entityType: string | null;
  summary: string | null;
  createdAt: string;
};

export const activityColumns: ColumnDef<Activity>[] = [
  {
    accessorKey: "username",
    header: "Usuario",
  },
  {
    accessorKey: "action",
    header: "Acción",
  },
  {
    accessorKey: "entityType",
    header: "Entidad",
  },
  {
    accessorKey: "summary",
    header: "Resumen",
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => (
      <span>{format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm")}</span>
    ),
  },
];