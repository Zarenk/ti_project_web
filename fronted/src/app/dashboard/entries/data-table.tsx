"use client"
 
import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState
} from "@tanstack/react-table"
 
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DataTablePagination } from "../../../components/data-table-pagination"

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { DateRange } from "react-day-picker"; // Asegúrate de que este tipo esté disponible
import { CalendarDatePicker } from "@/components/calendar-date-picker";

import { Cross2Icon, TrashIcon } from "@radix-ui/react-icons"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ChevronDown, EyeIcon, FileText, PrinterIcon, SlidersHorizontal, Store, User, Calendar, DollarSign, Package, CheckCircle, MapPin, X, Hash } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { DataTableToolbar } from "./data-table-components/data-table-toolbar"
import { deleteEntries, getPdfGuiaUrl, getPdfUrl } from "./entries.api"
import { DeleteActionsGuard } from "@/components/delete-actions-guard"
import { getColumns } from "./columns"
 
interface DataTableProps<TData extends {
id:string,
createdAt:Date,
status?:string,
store_name:string,
provider_name:string,
user_username:string,
date:Date,
tipoMoneda:string,
description:string,
pdfUrl: string,
guiaUrl: string,
details: { product_name: string; quantity: number; price: number; series?: string[]; category_name?: string }[];
}, TValue> {
  data: TData[]
  initialEntryId?: string | null
}

