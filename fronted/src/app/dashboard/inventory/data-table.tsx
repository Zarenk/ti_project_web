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
import { DataTablePagination, ManualPagination } from "@/components/data-table-pagination";
import TransferModal from "./data-table-components/TransferModal";
import { useDebounce } from "@/app/hooks/useDebounce";
import { useRouter } from "next/navigation";
import { FilterIcon, StoreIcon, LayoutGrid, List } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSiteSettings } from "@/context/site-settings-context"
import { useAuth } from "@/context/auth-context"
import { InventoryGallery } from "./inventory-gallery"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type ViewMode = "table" | "gallery"
const VIEW_MODE_KEY = "inventory-view-mode"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    inStockOnly?: boolean
    // Lifted filter state
    globalFilter: string
    onGlobalFilterChange: (value: string) => void
    selectedCategory: string
    onCategoryChange: (value: string) => void
    categoryOptions: string[]
    selectedStore: string
    onStoreChange: (value: string) => void
    storeOptions: { id: number; name: string }[]
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
    globalFilter,
    onGlobalFilterChange,
    selectedCategory,
    onCategoryChange,
    categoryOptions,
    selectedStore,
    onStoreChange,
    storeOptions,
  }: DataTableProps<TData, TValue>) {
    const router = useRouter();

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

    // View mode: table or gallery
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
      if (typeof window === "undefined") return "table"
      return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || "table"
    })
    const handleViewChange = (mode: ViewMode) => {
      setViewMode(mode)
      localStorage.setItem(VIEW_MODE_KEY, mode)
      setGalleryPage(1)
    }

    // Gallery pagination
    const [galleryPage, setGalleryPage] = useState(1)
    const [galleryPageSize, setGalleryPageSize] = useState(12)

    // ESTADO PARA MANEJAR FILTROS DE LA COLUMNA
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([
      { id: "createdAt", desc: true },
    ])
    const [columnVisibility, setColumnVisibility] = React.useState<{[key:string]: boolean}>({
      serialNumbers: false,
    })

    // ESTADO PARA MANEJAR LOS MODALS
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedProduct, setSelectedProduct] = React.useState<TData | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);

    const debouncedGlobalFilter = useDebounce(globalFilter, 600)

    // ESTADOS DE LA TABLA — filtered by store
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
        onGlobalFilterChange: onGlobalFilterChange,
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

    // Gallery data — apply same filters as table (search + category)
    const galleryData = useMemo(() => {
      let result = filteredData as any[];

      const searchTerm = debouncedGlobalFilter.toLowerCase();
      if (searchTerm) {
        result = result.filter((item: any) => {
          const name = item.product?.name?.toLowerCase() || "";
          const serials: string[] = Array.isArray(item.serialNumbers) ? item.serialNumbers : [];
          return name.includes(searchTerm) || serials.some((sn: string) => sn.toLowerCase().includes(searchTerm));
        });
      }

      if (selectedCategory !== 'all') {
        result = result.filter((item: any) => item.product?.category === selectedCategory);
      }

      return result;
    }, [filteredData, debouncedGlobalFilter, selectedCategory]);

    // Gallery pagination
    const galleryTotalPages = Math.ceil(galleryData.length / galleryPageSize) || 1
    const galleryPaginatedData = useMemo(() => {
      const start = (galleryPage - 1) * galleryPageSize
      return galleryData.slice(start, start + galleryPageSize)
    }, [galleryData, galleryPage, galleryPageSize])

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

  // Sync category filter with table column
  useEffect(() => {
    table.getColumn("product.category")?.setFilterValue(
      selectedCategory === "all" ? undefined : selectedCategory
    );
  }, [selectedCategory, table])

  // Reset gallery page when filters change
  useEffect(() => {
    setGalleryPage(1);
  }, [globalFilter, selectedCategory, selectedStore])


return (
    <div className="flex w-full max-w-full flex-col gap-3">
        {/* ── Filters toolbar (hidden on lg+ where page.tsx renders them inline) ─── */}
        <div className="flex flex-col gap-2 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:hidden">
          {/* Search input */}
          <div className="w-full sm:max-w-xs">
            <Input
              placeholder="Filtrar por producto o serie..."
              value={globalFilter}
              onChange={(event) => onGlobalFilterChange(event.target.value)}
              className="h-8 w-full text-xs"
            />
          </div>

          {/* Category + Store selects */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select
              value={selectedCategory}
              onValueChange={onCategoryChange}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <FilterIcon className="w-3.5 h-3.5" />
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

            <Select
              value={selectedStore}
              onValueChange={onStoreChange}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]">
                <SelectValue placeholder="Tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <StoreIcon className="w-3.5 h-3.5" />
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
        </div>

        {/* Data counters + view toggle */}
        <div className="flex flex-wrap items-center gap-2 pt-4 text-xs text-muted-foreground">
            <label>
                Total: {viewMode === "table" ? table.getRowModel().rows.length : galleryData.length}
            </label>
            <label>
                {totalSelectedRows} de{" "}
                {table.getFilteredRowModel().rows.length} seleccionadas.
            </label>

            {/* View toggle */}
            <TooltipProvider delayDuration={300}>
              <div className="ml-auto flex shrink-0 rounded-lg border p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "table" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleViewChange("table")}
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Vista de tabla</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "gallery" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleViewChange("gallery")}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Vista de galería</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
        </div>

        {viewMode === "table" ? (
          <>
            {/* Table */}
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
                            setSelectedProduct(row.original);
                            router.push(`/dashboard/inventory/product-details/${row.original.id}`);
                          }}
                        >
                          Ver Informacion
                        </Button>
                        <Button
                        className="bg-green-800 hover:bg-green-900 text-white px-2 py-1 rounded ml-2"
                        onClick={() => {
                        setSelectedProduct(row.original);
                        setIsTransferModalOpen(true);
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
          </>
        ) : (
          /* ── Gallery view ─────────────────────────── */
          <div>
            <InventoryGallery
              data={galleryPaginatedData as any}
              onTransferProduct={(item) => {
                setSelectedProduct(item as any);
                setIsTransferModalOpen(true);
              }}
            />
            <div className="py-4">
              <ManualPagination
                currentPage={galleryPage}
                totalPages={galleryTotalPages}
                pageSize={galleryPageSize}
                totalItems={galleryData.length}
                onPageChange={setGalleryPage}
                onPageSizeChange={setGalleryPageSize}
                pageSizeOptions={[12, 24, 48]}
              />
            </div>
          </div>
        )}

        {/* Usar el componente InventoryModal */}
        <InventoryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            product={selectedProduct as any}
        />
        <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        product={selectedProduct as any}
        />

    </div>
  );
}
