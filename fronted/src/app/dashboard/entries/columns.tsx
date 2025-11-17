'use client'
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from "lucide-react"

import { MoreHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteEntry, getPdfGuiaUrl, getPdfUrl } from './entries.api';
import { DeleteActionsGuard } from '@/components/delete-actions-guard';


export type Entryes = {
    id: string
    createdAt: Date
    tipoMoneda: string
    date: Date
    description?: string
    provider: {
        id: string
        name: string
    }
    user: {
        id: string
        username: string
    }
    store:{
        id: string
        name: string
    }
    provider_name: string
    user_username: string
    store_name: string
    pdfUrl: string,
    guiaUrl: string,
    details: { product: string; product_name: string; quantity: number; price: number; series: string[] }[];
}


export const columns: ColumnDef<Entryes>[] = [
    {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Fila seleccionada"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    },
    {
        accessorKey: 'createdAt',
        header: ({ column }) => {
            return (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Fecha de Creacion
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            )
        },
        cell: ({row}) =>{
            const date = new Date(row.getValue('createdAt'))
            const formatted = new Intl.DateTimeFormat('es-ES', {
                dateStyle: 'short',
                timeStyle: 'medium',
              }).format(date); // Formato consistente
            return <div className='font-medium'>{formatted}</div>
        }
    },
    {
        accessorKey: 'store_name',
        header: ({ column }) => {
            return (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Tienda
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            )
        },
        cell: ({ row }) => {
            const store = row.original.store; // Accede al usuario desde los datos de la fila
            return <div className="font-medium">{store?.name || 'Sin tienda'}</div>;
          },
          filterFn: (row, columnId, filterValue) => { // no elimines el columnId
            // Filtra las filas basándose en el ID de la categoría
            return filterValue.includes(row.original.store?.id);
        },
    },
    {
        accessorKey: 'user_username',
        header: ({ column }) => {
            return (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Nombre de Usuario
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            )
        },
        cell: ({ row }) => {
            const user = row.original.user; // Accede al usuario desde los datos de la fila
            return <div className="font-medium">{user?.username || 'Sin usuario'}</div>;
          },
          filterFn: (row, columnId, filterValue) => { // no elimines el columnId
            // Filtra las filas basándose en el ID de la categoría
            return filterValue.includes(row.original.user?.id);
        },
    },
    {
        accessorKey: 'provider_name',
        header: ({ column }) => {
            return (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Proveedor
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            )
        },
        cell: ({ row }) => {
            const provider = row.original.provider; // Accede al usuario desde los datos de la fila
            return <div className="font-medium">{provider?.name || 'Sin proveedor'}</div>;
        }
    },
    {
      accessorKey: 'total',
      header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Total
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
      },
      cell: ({ row }) => {
          // Calcular el total dinámicamente
          const total = row.original.details.reduce((sum, detail) => {
            return sum + detail.price * detail.quantity;
          }, 0);
          return (
            <div className="font-medium">
              {row.original.tipoMoneda === "PEN" ? "S/." : "$"} {total.toFixed(2)}
            </div>
          );
      },
      sortingFn: (rowA, rowB) => {
        // Calcular el total para ambas filas
        const totalA = rowA.original.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0);
        const totalB = rowB.original.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0);
    
        // Comparar los totales
        return totalA - totalB;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {

        const entries = row.original

        const router = useRouter(); // Usa useRouter dentro del componente React
        const handleRemoveEntry = async (id: number) => {
          try {
            //console.log(id)
            await deleteEntry(id); // Llama a la API para eliminar el producto
            toast.success("Registro eliminado correctamente."); // Notificación de éxito
            router.refresh(); // Refresca los datos de la página
          } catch (error: any) {
            toast.error(error.message || "No se pudo eliminar el registro.");
          }
        };

        // PARA EL MENSAJE DE ALERTA
        const [isDialogOpen, setIsDialogOpen] = useState(false)

        const handleDeleteClick = () => {
          setIsDialogOpen(true) // Abre el diálogo
        }

        const handleDialogClose = () => {
          setIsDialogOpen(false) // Cierra el diálogo
        }
        //

        // PARA EL MENSAJE DE VISUALIZACION
        const [isDialogViewOpen, setIsDialogViewOpen] = useState(false); // Controla el diálogo de eliminación
        const [isViewDialogOpen, setIsViewDialogOpen] = useState(false); // Controla el diálogo de visualización

        const handleViewClick = () => {
          setIsViewDialogOpen(true); // Abre el diálogo de visualización
        };

        const handleDialogViewClose = () => {
          setIsViewDialogOpen(false); // Cierra el diálogo de visualización
        };
  
        //

        return (
          <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir Menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleViewClick}>
                Visualizar
                </DropdownMenuItem>
                <DeleteActionsGuard>
                  <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                    Eliminar
                  </DropdownMenuItem>
                </DeleteActionsGuard>             
            </DropdownMenuContent>
          </DropdownMenu>

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
                  Esta acción no se puede deshacer. Esto eliminará permanentemente el producto.
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
                    await handleRemoveEntry(Number(entries.id))
                    setIsDialogOpen(false)
                  }}
                >
                  Continuar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Diálogo de Visualización */}
          <AlertDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Informacion General</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogDescription>               
              </AlertDialogDescription>
              <div className="max-h-[80vh] overflow-y-auto space-y-8">
                <span className="block space-y-2">
                  <div><strong>Tienda:</strong> {entries.store_name || "Sin tienda"}</div>
                  <div><strong>Proveedor:</strong> {entries.provider?.name || "Sin proveedor"}</div>
                  <div><strong>Usuario que registró:</strong> {entries.user?.username || "Sin usuario"}</div>
                  <div><strong>Observación(es):</strong> {entries.description || "Sin observaciones"}</div>
                  <div><strong>Fecha de Creación:</strong> {new Date(entries.createdAt).toLocaleDateString()}</div>
                  <div><strong>Fecha de Compra:</strong> {new Date(entries.date).toLocaleDateString()}</div>
                  <div><strong>Moneda:</strong> {entries.tipoMoneda}</div>
                  <div><strong>Total: </strong>
                    {entries.tipoMoneda === "PEN" ? "S/." : "$"}{" "}
                    {entries.details.reduce((sum, detail) => sum + detail.price * detail.quantity, 0).toFixed(2)}
                  </div>
                  {/* Enlace para la factura */}
                  {entries.pdfUrl && (
                    <div>
                      <strong>Factura:</strong>{" "}
                      <a
                        href={getPdfUrl(entries.pdfUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        Ver Factura
                      </a>
                    </div>
                  )}
                  {/* Enlace para la factura */}
                  {entries.guiaUrl && (
                    <div>
                      <strong>Guia de Remision:</strong>{" "}
                      <a
                        href={getPdfGuiaUrl(entries.guiaUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        Ver Guia
                      </a>
                    </div>
                  )}                  
                </span>

                {/* Tabla de detalles */}
                <div className="mt-4">
                  <h3 className="text-lg font-bold">Detalles</h3>
                  <table className="table-auto w-full border-collapse border border-gray-300 mt-2">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 px-4 py-2">Producto</th>
                        <th className="border border-gray-300 px-4 py-2">Cant.</th>
                        <th className="border border-gray-300 px-4 py-2">Precio</th>
                        <th className="border border-gray-300 px-4 py-2">Series</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.details.map((detail, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-4 py-2">{detail.product_name}</td>
                          <td className="border border-gray-300 px-4 py-2">{detail.quantity}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            {entries.tipoMoneda === "PEN" ? "S/." : "$"} {detail.price.toFixed(2)}
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
                <AlertDialogCancel onClick={handleDialogViewClose}>Cerrar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </>
        )
      },
    },
   
]

