'use client'
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from "lucide-react"

import { MoreHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

import { deleteProduct } from "./products.api";

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


export type Products = {
    id: string
    name: string
    description: string
    brand?: string
    price: number
    priceSell: number
    status: string
    createdAt: Date
    category: {
      id: string;
      name: string; // Incluye el nombre de la categoría
    };
    category_name: string; // Incluye el nombre de la categoría
}

export const columns: ColumnDef<Products>[] = [
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
      accessorKey: 'category_name', // Accede al nombre de la categoría
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Categoria
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const category = row.original.category; // Accede a la categoría desde los datos de la fila
        return <div className="font-medium">{category?.name || 'Sin categoría'}</div>;
      },
      filterFn: (row, columnId, filterValue) => { // no elimines el columnId
        // Filtra las filas basándose en el ID de la categoría
        return filterValue.includes(row.original.category?.id);
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
        accessorKey: 'brand',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Marca
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
    },  
    {
        accessorKey: 'price',
        header: ({ column }) => {
            return (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Precio Compra
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            )
        },
    },
    {
        accessorKey: 'priceSell',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Precio Venta
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

        const products = row.original

        const router = useRouter(); // Usa useRouter dentro del componente React
        const handleRemoveProduct = async (id: string) => {
          try {
            //console.log(id)
            await deleteProduct(id); // Llama a la API para eliminar el producto
            toast.success("Producto eliminado correctamente."); // Notificación de éxito
            router.refresh(); // Refresca los datos de la página
          } catch (error: any) {
            toast.error(error.message || "No se pudo eliminar el producto(s).");
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
                <Link href={`/dashboard/products/${products.id}/edit`}>
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
                    await handleRemoveProduct(products.id)
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
                  <div><strong>Nombre:</strong> {products.name}</div>
                  <div><strong>Descripción:</strong> {products.description}</div>
                  <div><strong>Precio Compra:</strong> S/. {products.price}</div>
                  <div><strong>Precio Venta:</strong> S/. {products.priceSell}</div>
                  <div><strong>Marca:</strong> {products.brand || 'Sin marca'}</div>
                  <div><strong>Estado:</strong> {products.status}</div>
                  <div><strong>Categoría:</strong> {products.category?.name || "Sin categoría"}</div>
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