export function DataTable<TData extends {
id:string,
createdAt:Date,
status?:string,
store_name:string,
provider_name:string,
user_username:string,
date:Date,
tipoMoneda:string,
description:string,
pdfUrl: string,
guiaUrl: string,
details: { product_name: string; quantity: number; price: number; series?: string[]; category_name?: string }[];
}, TValue>({
  data,
  initialEntryId,
}: DataTableProps<TData, TValue>) {
  const queryClient = useQueryClient();
  const { selection } = useTenantSelection();
  const invalidateEntries = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.entries.root(selection.orgId, selection.companyId),
    });

  const [columnVisibility, setColumnVisibility] =
  React.useState<VisibilityState>({})

  // Callback para abrir el modal individual mejorado
  const handleViewEntry = (rowData: TData) => {
    setSelectedRowData(rowData);
    setIsModalOpen(true);
  };

  // Generar las columnas con el callback
  const columns = useMemo(() => getColumns(handleViewEntry), []);

  // Ordenar los datos por la fecha de creación en orden descendente
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data]);
  
  // Filtrar los datos según el rango de fechas seleccionado
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      return sortedData; // Si no hay rango seleccionado, mostrar todos los datos
    }

    const from = new Date(selectedDateRange.from);
    const to = new Date(selectedDateRange.to);

    return sortedData.filter((item) => {
      const itemDate = new Date(item.createdAt); // Asegúrate de que `item.date` sea una fecha válida
      return itemDate >= from && itemDate <= to;
    });
  }, [data, selectedDateRange]);
  
  const handleDateSelect = (range: DateRange | undefined) => {
      setSelectedDateRange(range);
  };
  //

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState({})

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // DATATABLE ACCIONES
  const table = useReactTable({
    data: filteredData,
    columns,
    getRowId: (row) => row.id, // Usa el campo `id` como identificador único
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(), // Habilita el cálculo de facetas
    getFacetedUniqueValues: getFacetedUniqueValues(), // Habilita valores únicos
    getPaginationRowModel: getPaginationRowModel(), // Habilitar paginación
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
    onPaginationChange: setPagination, // ACTUALIZA EL ESTADO DE PAGINACION
  })
  //

  // CONTADOR DE FILAS SELECCIONADAS PARA DATOS GLOBALES DEL DATATABLE
  const [globalRowSelection, setGlobalRowSelection] = React.useState({});

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

  // Estado para manejar el doble click
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<TData | null>(null);

  const handleRowDoubleClick = (rowData: TData) => {
    setSelectedRowData(rowData);
    setIsModalOpen(true);
  };

  // Auto-open entry detail when navigating with ?entryId=X
  const deepLinkHandled = React.useRef(false);
  React.useEffect(() => {
    if (!initialEntryId || deepLinkHandled.current || data.length === 0) return;
    const match = data.find((d) => String(d.id) === initialEntryId);
    if (match) {
      deepLinkHandled.current = true;
      setSelectedRowData(match);
      setIsModalOpen(true);
      window.history.replaceState(null, "", "/dashboard/entries");
    }
  }, [initialEntryId, data]);

  // PARA EL MENSAJE DE ALERTA DE ELIMINAR
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDeleteSelected = async () => {
    //const selectedRows = table.getFilteredSelectedRowModel().rows; // PARA SOLO LOS DATOS QUE APAREZCAN EN DATATABLE
    const selectedIds = Object.keys(globalRowSelection).map((id) => Number(id));; // Obtén los IDs de las filas seleccionadas

    if (selectedIds.length === 0) {
      alert('No hay filas seleccionadas');
      return;
    }

    console.log("IDs seleccionados para eliminar:", selectedIds);

    try {
      await deleteEntries(selectedIds); // Llama a la API para eliminar los productos
      //alert('Productos eliminados correctamente');
      toast.success("Registro(s) eliminado(s) correctamente."); // Notificación de éxito
      table.resetRowSelection(); // Limpia la selección después de eliminar
      invalidateEntries(); // Refresca datos via React Query
    } catch (error: any) {
      console.error("Error al eliminar los registros:", error)
      toast.error(error.message || "No se pudieron eliminar los registros...");
    }

    setIsDialogOpen(false); // Cierra el diálogo

  };
  //

  // FILTRO RESET

    const handleResetDateRange = () => {
    // Restablecer el filtro de búsqueda
    table.getColumn("user_username")?.setFilterValue(""); // Limpia el filtro de la columna "name" 
    setSelectedDateRange(undefined); // Restablece el rango de fechas  
    // Restablecer los filtros de la tabla
    table.resetColumnFilters();
    table.resetRowSelection();
    }; 
    // Verificar si hay filtros activos
    const isFiltered =
    !!table.getColumn("user_username")?.getFilterValue() || // Filtro de búsqueda
    !!selectedDateRange || // Rango de fechas
    table.getState().columnFilters.length > 0; // Filtros de columnas

    const activeFilterCount = (() => {
      let count = 0;
      if (table.getColumn("user_username")?.getFilterValue()) count++;
      if (selectedDateRange) count++;
      // Faceted filters (usuario, proveedor, tienda) from toolbar
      count += table.getState().columnFilters.filter(f => f.id !== "user_username").length;
      return count;
    })();
  //

  // Mapa de traducción para los nombres de las columnas
  const columnLabels: Record<string, string> = {
    createdAt: "Fecha de Creación",
    user_username: "Usuario",
    provider_name: "Proveedor",
    store_name: "Tienda",
    // Agrega más columnas según sea necesario
  };

  // IMPRESION
  const handlePrintSelected = () => {
    // Obtener los IDs seleccionados desde globalRowSelection
    const selectedIds = Object.keys(globalRowSelection);

    // Filtrar los datos originales para incluir solo las filas seleccionadas
    const selectedData = data.filter((item) => selectedIds.includes(String(item.id)));
    console.log("Datos seleccionados para imprimir:", selectedData); // Verificar si las series están presentes

    if (selectedData.length === 0) {
      alert("No hay filas seleccionadas para imprimir.");
      return;
    }
  
    // Crear una nueva ventana
    const printWindow = window.open("about:blank", "Reporte de Productos Seleccionados", "width=800,height=600");
  
    if (printWindow) {
      // Generar el contenido HTML para imprimir
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reporte de Entradas Seleccionadas</title>
          <style>
            body {
              margin: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 10px; /* Tamaño de texto de la tabla */
            }
            th, td {
              word-wrap: break-word;
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f4f4f4;
              font-size: 11px; /* Tamaño de texto de los encabezados */
            }
            h1, h2 {
              text-align: center;
            }
            .entry-section {
              margin-bottom: 40px;
            }
          </style>
        </head>
        <body>
          <h1>Reporte de Entradas Seleccionadas</h1>
          <p>Fecha de impresión: ${new Date().toLocaleDateString()}</p>
          ${selectedData
            .map(
              (entry) => `
              <div class="entry-section">
                <h2>Impresion de Registro de Inventario</h2>
                <h3>Información General</h3>
                <table>
                  <tr>
                    <th>ID de la impresion</th>
                    <td>${entry.id}</td>
                  </tr>
                  <tr>
                    <th>Fecha</th>
                    <td>${new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th>Tienda</th>
                    <td>${entry.store_name}</td>
                  </tr>
                  <tr>
                    <th>Proveedor</th>
                    <td>${entry.provider_name}</td>
                  </tr>
                  <tr>
                    <th>Usuario</th>
                    <td>${entry.user_username}</td>
                  </tr>
                </table>

                <h3>Detalles de Productos</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Series</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${entry.details
                      .map(
                        (detail: any) => `
                        <tr>
                          <td>${detail.product_name || "Sin nombre"}</td>
                          <td>${detail.quantity || 0}</td>
                          <td>${detail.price ? detail.price.toFixed(2) : "0.00"}</td>
                          <td>
                              ${
                               detail.series && detail.series.length > 0
                               ? detail.series.join(", ") // Mostrar las series separadas por comas
                               : "Sin series"
                              }
                          </td>                          
                        </tr>
                      `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            )
            .join("")}
          <footer style="text-align: center; margin-top: 20px;">
            <p>Generado por TI Sistema 2025 - TACNA - PERÚ</p>
          </footer>
        </body>
      </html>
    `;
  
      // Escribir el contenido en la nueva ventana
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
  
      // Esperar a que la ventana cargue completamente antes de imprimir
      printWindow.onload = () => {
        printWindow.focus(); // Asegúrate de que la ventana esté en foco
        printWindow.print();
        printWindow.close(); // Opcional: Cerrar la ventana después de imprimir
    };
    }
  };
  //

   // MODAL DE VISUALIZACION MASIVA
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedRowsDataVisual, setSelectedRowsDataVisual] = useState<TData[]>([]); // Almacena los datos seleccionados
    const handleViewSelected = () => {
      const selectedData = data.filter((item) =>
        Object.keys(globalRowSelection).includes(String(item.id))
      );
      setSelectedRowsDataVisual(selectedData); // Guarda los datos seleccionados
      setIsViewModalOpen(true); // Abre el modal
    };
    //


  return (
    <div>
          <div className="flex flex-col gap-3 px-4 mb-6">

            {/* ── Mobile: compact search + filter toggle ── */}
            <div className="flex gap-2 sm:hidden w-full min-w-0">
              <Input
                placeholder="Filtrar por usuario..."
                value={(table.getColumn("user_username")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("user_username")?.setFilterValue(event.target.value)
                }
                className="h-9 text-sm flex-1 min-w-0"
              />
              <Button
                variant={mobileFiltersOpen ? "secondary" : "outline"}
                size="sm"
                className="h-9 gap-1.5 cursor-pointer flex-shrink-0 relative"
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="text-xs">Filtros</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${mobileFiltersOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>

            {/* ── Mobile: collapsible filter panel ── */}
            <div
              className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
                mobileFiltersOpen
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-2 pt-1 pb-0.5">
                <CalendarDatePicker
                  className="h-9 w-full justify-between text-sm"
                  variant="outline"
                  date={selectedDateRange || { from: undefined, to: undefined }}
                  onDateSelect={handleDateSelect}
                />
                <DataTableToolbar table={table} />
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 cursor-pointer text-xs">
                        Vistas
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="w-48">
                      <div className="px-4 py-2 text-sm font-medium border-b text-center">Opciones</div>
                      {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide() && column.id !== "actions")
                        .map((column) => (
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
                      size="sm"
                      onClick={() => {
                        handleResetDateRange();
                        setMobileFiltersOpen(false);
                      }}
                      className="h-8 text-xs text-muted-foreground cursor-pointer"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Desktop: full filter row (unchanged) ── */}
            <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-between gap-4">
              <Input
                placeholder="Filtrar por nombre de Usuario..."
                value={(table.getColumn("user_username")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("user_username")?.setFilterValue(event.target.value)
                }
                className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="px-0 sm:px-2">
                <CalendarDatePicker
                  className="h-9 w-[300px]"
                  variant="outline"
                  date={selectedDateRange || { from: undefined, to: undefined }}
                  onDateSelect={handleDateSelect}
                />
              </div>
              <div className="px-0 sm:px-2">
                <DataTableToolbar table={table} />
              </div>
              {(totalSelectedRows > 0 || isFiltered) && (
                <div className="px-0 sm:px-2 self-start sm:self-auto">
                  <Button
                    variant="ghost"
                    onClick={handleResetDateRange}
                    className="h-8 px-2 lg:px-3 cursor-pointer"
                  >
                    Reset
                    <Cross2Icon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="sm:mt-0 sm:ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto cursor-pointer">
                      Vistas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    className="w-48 sm:w-48 sm:align-end"
                  >
                    <div className="px-4 py-2 text-sm font-medium border-b text-center">Opciones</div>
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide() && column.id !== "actions")
                      .map((column) => (
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

          </div>
      {/* Aquí agregamos el contador de datos */}
      <div className="py-2 px-4 flex flex-col sm:flex-row items-start sm:items-center space-x-4">
          <label className="text-sm text-muted-foreground">
            Total de datos: {table.getRowModel().rows.length}
          </label>
          <label className="text-sm text-muted-foreground pb-2 sm:pb-0">
            {totalSelectedRows} de{" "}
            {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
          </label>
          {/* Mostrar el botón solo si hay filas seleccionadas */}
            <>
            {totalSelectedRows > 0 && (
              <div className="flex flex-wrap gap-2">
              <Button
                key="button-1"
                onClick={() => setIsDialogOpen(true)}
                className="bg-red-500 hover:bg-red-600 text-white cursor-pointer
                text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-4"
                disabled={totalSelectedRows === 0}
                title="Eliminar seleccionado(s)" // Tooltip al pasar el mouse
                >          
                <span className="hidden md:inline">Eliminar Seleccionado(s)</span> ({totalSelectedRows})
                <TrashIcon className="size-6" aria-hidden="true" />
              </Button>

              <Button
                key="button-2"
                onClick={handlePrintSelected}
                className="bg-blue-900 hover:bg-blue-950 text-white cursor-pointer
                text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-4"
                disabled={totalSelectedRows === 0}
                title="Imprimir seleccionado(s)" // Tooltip al pasar el mouse
                >          
                <span className="hidden md:inline">Imprimir Seleccionado(s)</span> ({totalSelectedRows})
                <PrinterIcon className="size-6" aria-hidden="true" />
              </Button>

              <Button
                key="button-4"
                onClick={handleViewSelected}
                className="bg-green-900 hover:bg-green-950 text-white cursor-pointer
                text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-4"
                disabled={totalSelectedRows === 0}
                title="Visualizar seleccionado(s)" // Tooltip al pasar el mouse
                >          
                <span className="hidden md:inline">Visualizar Seleccionado(s)</span> ({totalSelectedRows})             
                <EyeIcon className="size-6" aria-hidden="true" />
              </Button>  
              </div>  
            )}
           </>

          {/* AlertDialog fuera del DropdownMenu */}
          <AlertDialog open={isDialogOpen} onOpenChange={(open) => {
            // Solo actualiza el estado si el usuario cierra el diálogo manualmente
            if (!open) {
              setIsDialogOpen(false);
            }
          }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente el/los producto(s).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  // Cierra el diálogo al hacer clic en "Cancelar"
                  setIsDialogOpen(false);
                }}>Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await handleDeleteSelected()
                    setIsDialogOpen(false)
                  }}
                >
                  Continuar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </div>

      <div className="rounded-md border px-2 lg:px-2 py-2 lg:py-2 xl:max-w-[1450px] lg:max-w-[1000px] md:max-w-[850px] sm:max-w-[700px] mx-auto">
        {/* Contenedor del DataTable con scroll horizontal */}
        <div className="overflow-x-auto rounded-md border">
        <Table className="table-auto w-full min-w-[600px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="text-left text-xs md:text-sm lg:text-base font-medium"
                      style={{
                        minWidth: header.id === "user_username" ? "130px" : header.id === "store_name" ? "110px" : "auto",
                        maxWidth: header.id === "provider_name" ? "220px" : header.id === "store_name" ? "160px" : header.id === "user_username" ? "160px" : "auto",
                      }}
                      >
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
                  className="hover:border-gray-800"
                  onClick={() => {
                    // On mobile (< 640px), single click opens detail
                    if (window.innerWidth < 640) handleRowDoubleClick(row.original);
                  }}
                  onDoubleClick={() => handleRowDoubleClick(row.original)} // Evento de doble clic
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                    key={cell.id} className="text-xs md:text-sm lg:text-base"
                    style={{
                      minWidth: cell.column.id === "user_username" ? "130px" : cell.column.id === "store_name" ? "110px" : "auto",
                      maxWidth: cell.column.id === "provider_name" ? "220px" : cell.column.id === "store_name" ? "160px" : cell.column.id === "user_username" ? "160px" : "auto",
                    }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm">
                  No hay Datos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Modal para mostrar detalles */}
        {isModalOpen && selectedRowData && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6 overflow-x-hidden [&>button]:hidden">
              {/* Header with ID and Status */}
              <DialogHeader className="pb-3 sm:pb-6 border-b space-y-0">
                <div className="flex items-start justify-between gap-2 w-full min-w-0">
                  <DialogTitle className="text-base sm:text-2xl font-bold truncate min-w-0">Ingreso #{selectedRowData.id}</DialogTitle>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer p-1 flex-shrink-0"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 sm:mt-2 w-full min-w-0">
                  {(() => {
                    const st = selectedRowData.status || 'POSTED';
                    if (st === 'DRAFT') return (
                      <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 sm:py-1 rounded-full border border-amber-200 dark:border-amber-900/40">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-[11px] sm:text-sm font-medium text-amber-700 dark:text-amber-300">Borrador</span>
                      </div>
                    );
                    if (st === 'CANCELED') return (
                      <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 sm:py-1 rounded-full border border-red-200 dark:border-red-900/40">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <span className="text-[11px] sm:text-sm font-medium text-red-700 dark:text-red-300">Anulado</span>
                      </div>
                    );
                    return (
                      <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 sm:py-1 rounded-full border border-green-200 dark:border-green-900/40">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="text-[11px] sm:text-sm font-medium text-green-700 dark:text-green-300">Completado</span>
                      </div>
                    );
                  })()}
                  <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Ingresos</p>
                </div>
              </DialogHeader>

              <DialogDescription className="sr-only">
                Detalles del ingreso de inventario
              </DialogDescription>

              <TooltipProvider delayDuration={200}>
              <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
                {/* Information Grid - 1 col mobile, 2 cols desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full min-w-0">
                  {/* Tienda */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors hover:border-slate-300 dark:hover:border-slate-600 w-full min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Store className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <label className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tienda</label>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 break-words sm:truncate">{selectedRowData.store_name}</p>
                  </div>

                  {/* Proveedor */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors hover:border-slate-300 dark:hover:border-slate-600 w-full min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <label className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Proveedor</label>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 break-words sm:truncate">{selectedRowData.provider_name}</p>
                  </div>

                  {/* Usuario */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors hover:border-slate-300 dark:hover:border-slate-600 w-full min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <User className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <label className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuario</label>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 break-words sm:truncate">{selectedRowData.user_username}</p>
                  </div>

                  {/* Moneda */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors hover:border-slate-300 dark:hover:border-slate-600">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <DollarSign className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <label className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Moneda</label>
                    </div>
                    <span className="inline-block bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                      {selectedRowData.tipoMoneda}
                    </span>
                  </div>
                </div>

                {/* Dates and Description */}
                <div className="space-y-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 w-full min-w-0 overflow-hidden">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                        <label className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Creación</label>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">{new Date(selectedRowData.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                        <label className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Compra</label>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">{new Date(selectedRowData.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {selectedRowData.description && (
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 sm:mb-2">Observaciones</label>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/50 p-2 sm:p-3 rounded border border-slate-200 dark:border-slate-700 break-words">{selectedRowData.description}</p>
                    </div>
                  )}
                </div>

                {/* PDFs Section */}
                {(selectedRowData.pdfUrl || selectedRowData.guiaUrl) && (
                  <div className="space-y-2 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/40">
                    <label className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2 sm:mb-3">Documentos Adjuntos</label>
                    <div className="flex gap-2 sm:gap-3 flex-wrap">
                      {selectedRowData.pdfUrl && (
                        <a
                          href={getPdfUrl(selectedRowData.pdfUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:shadow-sm px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          Ver Factura
                        </a>
                      )}
                      {selectedRowData.guiaUrl && (
                        <a
                          href={getPdfGuiaUrl(selectedRowData.guiaUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:shadow-sm px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          Ver Guía
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Products — Card layout on mobile, table on sm+ */}
                <div className="space-y-3 w-full min-w-0">
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300 flex-shrink-0" />
                    <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 min-w-0">Productos</h3>
                    <span className="ml-auto text-[10px] sm:text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 sm:py-1 rounded-full font-semibold flex-shrink-0">
                      {selectedRowData.details.length} producto{selectedRowData.details.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Mobile: Card layout */}
                  <div className="sm:hidden space-y-2">
                    {selectedRowData.details.map((detail: any, index: number) => (
                      <div key={index} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2 w-full min-w-0 overflow-hidden">
                        {/* Product name — wraps instead of truncating on mobile */}
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 break-words leading-snug">{detail.product_name}</p>
                        {/* Category */}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{detail.category_name || 'Sin categoría'}</p>
                        {/* Qty + Prices */}
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 dark:text-slate-400">Cant: <span className="font-semibold text-slate-900 dark:text-slate-100">{detail.quantity}</span></span>
                            <span className="text-slate-500 dark:text-slate-400">P.U: <span className="font-medium text-slate-900 dark:text-slate-100">{selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} {detail.price.toFixed(2)}</span></span>
                          </div>
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                            {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} {(detail.price * detail.quantity).toFixed(2)}
                          </span>
                        </div>
                        {/* Series (visible on mobile too) */}
                        {detail.series && detail.series.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 mb-1.5">
                              <Hash className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Series</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {detail.series.map((s: string, i: number) => (
                                <span key={i} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table layout */}
                  <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-600 dark:to-slate-500">
                          <th className="px-4 py-3 text-left text-white font-semibold text-sm">Producto</th>
                          <th className="px-4 py-3 text-left text-white font-semibold text-sm">Categoría</th>
                          <th className="px-4 py-3 text-center text-white font-semibold text-sm">Cant.</th>
                          <th className="px-4 py-3 text-right text-white font-semibold text-sm">P. Unitario</th>
                          <th className="px-4 py-3 text-right text-white font-semibold text-sm">Subtotal</th>
                          <th className="px-4 py-3 text-left text-white font-semibold text-sm">Series</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {selectedRowData.details.map((detail: any, index: number) => (
                          <tr key={index} className={`${index % 2 === 0 ? 'bg-white dark:bg-slate-900/30' : 'bg-slate-50 dark:bg-slate-800/30'} transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/40`}>
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 text-sm max-w-[240px]">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="truncate block cursor-default hover:text-primary transition-colors">{detail.product_name}</span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="start" className="max-w-sm">
                                  <p className="text-sm break-words">{detail.product_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-sm">{detail.category_name || <span className="text-gray-400 dark:text-gray-500 italic text-xs">Sin cat.</span>}</td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-100 text-sm">{detail.quantity}</td>
                            <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100 text-sm">
                              {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} {detail.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400 text-sm">
                              {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} {(detail.price * detail.quantity).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">
                              {detail.series && detail.series.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {detail.series.map((s: string, i: number) => (
                                    <span key={i} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-mono">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Row — prices already include IGV */}
                {(() => {
                  const currSymbol = selectedRowData.tipoMoneda === "PEN" ? "S/." : "$";
                  const totalConIgv = selectedRowData.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0);
                  const subtotalSinIgv = totalConIgv / 1.18;
                  const igv = totalConIgv - subtotalSinIgv;
                  return (
                    <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 p-3 sm:p-4 rounded-lg border border-slate-300 dark:border-slate-600 space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">Subtotal:</span>
                        <span className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {currSymbol} {subtotalSinIgv.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">IVA (18%):</span>
                        <span className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {currSymbol} {igv.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-slate-300 dark:border-slate-600 pt-2 flex justify-between items-center">
                        <span className="text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base">TOTAL:</span>
                        <span className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                          {currSymbol} {totalConIgv.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              </TooltipProvider>
            </DialogContent>
          </Dialog>
        )}

          {isViewModalOpen && selectedRowsDataVisual &&(
              <AlertDialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
              <AlertDialogContent className="w-[95vw] sm:w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader className="pb-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <AlertDialogTitle className="text-2xl font-bold">Ingresos Seleccionados</AlertDialogTitle>
                      <p className="text-sm text-gray-500 mt-1">{selectedRowsDataVisual.length} ingreso{selectedRowsDataVisual.length !== 1 ? 's' : ''} seleccionado{selectedRowsDataVisual.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogDescription className="sr-only">
                  Detalles de múltiples ingresos
                </AlertDialogDescription>
                  <div className="space-y-8 py-4">
                    {selectedRowsDataVisual.map((entry, entryIndex) => {
                      const totalConIgv = entry.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0);
                      const subtotal = totalConIgv / 1.18;
                      const iva = totalConIgv - subtotal;
                      const total = totalConIgv;
                      return (
                      <div key={entryIndex} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b dark:border-slate-700">
                          <div className="min-w-0 flex-1 mr-3">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ingreso #ID {entry.id}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate" title={`${entry.store_name} • ${entry.provider_name}`}>{entry.store_name} &bull; {entry.provider_name}</p>
                          </div>
                          {(() => {
                            const st = (entry as any).status || 'POSTED';
                            if (st === 'DRAFT') return (
                              <div className="flex-shrink-0 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/40">
                                <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Borrador</span>
                              </div>
                            );
                            if (st === 'CANCELED') return (
                              <div className="flex-shrink-0 flex items-center gap-2 bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-900/40">
                                <CheckCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span className="text-xs font-medium text-red-700 dark:text-red-300">Anulado</span>
                              </div>
                            );
                            return (
                              <div className="flex-shrink-0 flex items-center gap-2 bg-green-50 dark:bg-green-950/30 px-3 py-1 rounded-full border border-green-200 dark:border-green-900/40">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-xs font-medium text-green-700 dark:text-green-300">Completado</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* KPI Mini Cards */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-900/40">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Subtotal</p>
                            <p className="text-xl font-bold text-blue-900 dark:text-blue-200 mt-1">
                              {entry.tipoMoneda === "PEN" ? "S/." : "$"} {subtotal.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40">
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">IVA</p>
                            <p className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">
                              {entry.tipoMoneda === "PEN" ? "S/." : "$"} {iva.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-900/40">
                            <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Total</p>
                            <p className="text-xl font-bold text-green-900 dark:text-green-200 mt-1">
                              {entry.tipoMoneda === "PEN" ? "S/." : "$"} {total.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Usuario</p>
                            <p className="text-slate-900 dark:text-slate-100 font-medium mt-1 truncate" title={entry.user_username}>{entry.user_username}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Moneda</p>
                            <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{entry.tipoMoneda}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Fecha Creación</p>
                            <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{new Date(entry.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Fecha Compra</p>
                            <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{new Date(entry.date).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Products Table - Compact */}
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Productos ({entry.details.length})
                          </p>
                          <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                  <th className="px-2 sm:px-3 py-2 text-left text-slate-700 dark:text-slate-300 font-semibold">Producto</th>
                                  <th className="px-2 sm:px-3 py-2 text-center text-slate-700 dark:text-slate-300 font-semibold">Cant.</th>
                                  <th className="px-2 sm:px-3 py-2 text-right text-slate-700 dark:text-slate-300 font-semibold">Precio</th>
                                  <th className="px-2 sm:px-3 py-2 text-right text-slate-700 dark:text-slate-300 font-semibold">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {entry.details.map((detail: any, detailIndex) => (
                                  <tr key={detailIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-2 sm:px-3 py-2 text-slate-900 dark:text-slate-100 font-medium max-w-[180px] truncate" title={detail.product_name}>{detail.product_name}</td>
                                    <td className="px-2 sm:px-3 py-2 text-center font-medium dark:text-slate-200">{detail.quantity}</td>
                                    <td className="px-2 sm:px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                                      {entry.tipoMoneda === "PEN" ? "S/." : "$"} {detail.price.toFixed(2)}
                                    </td>
                                    <td className="px-2 sm:px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                                      {entry.tipoMoneda === "PEN" ? "S/." : "$"} {(detail.price * detail.quantity).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>             
                <AlertDialogFooter className="pt-6 border-t">
                  <AlertDialogCancel onClick={() => setIsViewModalOpen(false)} className="bg-slate-500 hover:bg-slate-600">
                    Cerrar
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
              )}
        </div>
      </div>

      <div className="py-4">
      <DataTablePagination table={table} />
      </div>
      
    </div>
      
  )
}

