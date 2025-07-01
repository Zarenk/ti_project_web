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
import { EyeIcon, FileText, PrinterIcon } from "lucide-react"

import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { DataTableToolbar } from "./data-table-components/data-table-toolbar"
import { deleteEntries, getPdfGuiaUrl, getPdfUrl } from "./entries.api"
 
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
details: { product: string; quantity: number; price: number; series: string }[]; 
}, TValue> {
  columns: ColumnDef<TData, TValue>[]
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
details: { product: string; quantity: number; price: number, series:string }[]; 
}, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {

  const [columnVisibility, setColumnVisibility] =
  React.useState<VisibilityState>({})

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
              font-family: Arial, sans-serif;
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
          <label className="text-sm text-gray-600">
            Total de datos: {table.getRowModel().rows.length}
          </label>
          <label className="text-sm text-gray-600 pb-2 sm:pb-0">
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
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Control de Inventario: Ingresos</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogDescription>
              </AlertDialogDescription>
              <div className="max-h-[80vh] overflow-y-auto space-y-8">
                <div className="space-y-4">
                  {/* Información General */}
                  <h3 className="text-lg font-semibold">Información General</h3>
                  <div><strong>ID del registro:</strong> {selectedRowData.id}</div>
                  <div><strong>Tienda:</strong> {selectedRowData.store_name}</div>
                  <div><strong>Proveedor:</strong> {selectedRowData.provider_name}</div>
                  <div><strong>Usuario que registro :</strong> {selectedRowData.user_username}</div>
                  <div><strong>Observacion(es) :</strong> {selectedRowData.description}</div>
                  <div><strong>Fecha de Creación:</strong> {new Date(selectedRowData.createdAt).toLocaleDateString()}</div>
                  <div><strong>Fecha de Compra:</strong> {new Date(selectedRowData.date).toLocaleDateString()}</div>
                  <div><strong>Moneda:</strong> {selectedRowData.tipoMoneda}</div>
                  <div><strong>Total: </strong>
                    {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"}{" "}
                    {selectedRowData.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0).toFixed(2)}
                  </div>
                  {/* Enlace para la factura */}
                  {selectedRowData.pdfUrl && (
                    <div>
                      <strong>Factura:</strong>{" "}
                      <a
                        href={getPdfUrl(selectedRowData.pdfUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        Ver Factura
                      </a>
                    </div>
                  )}
                  {/* Enlace para la factura */}
                  {selectedRowData.guiaUrl && (
                    <div>
                      <strong>Guia de Remision:</strong>{" "}
                      <a
                        href={getPdfGuiaUrl(selectedRowData.guiaUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        Ver Guia
                      </a>
                    </div>
                  )}
                  {/* Detalles de Productos */}
                  <h3 className="text-lg font-semibold">Detalles de Productos:</h3>
                  <table className="table-auto w-full border-collapse border border-gray-300">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 px-4 py-2">Producto</th>
                        <th className="border border-gray-300 px-4 py-2">Cant.</th>
                        <th className="border border-gray-300 px-4 py-2 w-[200px] max-w-[200px]">Precio</th>
                        <th className="border border-gray-300 px-4 py-2">Series</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRowData.details.map((detail: any, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-4 py-2">{detail.product_name}</td>
                          <td className="border border-gray-300 px-4 py-2">{detail.quantity}</td>
                          <td className="border border-gray-300 px-4 py-2 w-[200px] max-w-[200px]">
                            {selectedRowData.tipoMoneda === "PEN" ? "S/." : "$"} {detail.price.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                          {detail.series && detail.series.length > 0
                            ? detail.series.join(", ") // Mostrar las series separadas por comas
                            : "Sin series"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>    
              </div>         
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsModalOpen(false)}>Cerrar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}

          {isViewModalOpen && selectedRowsDataVisual &&(
              <AlertDialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Controlo de Inventarios: Ingresos Seleccionados</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogDescription>
                </AlertDialogDescription>
                  <div className="max-h-[70vh] overflow-y-auto space-y-8">
                    {selectedRowsDataVisual.map((entry, entryIndex) => (
                      <div key={entryIndex} className="space-y-4">
                        {/* Información General */}
                        <h3 className="text-lg font-semibold">Información General</h3>
                        <div><strong>ID del registro:</strong> {entry.id}</div>
                        <div><strong>Tienda:</strong> {entry.store_name}</div>
                        <div><strong>Proveedor:</strong> {entry.provider_name}</div>
                        <div><strong>Usuario que registró:</strong> {entry.user_username}</div>
                        <div><strong>Observacion(es) :</strong> {entry.description}</div>
                        <div><strong>Fecha de Creación:</strong> {new Date(entry.createdAt).toLocaleDateString()}</div>
                        <div><strong>Fecha de Compra:</strong> {new Date(entry.date).toLocaleDateString()}</div>
                        <div><strong>Moneda:</strong> {entry.tipoMoneda}</div>
                        <div><strong>Total: </strong>
                          {entry.tipoMoneda === "PEN" ? "S/." : "$"}{" "}
                          {entry.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0).toFixed(2)}
                        </div>
                        {/* Detalles de Productos */}
                        <h3 className="text-lg font-semibold">Detalles de Productos</h3>
                        <table className="table-auto w-full border-collapse border border-gray-300">
                          <thead>
                            <tr>
                              <th className="border border-gray-300 px-4 py-2">Producto</th>
                              <th className="border border-gray-300 px-4 py-2">Cant.</th>
                              <th className="border border-gray-300 px-4 py-2 w-[200px] max-w-[200px]">Precio</th>
                              <th className="border border-gray-300 px-4 py-2">Series</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.details.map((detail:any, detailIndex) => (
                              <tr key={detailIndex}>
                                <td className="border border-gray-300 px-4 py-2">{detail.product_name}</td>
                                <td className="border border-gray-300 px-4 py-2">{detail.quantity}</td>
                                <td className="border border-gray-300 px-4 py-2 w-[200px] max-w-[200px]">
                                  {entry.tipoMoneda === "PEN" ? "S/." : "$"} {detail.price.toFixed(2)}
                                </td>
                                <td className="border border-gray-300 px-4 py-2">
                                {detail.series && detail.series.length > 0
                                  ? detail.series.join(", ") // Mostrar las series separadas por comas
                                  : "Sin series"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>             
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsModalOpen(false)}>Cerrar</AlertDialogCancel>
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
