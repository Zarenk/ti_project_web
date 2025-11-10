'use client'
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from "lucide-react"
import { MoreHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { deleteStore } from "./stores.api";

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
import { DeleteActionsGuard } from '@/components/delete-actions-guard';
import { toast } from 'sonner';


export type Stores = {
    id: string
    name: string
    description: string
    ruc: string
    phone: string
    adress: string
    email: string
    website: string
    status: string
    createdAt: Date
}

export const columns: ColumnDef<Stores>[] = [
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
        accessorKey: 'name',
        header: ({ column }) => {
            return (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Nombre
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            )
        },
    },
    {
        accessorKey: 'description',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Descripcion / Razon S.
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
    },
    {
      accessorKey: 'ruc',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            RUC
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
        accessorKey: 'phone',
        header: ({ column }) => {
            return (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Telefono
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            )
        },
    },
    {
        accessorKey: 'adress',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Direccion
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
    },
    {
        accessorKey: 'email',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Email
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
    },
    {
        accessorKey: 'website',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Pagina Web
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
    },
    {
        accessorKey: 'status',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Estado
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
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
            const formatted = date.toLocaleDateString()
            return <div className='font-medium'>{formatted}</div>
        }
    },
    {
      id: "actions",
      cell: ({ row }) => {

        const stores = row.original

        const router = useRouter(); // Usa useRouter dentro del componente React
        const handleRemoveStore = async (id: string) => {
          try {
            //console.log(id)
            await deleteStore(id); // Llama a la API para eliminar el producto
            toast.success("Tienda eliminada correctamente."); // Notificación de éxito
            router.refresh(); // Refresca los datos de la página
          } catch (error: any) {
            toast.error(error.message || "No se pudo eliminar la(s) tienda(s).");
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
              <DropdownMenuItem>
                <Link href={`/dashboard/stores/${stores.id}/edit`} prefetch={false}>
                Modificar
                </Link>
                </DropdownMenuItem>
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
                    await handleRemoveStore(stores.id)
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
                <AlertDialogTitle>Detalles de la tienda</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogDescription>               
              </AlertDialogDescription>
                <span className="block space-y-2">
                  <div><strong>Nombre:</strong> {stores.name}</div>
                  <div><strong>Descripción:</strong> {stores.description}</div>
                  <div><strong>RUC:</strong> {stores.ruc}</div>
                  <div><strong>Telefono:</strong> {stores.phone}</div>
                  <div><strong>Direccion:</strong> {stores.adress}</div>
                  <div><strong>Email:</strong> {stores.email}</div>
                  <div><strong>Pagina Web:</strong> {stores.website}</div>
                  <div><strong>Estado:</strong> {stores.status}</div>
                  <div><strong>Fecha de Creación:</strong> {new Date(stores.createdAt).toLocaleDateString()}</div>
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

