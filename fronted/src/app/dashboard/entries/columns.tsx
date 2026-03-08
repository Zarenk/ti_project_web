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
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useTenantSelection } from '@/context/tenant-selection-context';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { deleteEntry, postDraftEntry, cancelEntry, getPdfGuiaUrl, getPdfUrl } from './entries.api';
import { DeleteActionsGuard } from '@/components/delete-actions-guard';
import { InvoiceSampleStatus } from './components/invoice-sample-status';


export type Entryes = {
    id: string
    createdAt: Date
    tipoMoneda: string
    date: Date
    description?: string
    status?: string
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

export const getColumns = (onView?: (rowData: Entryes) => void): ColumnDef<Entryes>[] => [
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
      id: 'invoiceProcessing',
      header: 'Procesamiento PDF',
      cell: ({ row }) => (
        <InvoiceSampleStatus entryId={Number(row.original.id)} />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.original.status || 'POSTED';
        if (status === 'DRAFT') {
          return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Borrador</Badge>;
        }
        if (status === 'CANCELED') {
          return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Anulado</Badge>;
        }
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Registrado</Badge>;
      },
      filterFn: (row, columnId, filterValue) => {
        const status = (row.original as any).status || 'POSTED';
        return filterValue.includes(status);
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
            const store = row.original.store;
            const name = store?.name || 'Sin tienda';
            return <div className="font-medium truncate" title={name}>{name}</div>;
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
            const user = row.original.user;
            const name = user?.username || 'Sin usuario';
            return <div className="font-medium truncate" title={name}>{name}</div>;
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
            const provider = row.original.provider;
            const name = provider?.name || 'Sin proveedor';
            return <div className="font-medium truncate" title={name}>{name}</div>;
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
        const status = entries.status || 'POSTED';

        const router = useRouter();
        const queryClient = useQueryClient();
        const { selection } = useTenantSelection();

        const invalidateAll = () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.entries.root(selection.orgId, selection.companyId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.inventory.root(selection.orgId, selection.companyId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.products.root(selection.orgId, selection.companyId) });
        };

        const handleRemoveEntry = async (id: number) => {
          try {
            await deleteEntry(id);
            toast.success("Registro eliminado correctamente.");
            invalidateAll();
          } catch (error: any) {
            toast.error(error.message || "No se pudo eliminar el registro.");
          }
        };

        const handlePostDraft = async (id: number) => {
          try {
            await postDraftEntry(id);
            toast.success("Entrada confirmada y registrada correctamente.");
            invalidateAll();
          } catch (error: any) {
            toast.error(error.message || "No se pudo confirmar la entrada.");
          }
        };

        const handleCancelEntry = async (id: number) => {
          try {
            await cancelEntry(id);
            toast.success("Entrada anulada correctamente.");
            invalidateAll();
          } catch (error: any) {
            toast.error(error.message || "No se pudo anular la entrada.");
          }
        };

        const [isDialogOpen, setIsDialogOpen] = useState(false)
        const [dialogAction, setDialogAction] = useState<'delete' | 'post' | 'cancel'>('delete');

        const dialogConfig = {
          delete: {
            title: '¿Eliminar esta entrada?',
            description: 'Esta acción no se puede deshacer. Se eliminará permanentemente la entrada.',
            action: () => handleRemoveEntry(Number(entries.id)),
          },
          post: {
            title: '¿Confirmar y registrar esta entrada?',
            description: 'Esto aplicará el stock al inventario y creará los registros contables. Una vez confirmada, no se podrá editar.',
            action: () => handlePostDraft(Number(entries.id)),
          },
          cancel: {
            title: '¿Anular esta entrada?',
            description: 'Se revertirá el stock del inventario. Las series asociadas quedarán inactivas. Esta acción no se puede deshacer.',
            action: () => handleCancelEntry(Number(entries.id)),
          },
        };

        return (
          <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                <span className="sr-only">Abrir Menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => {
                  if (onView) {
                    onView(entries);
                  }
                }}>
                Visualizar
                </DropdownMenuItem>

                {/* DRAFT actions: Edit, Confirm, Delete */}
                {status === 'DRAFT' && (
                  <>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/entries/new?draftId=${entries.id}`)}
                    >
                      Editar borrador
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-green-700"
                      onClick={() => {
                        setDialogAction('post');
                        setIsDialogOpen(true);
                      }}
                    >
                      Confirmar y registrar
                    </DropdownMenuItem>
                    <DeleteActionsGuard>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setDialogAction('delete');
                          setIsDialogOpen(true);
                        }}
                      >
                        Eliminar borrador
                      </DropdownMenuItem>
                    </DeleteActionsGuard>
                  </>
                )}

                {/* POSTED actions: Cancel */}
                {status === 'POSTED' && (
                  <DeleteActionsGuard>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600"
                      onClick={() => {
                        setDialogAction('cancel');
                        setIsDialogOpen(true);
                      }}
                    >
                      Anular entrada
                    </DropdownMenuItem>
                  </DeleteActionsGuard>
                )}

                {/* CANCELED: view only, no extra actions */}
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) setIsDialogOpen(false);
          }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{dialogConfig[dialogAction].title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {dialogConfig[dialogAction].description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  className="cursor-pointer"
                  onClick={async () => {
                    await dialogConfig[dialogAction].action();
                    setIsDialogOpen(false);
                  }}
                >
                  Continuar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </>
        )
      },
    },
   
];

