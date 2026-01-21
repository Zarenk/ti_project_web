'use client'

import { useMemo, useState } from 'react'
import Link from "next/link"
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Loader2, MoreHorizontal } from "lucide-react"
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { normalizeProductStatus } from './status.utils'
import { deleteProduct } from "./products.api";
import { DeleteActionsGuard } from "@/components/delete-actions-guard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { VerticalProductSchema } from "@/app/dashboard/tenancy/tenancy.api"

type ProductFeature = {
  title?: string | null
  description?: string | null
  icon?: string | null
} | null

export type Products = {
  id: string
  name: string
  description: string
  brand?: {
    name?: string
    logoSvg?: string
    logoPng?: string
  } | string | null
  price: number
  priceSell: number
  status?: string | null
  createdAt: Date
  category: {
    id: string
    name: string
  }
  category_name: string
  features?: ProductFeature[] | null
  extraAttributes?: Record<string, unknown> | null
  isVerticalMigrated?: boolean | null
}

export type ProductTableOptions = {
  verticalName?: string
  productSchema?: VerticalProductSchema | null
}

export function useProductColumns(options: ProductTableOptions = {}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const schemaFields = options.productSchema?.fields ?? []
  const hasSizeField = schemaFields.some((field) => field.key === "size")
  const hasColorField = schemaFields.some((field) => field.key === "color")
  const hasLotField =
    schemaFields.some((field) => field.key === "lot_number") ||
    schemaFields.some((field) => field.key === "expiration_date")

  const columns = useMemo<ColumnDef<Products>[]>(() => {
    const baseColumns: ColumnDef<Products>[] = [
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
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Nombre
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const name = row.getValue('name') as string
          const isLegacy =
            row.original.isVerticalMigrated === false ||
            !row.original.extraAttributes ||
            Object.keys(row.original.extraAttributes ?? {}).length === 0
          const priceMissing = !Number.isFinite(row.original.price) || row.original.price <= 0
          const priceSellMissing =
            !Number.isFinite(row.original.priceSell) || row.original.priceSell <= 0
          return (
            <div className="flex flex-col gap-1">
              <span className="font-medium">{name}</span>
              {(isLegacy || priceMissing || priceSellMissing) && (
                <div className="flex flex-col items-start gap-1">
                  {isLegacy && (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive" className="cursor-help px-1.5 py-0.5 text-[10px]">
                            Pendiente de migración
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Este producto aún no cumple el esquema del vertical.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {priceMissing && (
                    <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">
                      Sin precio compra
                    </Badge>
                  )}
                  {priceSellMissing && (
                    <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">
                      Sin precio venta
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'category_name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Categoria
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const category = row.original.category
          return <div className="font-medium">{category?.name || 'Sin categoria'}</div>
        },
        filterFn: (row, _columnId, filterValue) => {
          return filterValue.includes(row.original.category?.id)
        },
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Descripcion
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const description = (row.getValue("description") as string | null) ?? ""

          if (!description.trim()) {
            return <span className="text-xs text-muted-foreground">Sin descripcion</span>
          }

          return (
            <div className="max-w-[260px] text-xs text-muted-foreground">
              <p className="line-clamp-2 whitespace-pre-line break-words lg:line-clamp-3">
                {description}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'brand',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Marca
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const brand = row.original.brand
          if (typeof brand === "string") {
            return <div className="font-medium">{brand}</div>
          }
          return <div className="font-medium">{brand?.name || "Sin marca"}</div>
        },
      },
      {
        accessorKey: 'price',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio Compra
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'priceSell',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio Venta
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Estado
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = row.getValue('status') as string | null
          return <div className="font-medium">{normalizeProductStatus(status)}</div>
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Fecha
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.getValue('createdAt') as Date)
          return <div>{date.toLocaleDateString()}</div>
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const product = row.original
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/products/${product.id}`}>
                      Ver detalle
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/products/${product.id}/edit`}>
                      Editar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onSelect={(event) => event.preventDefault()}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminará el producto y sus variantes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <DeleteActionsGuard>
                          <AlertDialogAction
                            className="bg-red-500 text-white hover:bg-red-600"
                            onClick={async () => {
                              setLoadingId(product.id)
                              try {
                                await deleteProduct(product.id)
                                toast.success("Producto eliminado.")
                                router.refresh()
                              } catch (error) {
                                const message =
                                  error instanceof Error ? error.message : "No se pudo eliminar el producto."
                                toast.error(message)
                              } finally {
                                setLoadingId(null)
                              }
                            }}
                          >
                            {loadingId === product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Eliminar"
                            )}
                          </AlertDialogAction>
                        </DeleteActionsGuard>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ]

    const dynamicColumns: ColumnDef<Products>[] = []
    if (hasSizeField) {
      dynamicColumns.push({
        accessorKey: 'extraAttributes.size',
        header: () => <span>Talla</span>,
        cell: ({ row }) => {
          const value = row.original.extraAttributes?.size
          return <div className="text-sm">{typeof value === 'string' ? value : '—'}</div>
        },
      })
    }

    if (hasColorField) {
      dynamicColumns.push({
        accessorKey: 'extraAttributes.color',
        header: () => <span>Color</span>,
        cell: ({ row }) => {
          const value = row.original.extraAttributes?.color
          if (typeof value !== 'string') return <div className="text-sm">—</div>
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: value }} />
              {value}
            </div>
          )
        },
      })
    }

    if (hasLotField) {
      dynamicColumns.push({
        accessorKey: 'extraAttributes.lot_number',
        header: () => <span>Lote</span>,
        cell: ({ row }) => {
          const attrs = row.original.extraAttributes ?? {}
          const lot = typeof attrs?.lot_number === 'string' ? attrs.lot_number : null
          const expiration = typeof attrs?.expiration_date === 'string' ? attrs.expiration_date : null
          if (!lot && !expiration) return <div className="text-sm">—</div>
          return (
            <div className="space-y-0.5 text-xs">
              {lot && <div>Lote: {lot}</div>}
              {expiration && <div>Vence: {expiration}</div>}
            </div>
          )
        },
      })
    }

    return [...baseColumns, ...dynamicColumns]
  }, [hasSizeField, hasColorField, hasLotField, router, loadingId])

  return columns
}
