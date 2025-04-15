"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
  } from "@tanstack/react-table"
import React from "react";
import InventoryModal from "./data-table-components/InventoryModal";
import { DataTablePagination } from "@/components/data-table-pagination";
import TransferModal from "./data-table-components/TransferModal";


interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
  }
   
  export function DataTable<TData, TValue>({
    columns,
    data,
  }: DataTableProps<TData, TValue>) {

    // ESTADO PARA MANEJAR FILTROS DE LA COLUMNA
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    // ESTADO PARA MANEJAR LOS MODALS
    const [isModalOpen, setIsModalOpen] = React.useState(false); // Estado del modal
    const [selectedProduct, setSelectedProduct] = React.useState<TData | null>(null); // Producto seleccionado
    const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
 
    // ESTADOS DE LA TABLA
    const table = useReactTable({
        data,
        columns,
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            columnFilters,
        },
      })

    // CONTADOR DE FILAS SELECCIONADAS PARA DATOS GLOBALES DEL DATATABLE
    const [globalRowSelection, setGlobalRowSelection] = React.useState({});
    const [rowSelection, setRowSelection] = React.useState({})

    React.useEffect(() => {
        setGlobalRowSelection((prev) => {
          const updatedSelection = { ...prev } as Record<string, boolean>;;
      
          // Agregar las nuevas selecciones
          Object.keys(rowSelection).forEach((key) => {
            if ((rowSelection as Record<string, any>)[key]) {
              updatedSelection[key] = true;
            }
          });
      
          // Eliminar las filas deseleccionadas
          Object.keys(prev).forEach((key) => {
            if (!(rowSelection as Record<string, any>)[key]) {
              delete updatedSelection[key];
            }
          });
      
          return updatedSelection;
        });
      }, [rowSelection]);

    const totalSelectedRows = 0//bject.keys(globalRowSelection).length;
    //

return (
    <div className="gap-2">
        <div className="flex items-center py-4">
            <Input
            placeholder="Filtrar por producto..."
            value={(table.getColumn("product_name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
                table.getColumn("product_name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
            />
        </div>
        <div className="gap-2">
            <label className="text-sm text-gray-600">
                Total de datos: {table.getRowModel().rows.length}
                </label>
                <label className="text-sm text-gray-600 pb-2 sm:pb-0">
                {totalSelectedRows} de{" "}
                {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
            </label>
        </div>
        <div className="rounded-md border">
        <Table>
            <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                    return (
                    <TableHead key={header.id}>
                        {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                            )}
                    </TableHead>
                    )
                })}
                </TableRow>
            ))}
            </TableHeader>
            <TableBody>
            {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                >
                    {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                    ))}
                    <TableCell>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                      onClick={() => {
                        setSelectedProduct(row.original); // Establecer el producto seleccionado
                        setIsModalOpen(true); // Abrir el modal
                      }}
                    >
                      Ver Tiendas
                    </Button>
                    <Button
                    className="bg-green-800 hover:bg-green-900 text-white px-2 py-1 rounded ml-2"
                    onClick={() => {
                    setSelectedProduct(row.original); // Establecer el producto seleccionado
                    setIsTransferModalOpen(true); // Abrir el modal de Transferencia
                    }}
                    >
                    Transferir
                    </Button>
                  </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>

        <div className="py-4">
              <DataTablePagination table={table} />
        </div>

        {/* Usar el componente InventoryModal */}
        <InventoryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            product={selectedProduct as any} // Pasar el producto seleccionado
        />
        <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        product={selectedProduct as any}
        />

    </div>
  );
}