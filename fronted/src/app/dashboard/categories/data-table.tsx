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
import { DataTablePagination } from "../../../components/data-table-pagination"

import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker"; // Asegúrate de que este tipo esté disponible
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { deleteCategories } from "./categories.api"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Cross2Icon, TrashIcon } from "@radix-ui/react-icons"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { DeleteActionsGuard } from "@/components/delete-actions-guard"

 
interface DataTableProps<TData extends {id:string, createdAt:Date, name:string, description:string, status:string}, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}
 
export function DataTable<TData extends {id:string, createdAt:Date, name:string, description:string, status:string}, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {

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
      console.log("Rango de fechas seleccionado:", range);
  };

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
    getPaginationRowModel: getPaginationRowModel(), // Habilitar paginación
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination,
    },
    onPaginationChange: setPagination, // ACTUALIZA EL ESTADO DE PAGINACION
  })

  // PARA EL MENSAJE DE ALERTA
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => row.original.id); // Obtén los IDs de las filas seleccionadas

    if (selectedIds.length === 0) {
      alert('No hay filas seleccionadas');
      return;
    }

    try {
      await deleteCategories(selectedIds); // Llama a la API para eliminar las categorias
      toast.success("Categoría(s) eliminada correctamente."); // Notificación de éxito
      table.resetRowSelection(); // Limpia la selección después de eliminar
      location.reload(); // Refresca la página para actualizar los datos
    } catch (error:any) {
      // Captura el mensaje de error y lo muestra en el toast
      toast.error(error.message || "No se pudo eliminar la() categoria porque esta relacionada con un producto");
    }
  };

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

  // Mapa de traducción para los nombres de las columnas
  const columnLabels: Record<string, string> = {
    name: "Nombre",
    createdAt: "Fecha de Creación",
    description: "Descripción", 
    status: "Estado",
    // Agrega más columnas según sea necesario
  };
 
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py4- px-4 gap-4 mb-6">
          <Input
            placeholder="Filtrar por nombre de Categoria..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <div className="px-0 sm:px-2">
              {/* Selector de Rango de Fechas con CalendarDatePicker */}
          <CalendarDatePicker 
          className="h-9 w-[250px]"
          variant="outline"
          date={selectedDateRange || { from: undefined, to: undefined }} 
          onDateSelect={handleDateSelect} />
          </div>
          {/* Botón Reset: Solo aparece si hay filtros activos */}
          {isFiltered && (
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
                  onDoubleClick={() => handleRowDoubleClick(row.original)} // Evento de doble clic
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
                   <AlertDialogTitle>Detalles del Producto</AlertDialogTitle>
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
      
    </div>
      
  )
}
