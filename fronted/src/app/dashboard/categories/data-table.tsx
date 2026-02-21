"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"
import { DataTablePagination, ManualPagination } from "../../../components/data-table-pagination"

import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { deleteCategories } from "./categories.api"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Cross2Icon, TrashIcon } from "@radix-ui/react-icons"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { DeleteActionsGuard } from "@/components/delete-actions-guard"
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react"
import { CategoriesGallery } from "./categories-gallery"

type ViewMode = "table" | "gallery"
const VIEW_MODE_KEY = "categories-view-mode"


interface DataTableProps<TData extends {id:string, createdAt:Date, name:string, description:string, status:string}, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData extends {id:string, createdAt:Date, name:string, description:string, status:string}, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

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

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrar los datos según búsqueda y rango de fechas (aplica a AMBAS vistas)
  const filteredData = useMemo(() => {
    let result = data;

    // Filtro por nombre
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) =>
        item.name.toLowerCase().includes(query)
      );
    }

    // Filtro por rango de fechas
    if (selectedDateRange?.from && selectedDateRange?.to) {
      const from = new Date(selectedDateRange.from);
      const to = new Date(selectedDateRange.to);
      result = result.filter((item) => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= from && itemDate <= to;
      });
    }

    return result;
  }, [data, searchQuery, selectedDateRange]);

  const handleDateSelect = (range: DateRange | undefined) => {
      setSelectedDateRange(range);
      setGalleryPage(1);
  };

  // Gallery paginated data
  const galleryTotalPages = Math.ceil(filteredData.length / galleryPageSize) || 1
  const galleryPaginatedData = useMemo(() => {
    const start = (galleryPage - 1) * galleryPageSize
    return filteredData.slice(start, start + galleryPageSize)
  }, [filteredData, galleryPage, galleryPageSize])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState({})

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination,
      columnVisibility,
    },
    onPaginationChange: setPagination,
  })

  // PARA EL MENSAJE DE ALERTA
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => row.original.id);

    if (selectedIds.length === 0) {
      alert('No hay filas seleccionadas');
      return;
    }

    try {
      await deleteCategories(selectedIds);
      toast.success("Categoría(s) eliminada correctamente.");
      table.resetRowSelection();
      location.reload();
    } catch (error:any) {
      toast.error(error.message || "No se pudo eliminar la() categoria porque esta relacionada con un producto");
    }
  };

  // FILTRO RESET

  const handleResetDateRange = () => {
    setSearchQuery("");
    table.getColumn("name")?.setFilterValue("");
    setSelectedDateRange(undefined);
    table.resetColumnFilters();
    table.resetRowSelection();
    setGalleryPage(1);
  };

    // Verificar si hay filtros activos
    const isFiltered =
    !!searchQuery.trim() ||
    !!selectedDateRange ||
    table.getState().columnFilters.length > 0;

  // Estado para manejar el doble click
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRowData, setSelectedRowData] = useState<TData | null>(null);

    const handleRowDoubleClick = (rowData: TData) => {
      setSelectedRowData(rowData);
      setIsModalOpen(true);
    };

  // Mapa de traducción para los nombres de las columnas
  const columnLabels: Record<string, string> = {
    name: "Nombre",
    createdAt: "Fecha de Creación",
    description: "Descripción",
    status: "Estado",
  };

  return (
    <div>
      {/* ── Filters toolbar ─────────────────────────── */}
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 mb-4">
        {/* Search — full width on mobile */}
        <div className="w-full sm:w-auto sm:min-w-[220px] sm:flex-1 sm:max-w-xs">
          <Input
            placeholder="Filtrar por nombre de Categoría..."
            value={searchQuery}
            onChange={(event) => {
              const value = event.target.value;
              setSearchQuery(value);
              table.getColumn("name")?.setFilterValue(value);
              setGalleryPage(1);
            }}
            className="h-9 w-full"
          />
        </div>

        {/* Date range + view toggle — same row on mobile */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="min-w-0 flex-1 sm:flex-none">
            <CalendarDatePicker
              className="h-9 w-full sm:w-[300px]"
              variant="outline"
              date={selectedDateRange || { from: undefined, to: undefined }}
              onDateSelect={handleDateSelect}
            />
          </div>

          {/* View toggle */}
          <div className="flex shrink-0 rounded-lg border p-0.5">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleViewChange("table")}
              title="Vista de tabla"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "gallery" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleViewChange("gallery")}
              title="Vista de galería"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Column visibility: icon-only on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 sm:hidden" title="Columnas visibles">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-48">
              <div className="px-4 py-2 text-sm font-medium border-b text-center">Columnas</div>
              {table.getAllColumns().filter((column) => column.getCanHide() && column.id !== "actions").map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {columnLabels[column.id] || column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={handleResetDateRange}
              className="h-9 shrink-0 px-2"
            >
              <Cross2Icon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>

        {/* Vistas: text button on desktop only */}
        <div className="hidden sm:flex sm:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Vistas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-48">
              <div className="px-4 py-2 text-sm font-medium border-b text-center">Columnas</div>
              {table.getAllColumns().filter((column) => column.getCanHide() && column.id !== "actions").map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {columnLabels[column.id] || column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Aquí agregamos el contador de datos */}
      <div className="py-2 px-4 flex items-center space-x-4">
          <label className="text-sm text-muted-foreground">
            Total de datos: {table.getRowModel().rows.length}
          </label>
          <label className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} de{" "}
            {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
          </label>
          {/* Mostrar el botón solo si hay filas seleccionadas */}
          <DeleteActionsGuard>
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-red-500 hover:bg-red-600 text-white cursor-pointer
              text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-4"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0}
              >
                Eliminar seleccionado(s) ({table.getFilteredSelectedRowModel().rows.length})
                <TrashIcon className="size-6" aria-hidden="true" />
              </Button>
            )}
          </DeleteActionsGuard>

          {/* AlertDialog fuera del DropdownMenu */}
          <DeleteActionsGuard>
            <AlertDialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setIsDialogOpen(false);
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente el/los producto(s).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setIsDialogOpen(false);
                    }}
                  >
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await handleDeleteSelected();
                      setIsDialogOpen(false);
                    }}
                  >
                    Continuar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DeleteActionsGuard>

      </div>

      {viewMode === "table" ? (
        <>
          <div className="rounded-md border px-4">
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
                      onDoubleClick={() => handleRowDoubleClick(row.original)}
                    >
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
                      No hay Datos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Modal para mostrar detalles */}
            {isModalOpen && selectedRowData && (
                <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Detalles de la Categoría</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                    </AlertDialogDescription>
                      <span className="block space-y-2">
                        <div><strong>Nombre:</strong> {selectedRowData.name}</div>
                        <div><strong>Descripción:</strong> {selectedRowData.description}</div>
                        <div><strong>Estado:</strong> {selectedRowData.status}</div>
                        <div><strong>Fecha de Creación:</strong> {new Date(selectedRowData.createdAt).toLocaleDateString()}</div>
                      </span>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setIsModalOpen(false)}>Cerrar</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
          </div>

          <div className="py-4">
            <DataTablePagination table={table} />
          </div>
        </>
      ) : (
        /* ── Gallery view ─────────────────────────── */
        <div className="px-4">
          <CategoriesGallery data={galleryPaginatedData as any} />
          <div className="py-4">
            <ManualPagination
              currentPage={galleryPage}
              totalPages={galleryTotalPages}
              pageSize={galleryPageSize}
              totalItems={filteredData.length}
              onPageChange={setGalleryPage}
              onPageSizeChange={setGalleryPageSize}
              pageSizeOptions={[12, 24, 48]}
            />
          </div>
        </div>
      )}

    </div>

  )
}
