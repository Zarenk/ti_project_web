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
import Link from "next/link"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StringDecoder } from 'string_decoder';
import { deleteEntry } from './entries.api';


export type Entryes = {
    id: string
    createdAt: Date
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
    details: { product: string; quantity: number; price: number }[];
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
          },
          filterFn: (row, columnId, filterValue) => { // no elimines el columnId
            // Filtra las filas basándose en el ID de la categoría
            return filterValue.includes(row.original.provider?.id);
        },
    },
    {
      id: "actions",
      cell: ({ row }) => {

        const products = row.original

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
                <DropdownMenuItem onClick={() => setIsDialogOpen(true)}
                >
                Eliminar
              </DropdownMenuItem>             
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
                    await handleRemoveEntry(Number(products.id))
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
                <AlertDialogTitle>Detalles del Producto</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogDescription>               
              </AlertDialogDescription>
                <span className="block space-y-2">
                  <div><strong>Fecha de Creación:</strong> {new Date(products.createdAt).toLocaleDateString()}</div>
                </span>
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