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
    getSortedRowModel,
    SortingState,
    useReactTable,
  } from "@tanstack/react-table"
import React, { useEffect, useState } from "react";
import InventoryModal from "./data-table-components/InventoryModal";
import { DataTablePagination } from "@/components/data-table-pagination";
import TransferModal from "./data-table-components/TransferModal";
import { useDebounce } from "@/app/hooks/useDebounce";
import { useRouter } from "next/navigation";
import OutOfStockDialog from "./data-table-components/OutOfStockDialog";
import { BookOpenIcon, FilterIcon, StoreIcon } from "lucide-react";
import { getCategoriesFromInventory } from "./inventory.api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
  }
   
  export function DataTable<TData extends{id:string}, TValue>({
    columns,
    data,
  }: DataTableProps<TData, TValue>) {
    // ROUTER PARA MANEJAR LA NAVEGACION
    const router = useRouter();

    // ESTADO PARA MANEJAR EL MODAL DE PRODUCTOS SIN STOCK
    const [isOutOfStockDialogOpen, setIsOutOfStockDialogOpen] = useState(false);

    // ESTADO PARA MANEJAR FILTROS DE LA COLUMNA
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([
      { id: "createdAt", desc: true },
    ])

    // ESTADO PARA MANEJAR LOS MODALS
    const [isModalOpen, setIsModalOpen] = React.useState(false); // Estado del modal
    const [selectedProduct, setSelectedProduct] = React.useState<TData | null>(null); // Producto seleccionado
    const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);

    // ESTADO PARA MANEJAR EL FILTRO DE CATEGORIAS
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    //
 
    // ESTADOS DE LA TABLA
    const table = useReactTable({
        data,
        columns,
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting,
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            columnFilters,
            sorting,
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

  const [inputValue, setInputValue] = useState("")
  // Aplica el debounce con 600ms
  const debouncedValue = useDebounce(inputValue, 600)

  // Cargar las categorías desde el backend
  useEffect(() => {
    async function loadCategories() {
      const products = await getCategoriesFromInventory();
      const categories = Array.from(new Set(products.map((product:any) => product.product.category))); // Extraer categorías únicas
      setCategoryOptions(categories);
    }
    loadCategories();
  }, []);
  
  // Actualiza el filtro cuando cambia el valor debounced
  useEffect(() => {
    table.getColumn("product_name")?.setFilterValue(debouncedValue);
    table.getColumn("product.category")?.setFilterValue(
      selectedCategory === "all" ? undefined : selectedCategory
    );
  }, [debouncedValue, selectedCategory, table])
  //


return (
    <div className="gap-2">
        <div className="flex items-center gap-4 py-4 flex-wrap">
          <Input
            placeholder="Filtrar por producto..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            className="max-w-sm"
          />

          <div className="w-[250px]">
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                  <FilterIcon className="w-4 h-4" />
                  Todas las categorías
                </div>
              </SelectItem>
              {categoryOptions.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
          <div className="flex justify-between items-center">
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setIsOutOfStockDialogOpen(true)}
            >
              Ver Productos Sin Stock
              <BookOpenIcon className="h-6 w-6" />
            </Button>           
            {/* Otros componentes de la página */}
            <OutOfStockDialog
              isOpen={isOutOfStockDialogOpen}
              onClose={() => setIsOutOfStockDialogOpen(false)}
            />
          </div>
          <div className="flex justify-between items-center">
            <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => router.push("/dashboard/inventory/products-by-store")}
            >
              Ver Productos por Tienda
              <StoreIcon className="h-6 w-6" />
            </Button>
          </div>            
        </div>
        <div className="gap-2">
            <label className="text-sm text-muted-foreground">
                Total de datos: {table.getRowModel().rows.length}
                </label>
                <label className="text-sm text-muted-foreground pb-2 sm:pb-0">
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
                        router.push(`/dashboard/inventory/product-details/${row.original.id}`); // Redirigir a la nueva página
                      }}
                    >
                      Ver Informacion
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