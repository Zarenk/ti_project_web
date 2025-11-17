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
import { deleteCategory } from './categories.api';

import { toast } from 'sonner';
import { DeleteActionsGuard } from '@/components/delete-actions-guard';


export type Categories = {
    id: string
    name: string
    description: string
    status: string
    image: string
    createdAt: Date
}

export const columns: ColumnDef<Categories>[] = [
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
        header: 'Descripcion'
    },
    {
        accessorKey: 'status',
        header: 'Estado'
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

        const category = row.original
        const [errorMessage, setErrorMessage] = useState<string | null>(null);

        const router = useRouter(); // Usa useRouter dentro del componente React
        const handleRemoveCategory = async (id: string) => {
          try {
            //console.log(id)
            await deleteCategory(id); // Llama a la API para eliminar el producto
            toast.success("Categoría eliminada correctamente."); // Notificación de éxito
            router.refresh(); // Refresca los datos de la página}
            
          } catch (error) {
            toast.error(errorMessage|| "No se pudo eliminar la categoria porque esta relacionada con un producto")
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
                <Link href={`/dashboard/categories/${category.id}/edit`} prefetch={false}>
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
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la categoria.
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
                      await handleRemoveCategory(category.id);
                      setIsDialogOpen(false);
                    }}
                  >
                    Continuar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DeleteActionsGuard>

          {/* Diálogo de Visualización */}
          <AlertDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Detalles de la Categoria</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogDescription>             
              </AlertDialogDescription>
                <span className="block space-y-2">
                  <div><strong>Nombre:</strong> {category.name}</div>
                  <div><strong>Descripción:</strong> {category.description}</div>
                  <div><strong>Estado:</strong> {category.status}</div>
                  <div><strong>Fecha de Creación:</strong> {new Date(category.createdAt).toLocaleDateString()}</div>
                </span>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleDialogClose}>Cerrar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </>
        )
      },
    },
   
]
