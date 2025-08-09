"use client"

import { useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTablePagination } from "@/components/data-table-pagination"
import { Skeleton } from "@/components/ui/skeleton"

export interface ActivityItem {
  id: number | string
  fecha: string
  tipo: string
  descripcion: string
  monto: number
}

interface ActivityTableProps {
  data: ActivityItem[]
  loading: boolean
}

export default function ActivityTable({ data, loading }: ActivityTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns: ColumnDef<ActivityItem>[] = [
    {
      accessorKey: "fecha",
      header: () => <span>Fecha</span>,
      cell: ({ row }) => new Date(row.original.fecha).toLocaleDateString("es-ES"),
    },
    {
      accessorKey: "tipo",
      header: () => <span>Tipo</span>,
    },
    {
      accessorKey: "descripcion",
      header: () => <span>Descripción</span>,
    },
    {
      accessorKey: "monto",
      header: () => <span className="float-right">Monto</span>,
      cell: ({ row }) => <div className="text-right">{row.original.monto.toFixed(2)}</div>,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={columns.length}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No hay movimientos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="py-4">
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}