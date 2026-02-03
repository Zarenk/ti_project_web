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

import { useMemo, useRef, useState } from "react";
import { DateRange } from "react-day-picker"; // Asegúrate de que este tipo esté disponible
import { CalendarDatePicker } from "@/components/calendar-date-picker";

import { Cross2Icon, TrashIcon } from "@radix-ui/react-icons"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { EyeIcon, FileText, PrinterIcon, Store, User, Calendar, DollarSign, Package, CheckCircle, MapPin } from "lucide-react"

import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { DataTableToolbar } from "./data-table-components/data-table-toolbar"
import { deleteEntries, getPdfGuiaUrl, getPdfUrl } from "./entries.api"
import { DeleteActionsGuard } from "@/components/delete-actions-guard"
import { getColumns } from "./columns"
 
interface DataTableProps<TData extends {
id:string,
createdAt:Date,
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
}
 
export function DataTable<TData extends {
id:string,
createdAt:Date,
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
}: DataTableProps<TData, TValue>) {

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
    // Ejemplo: Abrir un modal con los detalles de la fila
    console.log("Doble clic en la fila:", rowData);
    setSelectedRowData(rowData); // Guarda los datos de la fila seleccionada
    setIsModalOpen(true); // Abre el modal
  };
  //

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
      location.reload(); // Refresca la página para actualizar los datos
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py4- px-4 gap-4 mb-6">
            <Input
              placeholder="Filtrar por nombre de Usuario..."
              value={(table.getColumn("user_username")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("user_username")?.setFilterValue(event.target.value)
              }
              className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Selector de Rango de Fechas con CalendarDatePicker */}
            <div className="px-0 sm:px-2">
              <CalendarDatePicker 
              className="h-9 w-[300px]"
              variant="outline"
              date={selectedDateRange || { from: undefined, to: undefined }} 
              onDateSelect={handleDateSelect} />
            </div>
            <div className="px-0 sm:px-2">
              <DataTableToolbar table={table} />
            </div>
            {/* Botón Reset: Solo aparece si hay filtros activos */}
            {(totalSelectedRows > 0 || isFiltered) && (
            <div className="px-0 sm:px-2 self-start sm:self-auto">
              <Button
                  variant="ghost"
                  onClick={handleResetDateRange}
                  className="h-8 px-2 lg:px-3"
              >
                Reset
              <Cross2Icon className="ml-2 h-4 w-4" />
              </Button>
            </div>              
            )}
          
          <div className="sm:mt-0 sm:ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Vistas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
              align="start" // Alinea el menú al final del botón
              side="bottom" // Posiciona el menú debajo del botón
              sideOffset={4} // Agrega un pequeño espacio entre el botón y el menú
              className="w-48 sm:w-48 sm:align-end" // Cambia el comportamiento en pantallas medianas y grandes      
              >
              {/* Título encima de las opciones */}
              <div className="px-4 py-2 text-sm font-medium border-b text-center">
                Opciones
              </div>
                {table
                  .getAllColumns()
                  .filter(
                    (column) => column.getCanHide() && column.id !== "actions" // Excluye la columna "actions"
                  )
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {/* Usa el mapa de traducción para mostrar nombres amigables */}
                        {columnLabels[column.id] || column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
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
                        minWidth: header.id === "user_username" ? "150px" : header.id === "store_name" ? "120px" : "auto",
                        maxWidth: header.id === "provider_name" ? "300px" : "auto",
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
                  onDoubleClick={() => handleRowDoubleClick(row.original)} // Evento de doble clic
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                    key={cell.id} className="text-xs md:text-sm lg:text-base"
                    style={{
                      minWidth: cell.column.id === "user_username" ? "150px" : cell.column.id === "store_name" ? "120px" : "auto",
                      maxWidth: cell.column.id === "provider_name" ? "300px" : "auto",
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
          <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <AlertDialogContent className="w-[95vw] sm:w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
              {/* Header with ID and Status */}
              <AlertDialogHeader className="pb-6 border-b flex flex-row items-center justify-between">
                <div className="flex-1">
                  <AlertDialogTitle className="text-2xl font-bold">Ingreso #ID {selectedRowData.id}</AlertDialogTitle>
                  <p className="text-sm text-gray-500 mt-1">Control de Inventario: Ingresos</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Completado</span>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer p-1"
                    title="Cerrar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-slate-600 dark:text-slate-300"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </AlertDialogHeader>

              <AlertDialogDescription className="sr-only">
                Detalles del ingreso de inventario
              </AlertDialogDescription>

              <div className="space-y-6 py-4">
                {/* KPI Cards - Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Subtotal</p>
                    <p className="text-2xl font-bold text-blue-900 mt-2">
                      {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} 
                      {(selectedRowData.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">IVA (18%)</p>
                    <p className="text-2xl font-bold text-amber-900 mt-2">
                      {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} 
                      {(selectedRowData.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0) * 0.18).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-green-600 font-semibold uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-bold text-green-900 mt-2">
                      {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} 
                      {(selectedRowData.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0) * 1.18).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Information Grid - 2x2 Layout */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Tienda */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Store className="w-4 h-4 text-slate-600" />
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tienda</label>
                    </div>
                    <p className="text-base font-semibold text-slate-900">{selectedRowData.store_name}</p>
                  </div>

                  {/* Proveedor */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Proveedor</label>
                    </div>
                    <p className="text-base font-semibold text-slate-900">{selectedRowData.provider_name}</p>
                  </div>

                  {/* Usuario */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-slate-600" />
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Usuario Registrador</label>
                    </div>
                    <p className="text-base font-semibold text-slate-900">{selectedRowData.user_username}</p>
                  </div>

                  {/* Moneda */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-slate-600" />
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Moneda</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-slate-200 text-slate-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {selectedRowData.tipoMoneda}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dates and Description */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-slate-600" />
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha de Creación</label>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{new Date(selectedRowData.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-slate-600" />
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha de Compra</label>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{new Date(selectedRowData.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {selectedRowData.description && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Observaciones</label>
                      <p className="text-sm text-slate-700 bg-white p-2 rounded border border-slate-200">{selectedRowData.description}</p>
                    </div>
                  )}
                </div>

                {/* PDFs Section */}
                {(selectedRowData.pdfUrl || selectedRowData.guiaUrl) && (
                  <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-3">Documentos Adjuntos</label>
                    <div className="flex gap-3 flex-wrap">
                      {selectedRowData.pdfUrl && (
                        <a
                          href={getPdfUrl(selectedRowData.pdfUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white border border-blue-300 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          Ver Factura
                        </a>
                      )}
                      {selectedRowData.guiaUrl && (
                        <a
                          href={getPdfGuiaUrl(selectedRowData.guiaUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white border border-blue-300 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          Ver Guía de Remisión
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Products Table */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Detalles de Productos</h3>
                    <span className="ml-auto text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full font-semibold">
                      {selectedRowData.details.length} producto{selectedRowData.details.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-700 to-slate-600">
                          <th className="px-2 sm:px-4 py-3 text-left text-white font-semibold text-xs sm:text-sm">Producto</th>
                          <th className="px-2 sm:px-4 py-3 text-left text-white font-semibold text-xs sm:text-sm hidden sm:table-cell">Categoría</th>
                          <th className="px-2 sm:px-4 py-3 text-center text-white font-semibold text-xs sm:text-sm">Cant.</th>
                          <th className="px-2 sm:px-4 py-3 text-right text-white font-semibold text-xs sm:text-sm">P. Unitario</th>
                          <th className="px-2 sm:px-4 py-3 text-right text-white font-semibold text-xs sm:text-sm">Subtotal</th>
                          <th className="px-2 sm:px-4 py-3 text-left text-white font-semibold text-xs sm:text-sm hidden lg:table-cell">Series</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedRowData.details.map((detail: any, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-2 sm:px-4 py-3 font-medium text-slate-900 text-xs sm:text-sm">{detail.product_name}</td>
                            <td className="px-2 sm:px-4 py-3 text-slate-700 text-xs sm:text-sm hidden sm:table-cell">{detail.category_name || <span className="text-gray-400">Sin cat.</span>}</td>
                            <td className="px-2 sm:px-4 py-3 text-center font-semibold text-slate-900 text-xs sm:text-sm">{detail.quantity}</td>
                            <td className="px-2 sm:px-4 py-3 text-right text-slate-900 text-xs sm:text-sm">
                              {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} {detail.price.toFixed(2)}
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-right font-semibold text-blue-600 text-xs sm:text-sm">
                              {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} {(detail.price * detail.quantity).toFixed(2)}
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-slate-700 text-xs hidden lg:table-cell">
                              {detail.series && detail.series.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {detail.series.map((s: string, i: number) => (
                                    <span key={i} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Row */}
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 p-4 rounded-lg border border-slate-300 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 font-medium">Subtotal:</span>
                    <span className="text-lg font-semibold text-slate-900">
                      {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} 
                      {selectedRowData.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 font-medium">IVA (18%):</span>
                    <span className="text-lg font-semibold text-slate-900">
                      {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} 
                      {(selectedRowData.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0) * 0.18).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
                    <span className="text-slate-900 font-bold text-base">TOTAL:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} 
                      {(selectedRowData.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0) * 1.18).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogContent>
          </AlertDialog>
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
                      const subtotal = entry.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0);
                      const iva = subtotal * 0.18;
                      const total = subtotal * 1.18;
                      return (
                      <div key={entryIndex} className="border border-slate-200 rounded-lg p-6 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900">Ingreso #ID {entry.id}</h4>
                            <p className="text-sm text-slate-500">{entry.store_name} • {entry.provider_name}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700">Completado</span>
                          </div>
                        </div>

                        {/* KPI Mini Cards */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-600 font-semibold">Subtotal</p>
                            <p className="text-xl font-bold text-blue-900 mt-1">
                              {entry.tipoMoneda === "PEN" ? "S/." : "$"} {subtotal.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-600 font-semibold">IVA</p>
                            <p className="text-xl font-bold text-amber-900 mt-1">
                              {entry.tipoMoneda === "PEN" ? "S/." : "$"} {iva.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <p className="text-xs text-green-600 font-semibold">Total</p>
                            <p className="text-xl font-bold text-green-900 mt-1">
                              {entry.tipoMoneda === "PEN" ? "S/." : "$"} {total.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Usuario</p>
                            <p className="text-slate-900 font-medium mt-1">{entry.user_username}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Moneda</p>
                            <p className="text-slate-900 font-medium mt-1">{entry.tipoMoneda}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Fecha Creación</p>
                            <p className="text-slate-900 font-medium mt-1">{new Date(entry.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Fecha Compra</p>
                            <p className="text-slate-900 font-medium mt-1">{new Date(entry.date).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Products Table - Compact */}
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Productos ({entry.details.length})
                          </p>
                          <div className="overflow-x-auto rounded border border-slate-200">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-100">
                                  <th className="px-2 sm:px-3 py-2 text-left text-slate-700 font-semibold">Producto</th>
                                  <th className="px-2 sm:px-3 py-2 text-center text-slate-700 font-semibold">Cant.</th>
                                  <th className="px-2 sm:px-3 py-2 text-right text-slate-700 font-semibold">Precio</th>
                                  <th className="px-2 sm:px-3 py-2 text-right text-slate-700 font-semibold">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {entry.details.map((detail: any, detailIndex) => (
                                  <tr key={detailIndex} className="hover:bg-slate-50">
                                    <td className="px-2 sm:px-3 py-2 text-slate-900 font-medium">{detail.product_name}</td>
                                    <td className="px-2 sm:px-3 py-2 text-center font-medium">{detail.quantity}</td>
                                    <td className="px-2 sm:px-3 py-2 text-right text-slate-700">
                                      {entry.tipoMoneda === "PEN" ? "S/." : "$"} {detail.price.toFixed(2)}
                                    </td>
                                    <td className="px-2 sm:px-3 py-2 text-right font-semibold text-blue-600">
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

