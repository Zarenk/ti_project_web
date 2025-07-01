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
import { deleteStores, updateManyStores } from "./stores.api"
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
 
interface DataTableProps<TData extends {id:string, name:string, 
  description:string, ruc:string, phone: string, adress: string, email: string, website: string
  status:string, createdAt:Date
  }, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}
 
export function DataTable<TData extends {id:string, name:string, 
  description:string, ruc:string, phone: string, adress: string, email: string, website: string
  status:string, createdAt:Date}, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  
  // Filtrar los datos según el rango de fechas seleccionado
  const filteredData = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      return data; // Si no hay rango seleccionado, mostrar todos los datos
    }

    const from = new Date(selectedDateRange.from);
    const to = new Date(selectedDateRange.to);

    return data.filter((item) => {
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

  // PARA EL MENSAJE DE ALERTA
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDeleteSelected = async () => {
    //const selectedRows = table.getFilteredSelectedRowModel().rows; // PARA SOLO LOS DATOS QUE APAREZCAN EN DATATABLE
    const selectedIds = Object.keys(globalRowSelection); // Obtén los IDs de las filas seleccionadas

    if (selectedIds.length === 0) {
      alert('No hay filas seleccionadas');
      return;
    }

    console.log("IDs seleccionados para eliminar:", selectedIds);

    try {
      await deleteStores(selectedIds); // Llama a la API para eliminar las tiendas
      //alert('Tiendas eliminadas correctamente');
      toast.success("Tienda(s) eliminada(s) correctamente."); // Notificación de éxito
      table.resetRowSelection(); // Limpia la selección después de eliminar
      location.reload(); // Refresca la página para actualizar los datos
    } catch (error: any) {
      console.error("Error al eliminar tiendas:", error)
      toast.error(error.message || "No se pudo eliminar la(s) tienda(s).");
    }

    setIsDialogOpen(false); // Cierra el diálogo

  };
  //

  // FILTRO RESET

    const handleResetDateRange = () => {

      // Restablecer el filtro de búsqueda
      table.getColumn("name")?.setFilterValue(""); // Limpia el filtro de la columna "name"
  
      setSelectedDateRange(undefined); // Restablece el rango de fechas
  
      // Restablecer los filtros de la tabla
      table.resetColumnFilters();
      table.resetRowSelection();
    };
  
     // Verificar si hay filtros activos
     const isFiltered =
     !!table.getColumn("name")?.getFilterValue() || // Filtro de búsqueda
     !!selectedDateRange || // Rango de fechas
     table.getState().columnFilters.length > 0; // Filtros de columnas
  
  //

  // Mapa de traducción para los nombres de las columnas
  const columnLabels: Record<string, string> = {
    name: "Nombre",
    description: "Descripción",
    ruc: "RUC",
    phone: "Telefono",
    adress: "Direccion", 
    email: "Email", 
    website: "Pagina Web",
    status: "Estado",
    createdAt: "Fecha de Creación",
    // Agrega más columnas según sea necesario
  };

  // IMPRESION

  const handlePrintSelected = () => {
    // Obtener los IDs seleccionados desde globalRowSelection
    const selectedIds = Object.keys(globalRowSelection);

    // Filtrar los datos originales para incluir solo las filas seleccionadas
    const selectedData = data.filter((item) => selectedIds.includes(String(item.id)));

    if (selectedData.length === 0) {
      alert("No hay filas seleccionadas para imprimir.");
      return;
    }
  
    // Crear una nueva ventana
    const printWindow = window.open("about:blank", "Reporte de Tiendas Seleccionadas", "width=800,height=600");
  
    if (printWindow) {
      // Generar el contenido HTML para imprimir
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Reportes TI</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                table-layout: fixed;
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
              .truncate {
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
              }
            </style>
            <header style="text-align: center; margin-bottom: 20px;">
              <h1>Reporte de Tiendas Seleccionadas</h1>
              <p>Fecha de impresión: ${new Date().toLocaleDateString()}</p>
            </header>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  <th style="width: 15%;">Nombre</th>
                  <th style="width: 15%;">Descripcion/R.S.</th>
                  <th style="width: 10%;">Ruc</th>
                  <th style="width: 10%;">Telefono</th>
                  <th style="width: 15%;">Direccion</th>
                  <th style="width: 10%;">Email</th>
                  <th style="width: 5%;">Pagina web</th>
                  <th style="width: 5%;">Estado</th>
                  <th style="width: 15%;">Fecha</th>
                </tr>
              </thead>
              <tbody>
                ${selectedData
                  .map(
                    (row) => `
                  <tr>
                    <td class="truncate" title="${row.name}">
                      ${row.name}
                    </td>
                    <td class="truncate" title="${row.description}">
                      ${row.description}
                    </td>
                    <td class="truncate" title="${row.ruc}">
                      ${row.ruc}
                    </td>
                    <td class="truncate"${row.phone}">
                      ${row.phone}
                    </td>
                    <td>${row.adress}</td>
                    <td>${row.email}</td>
                    <td>${row.website}</td>
                    <td>${row.status}</td>
                    <td>${new Date(row.createdAt).toLocaleDateString()}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
            <footer style="text-align: center; margin-top: 20px;">
                <p>Generado por TI Sistema 2025 - TACNA - PERU</p>
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

  // MODAL DE EDICION MASIVO
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRowsData, setSelectedRowsData] = useState<TData[]>([]); // Almacena los datos seleccionados
    const [editValues, setEditValues] = useState<Partial<TData>>({}); // Almacena los valores editados
    const router = useRouter(); // Inicializa el router
    const handleEditSelected = () => {
      const selectedIds = Object.keys(globalRowSelection); // Obtén los IDs de las filas seleccionadas
      if (selectedIds.length === 1) {
        // Si solo hay una fila seleccionada, redirige al formulario de edición
        const selectedId = selectedIds[0];
        router.push(`/dashboard/stores/${selectedId}/edit`); // Redirige al formulario de edición con el ID
      }
      else if(selectedIds.length > 1){
        const selectedData = data.filter((item) =>
          Object.keys(globalRowSelection).includes(String(item.id))
        );
        setSelectedRowsData(selectedData); // Guarda los datos seleccionados
        setEditValues({}); // Limpia los valores editados
        setIsEditModalOpen(true); // Abre el modal
      }
      else {
        // Si no hay filas seleccionadas, muestra un mensaje de advertencia
        toast.error("Por favor, selecciona al menos una fila para modificar.");
      }
      
    };

    const localEditValuesRef = useRef<Partial<TData>>({});

    const handleEditChange = (field: keyof TData, value: any) => {
      localEditValuesRef.current[field] = value;
    };

    const handleSaveChanges = async () => {
      try {
        // Crear un array con los datos actualizados
        const updatedData = selectedRowsData.map((row) => ({
          ...row,
          ...localEditValuesRef.current, // Aplica los valores editados a cada fila seleccionada
        }));   
        //console.log("Datos actualizados para enviar al backend:", updatedData);   
        // Llamar a la API para actualizar los datos
        await updateManyStores(updatedData);    
        toast.success("Tiendas actualizadas correctamente.");    
        // Actualizar los datos en el frontend
        location.reload(); // O actualiza el estado local si no quieres recargar la página   
        setIsEditModalOpen(false); // Cierra el modal
      } catch (error) {
        //console.error("Error al actualizar tiendas:", error);
        toast.error("No se pudieron actualizar las tiendas.");
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
    setSelectedRowsData(selectedData); // Guarda los datos seleccionados
    setIsViewModalOpen(true); // Abre el modal
  };
  //

  return (
    <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py4- px-4 gap-4 mb-6">
            <Input
              placeholder="Filtrar por nombre de tienda..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
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
                key="button-3"
                onClick={handleEditSelected}
                className="bg-blue-900 hover:bg-blue-950 text-white cursor-pointer
                text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-4"
                disabled={totalSelectedRows === 0}
                title="Modificar seleccionado(s)" // Tooltip al pasar el mouse
                >          
                <span className="hidden md:inline">Modificar Seleccionado(s)</span> ({totalSelectedRows})
                <FileText className="size-6" aria-hidden="true" />
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
                  Esta acción no se puede deshacer. Esto eliminará permanentemente la/las tienda(s).
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

          {/* AlertDialog MODAL PARA EDICION MASIVA */}
          {isEditModalOpen && (
            <AlertDialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Editar Tiendas Seleccionadas</AlertDialogTitle>
                  <AlertDialogDescription>
                    Realiza los cambios que deseas aplicar a las tiendas seleccionadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="block text-sm font-medium">Estado</Label>
                    <Select
                      defaultValue={localEditValuesRef.current?.status || ""}
                      onValueChange={(value) => handleEditChange("status", value)} // Usa `onValueChange` en lugar de `onChange`
                    >
                      <SelectTrigger className="w-full border rounded-md px-2 py-1">
                        <SelectValue placeholder="Selecciona un Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="block text-sm font-medium">Telefono</Label>
                    <Input
                      type="text"
                      defaultValue={localEditValuesRef.current?.phone || ""}
                      maxLength={20} // Limita el número de caracteres (por ejemplo, 10)
                      onChange={(e) => {
                        const value = e.target.value;
                        // Validar que el valor sea un número con hasta 2 decimales
                        handleEditChange("phone", value); // Actualiza el valor en el estado
                      }}
                      onKeyDown={(e) => {
                        // Evitar que se ingresen letras o caracteres no deseados
                        if (
                          e.key === "Alt" || // Bloquear la tecla Alt
                          !/[0-9.]/.test(e.key) && // Permitir solo números y el punto decimal
                          e.key !== "Backspace" && // Permitir borrar
                          e.key !== "Tab" && // Permitir tabulación
                          e.key !== "ArrowLeft" && // Permitir mover el cursor a la izquierda
                          e.key !== "ArrowRight" // Permitir mover el cursor a la derecha
                        ) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full border rounded-md px-2 py-1"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium">Pagina Web</Label>
                    <Input
                      type="text"
                      maxLength={100} // Limita el número de caracteres (por ejemplo, 10)
                      defaultValue={localEditValuesRef.current?.email || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleEditChange("email", value); // Actualiza el valor en el estado
                        }
                      }
                      className="w-full border rounded-md px-2 py-1"
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsEditModalOpen(false)}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleSaveChanges}>
                    Guardar Cambios
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

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
                        minWidth: header.id === "name" ? "150px" : header.id === "createdAt" ? "120px" : "auto",
                        maxWidth: header.id === "description" ? "300px" : "auto",
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
                      minWidth: cell.column.id === "name" ? "150px" : cell.column.id === "createdAt" ? "120px" : "auto",
                      maxWidth: cell.column.id === "description" ? "300px" : "auto",
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
                  <AlertDialogTitle>Detalles de la tienda</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogDescription>                
                </AlertDialogDescription>
                <span className="block space-y-2">
                    <div><strong>Nombre:</strong> {selectedRowData.name}</div>
                    <div><strong>Descripción / Razon S. :</strong> {selectedRowData.description}</div>
                    <div><strong>Ruc:</strong> {selectedRowData.ruc}</div>
                    <div><strong>Telefono:</strong> S/. {selectedRowData.phone}</div>
                    <div><strong>Direccion:</strong> S/. {selectedRowData.adress}</div>
                    <div><strong>Email:</strong> {selectedRowData.email}</div>
                    <div><strong>Pagina Web:</strong> {selectedRowData.website}</div>
                    <div><strong>Estado:</strong> {selectedRowData.status}</div>
                    <div><strong>Fecha:</strong> {new Date(selectedRowData.createdAt).toLocaleDateString()}</div>
                </span>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsModalOpen(false)}>Cerrar</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {isViewModalOpen && (
            <AlertDialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
              <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>Visualización Masiva</AlertDialogTitle>
                  <AlertDialogDescription>
                    Aquí puedes ver los datos seleccionados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-6">
                  {selectedRowsData.length > 0 ? (
                    selectedRowsData.map((row) => (
                      <div
                        key={row.id}
                        className="p-4 border rounded-md shadow-sm space-y-2"
                      >
                        <div>
                          <strong>Nombre:</strong> {row.name}
                        </div>
                        <div>
                          <strong>Descripción/R.S:</strong> {row.description}
                        </div>
                        <div>
                          <strong>Ruc:</strong> {row.ruc}
                        </div>
                        <div>
                          <strong>Telefono:</strong> {row.phone}
                        </div>
                        <div>
                          <strong>Direccion:</strong> {row.adress}
                        </div>
                        <div>
                          <strong>Email:</strong> {row.email}
                        </div>
                        <div>
                          <strong>Pagina Web:</strong> {row.website}
                        </div>
                        <div>
                          <strong>Estado:</strong> {row.status}
                        </div>
                        <div>
                          <strong>Fecha de Creación:</strong>{" "}
                          {new Date(row.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No hay datos seleccionados.</p>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsViewModalOpen(false)}>
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
