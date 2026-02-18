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
    FilterFn,
  } from "@tanstack/react-table"
import React, { useEffect, useMemo, useState } from "react";
import InventoryModal from "./data-table-components/InventoryModal";
import { DataTablePagination } from "@/components/data-table-pagination";
import TransferModal from "./data-table-components/TransferModal";
import { useDebounce } from "@/app/hooks/useDebounce";
import { useRouter, useSearchParams } from "next/navigation";
import OutOfStockDialog from "./data-table-components/OutOfStockDialog";
import { BookOpenIcon, FilterIcon, StoreIcon } from "lucide-react";
import { getCategoriesFromInventory, getAllStores } from "./inventory.api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSiteSettings } from "@/context/site-settings-context"
import { useAuth } from "@/context/auth-context"


interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    inStockOnly?: boolean
  }

const globalFilterFn: FilterFn<any> = (row, _columnId, filterValue) => {
  const search = String(filterValue).toLowerCase();
  const name = row.original?.product?.name?.toLowerCase() || "";
  const serials: string[] = Array.isArray(row.original?.serialNumbers)
    ? row.original.serialNumbers
    : [];
  return (
    name.includes(search) ||
    serials.some((sn) => sn.toLowerCase().includes(search))
  );
};

  export function DataTable<TData extends{id:string}, TValue>({
    columns,
    data,
    inStockOnly = false,
  }: DataTableProps<TData, TValue>) {
    // ROUTER PARA MANEJAR LA NAVEGACION
    const router = useRouter();
    const searchParams = useSearchParams();

    // ESTADO PARA MANEJAR EL MODAL DE PRODUCTOS SIN STOCK
    const [isOutOfStockDialogOpen, setIsOutOfStockDialogOpen] = useState(false);

    // Abrir el modal de productos sin stock si viene por query param
    useEffect(() => {
      const open = searchParams?.get('outOfStock');
      if (open && (open === '1' || open.toLowerCase() === 'true')) {
        setIsOutOfStockDialogOpen(true);
      }
    }, [searchParams]);

    const { settings } = useSiteSettings()
    const { role } = useAuth()
    const normalizedRole = role ? role.toUpperCase() : null
    const canViewCosts =
      normalizedRole === "SUPER_ADMIN_GLOBAL" ||
      normalizedRole === "SUPER_ADMIN_ORG" ||
      normalizedRole === "ADMIN"
    const hidePurchaseCost = (settings.permissions?.hidePurchaseCost ?? false) && !canViewCosts
    const effectiveColumns = useMemo(() => {
      if (!hidePurchaseCost) {
        return columns
      }
      return columns.filter((column) => {
        const accessorKey =
          typeof (column as { accessorKey?: string | number }).accessorKey === "string"
            ? ((column as { accessorKey?: string | number }).accessorKey as string)
            : undefined
        if (accessorKey === "lowestPurchasePrice" || accessorKey === "highestPurchasePrice") {
          return false
        }
        return true
      })
    }, [columns, hidePurchaseCost])

    // ESTADO PARA MANEJAR FILTROS DE LA COLUMNA
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([
      { id: "createdAt", desc: true },
    ])
    const [columnVisibility, setColumnVisibility] = React.useState<{[key:string]: boolean}>({
      serialNumbers: false,
    })

    // ESTADO PARA MANEJAR LOS MODALS
    const [isModalOpen, setIsModalOpen] = React.useState(false); // Estado del modal
    const [selectedProduct, setSelectedProduct] = React.useState<TData | null>(null); // Producto seleccionado
    const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);

    // ESTADO PARA MANEJAR EL FILTRO DE CATEGORIAS
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

    // ESTADO PARA MANEJAR EL FILTRO DE TIENDAS
    const [selectedStore, setSelectedStore] = useState('all');
    const [storeOptions, setStoreOptions] = useState<{id:number; name:string}[]>([]);

    const [globalFilter, setGlobalFilter] = useState("")
    const debouncedGlobalFilter = useDebounce(globalFilter, 600)
    //

    // ESTADOS DE LA TABLA
    const filteredData = React.useMemo(() => {
      if (selectedStore === 'all') return data;
      return data
        .map((item: any) => {
          const storeData = item.storeOnInventory.find(
            (s: any) => String(s.store.id) === selectedStore
          );
          if (!storeData) return null;
          if (inStockOnly && storeData.stock <= 0) return null;
          return { ...item, stock: storeData.stock };
        })
        .filter(Boolean) as TData[];
    }, [data, selectedStore, inStockOnly]);

    const table = useReactTable({
      data: filteredData,
      columns: effectiveColumns,
        globalFilterFn,
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setGlobalFilter,
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            columnFilters,
            sorting,
            columnVisibility,
            globalFilter: debouncedGlobalFilter,
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

    const totalSelectedRows = Object.keys(globalRowSelection).length;
    //

  // Cargar las categorÃ­as desde el backend
  useEffect(() => {
    async function loadCategories() {
      try {
        const categories = await getCategoriesFromInventory();
        setCategoryOptions(Array.isArray(categories) ? categories : []);
      } catch (error) {
        console.error('Error al cargar las categorías:', error);
        setCategoryOptions([]);
      }
    }
    async function loadStores() {
      try {
        const stores = await getAllStores();
        setStoreOptions(Array.isArray(stores) ? stores : []);
      } catch (error) {
        console.error('Error al cargar las tiendas:', error);
        setStoreOptions([]);
      }
    }
    loadCategories();
    loadStores();
  }, []);
  
  // Actualiza el filtro cuando cambia la categoría
  useEffect(() => {
    table.getColumn("product.category")?.setFilterValue(
      selectedCategory === "all" ? undefined : selectedCategory
    );
  }, [selectedCategory, table])
  //


return (
    <div className="flex w-full max-w-full flex-col gap-4">
        <div className="flex w-full flex-wrap items-center gap-4 py-4">
          <Input
            placeholder="Filtrar por producto o serie..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full sm:max-w-sm"
          />

          <div className="w-full sm:w-[250px]">
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
                    Todas las categorias
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

          <div className="w-full sm:w-[250px]">
            <Select
              value={selectedStore}
              onValueChange={(value) => setSelectedStore(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <StoreIcon className="w-4 h-4" />
                    Todas las tiendas
                  </div>
                </SelectItem>
                {storeOptions.map((store) => (
                  <SelectItem key={store.id} value={String(store.id)}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full justify-between sm:w-auto sm:items-center">
            <Button
              className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
              onClick={() => setIsOutOfStockDialogOpen(true)}
            >
              Ver Productos Sin Stock
              <BookOpenIcon className="h-6 w-6" />
            </Button>  
            {/* Otros componentes de la pÃ¡gina */}
            <OutOfStockDialog
              isOpen={isOutOfStockDialogOpen}
              onClose={() => setIsOutOfStockDialogOpen(false)}
            />
          </div>
          <div className="flex w-full justify-between sm:w-auto sm:items-center">
            <Button
            className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
            onClick={() => router.push("/dashboard/inventory/products-by-store")}
            >
              Ver Productos por Tienda
              <StoreIcon className="h-6 w-6" />
            </Button>
          </div>            
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <label>
                Total de datos: {table.getRowModel().rows.length}
                </label>
                <label className="pb-2 sm:pb-0">
                {totalSelectedRows} de{" "}
                {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
            </label>
        </div>
        <div className="table-scroll w-full overflow-x-auto rounded-md border">
        <Table className="min-w-[900px]">
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
                    onDoubleClick={() => router.push(`/dashboard/inventory/product-details/${(row.original as any).id}`)}
                    className="cursor-pointer"
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
                        router.push(`/dashboard/inventory/product-details/${row.original.id}`); // Redirigir a la nueva pÃ¡gina
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
