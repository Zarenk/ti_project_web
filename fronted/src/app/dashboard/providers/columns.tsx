'use client'
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from "lucide-react"
import { MoreHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { deleteProvider } from "./providers.api";

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


export type Providers = {
    id: string
    document: string
    documentNumber: number
    name: string
    description: string
    phone: string
    adress: string
    email: string
    website: string
    status: string
    createdAt: Date
}

export const columns: ColumnDef<Providers>[] = [
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
        accessorKey: 'document',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Tipo de Documento
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
    },
    {
      accessorKey: 'documentNumber',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            N° de Documento
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
              Descripcion
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

        const providers = row.original
        const [errorMessage, setErrorMessage] = useState<string | null>(null);

        const router = useRouter(); // Usa useRouter dentro del componente React
        const handleRemoveStore = async (id: string) => {
          try {
            //console.log(id)
            await deleteProvider(id); // Llama a la API para eliminar el producto
            toast.success("Proveedor eliminado correctamente."); // Notificación de éxito
            router.refresh(); // Refresca los datos de la página
          } catch (error: any) {
            toast.error(errorMessage || "No se pudo eliminar el/los provedor(es) porque tienen entradas relacionadas.");
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
                <Link href={`/dashboard/providers/${providers.id}/edit`}>
                Modificar
                </Link>
                </DropdownMenuItem>
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
                    await handleRemoveStore(providers.id)
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
                <AlertDialogTitle>Detalles del Proveedor</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogDescription>               
              </AlertDialogDescription>
                <span className="block space-y-2">
                  <div><strong>Nombre:</strong> {providers.name}</div>
                  <div><strong>Tipo de Documento:</strong> {providers.document}</div>
                  <div><strong>N° de Documento:</strong> {providers.documentNumber}</div>
                  <div><strong>Descripción:</strong> {providers.description}</div>
                  <div><strong>Telefono:</strong> {providers.phone}</div>
                  <div><strong>Direccion:</strong> {providers.adress}</div>
                  <div><strong>Email:</strong> {providers.email}</div>
                  <div><strong>Pagina Web:</strong> {providers.website}</div>
                  <div><strong>Estado:</strong> {providers.status}</div>
                  <div><strong>Fecha de Creación:</strong> {new Date(providers.createdAt).toLocaleDateString()}</div>
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