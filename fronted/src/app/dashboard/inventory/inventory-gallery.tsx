"use client"

import { useRouter } from "next/navigation"
import {
  Package,
  Calendar,
  ArrowRightLeft,
  Eye,
  Tag,
  Store,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { resolveImageUrl } from "@/lib/images"

interface InventoryGalleryItem {
  id: number | string
  product: {
    name: string
    category: string
    price?: number
    priceSell?: number
    image?: string | null
    images?: string[]
    isVerticalMigrated?: boolean | null
    extraAttributes?: Record<string, unknown> | null
  }
  stock: number
  createdAt: Date | string
  updateAt: Date | string
  storeOnInventory: {
    id: number
    stock: number
    store: { name: string }
  }[]
}

interface InventoryGalleryProps {
  data: InventoryGalleryItem[]
  onTransferProduct: (item: InventoryGalleryItem) => void
}

export function InventoryGallery({ data, onTransferProduct }: InventoryGalleryProps) {
  const router = useRouter()

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()

  const isLegacy = (item: InventoryGalleryItem) =>
    item.product.isVerticalMigrated === false ||
    !item.product.extraAttributes ||
    Object.keys(item.product.extraAttributes ?? {}).length === 0

  const getProductImage = (product: InventoryGalleryItem["product"]) => {
    const images = Array.isArray(product.images)
      ? product.images.filter(Boolean)
      : []
    if (images[0]) return resolveImageUrl(images[0])
    if (product.image) return resolveImageUrl(product.image)
    return null
  }

  return (
    <TooltipProvider delayDuration={200}>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay productos en inventario.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((item) => {
            const legacy = isLegacy(item)
            const hasStock = item.stock > 0
            const imageUrl = getProductImage(item.product)
            const updatedDate = item.updateAt
              ? new Date(item.updateAt).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : null
            const storeCount = item.storeOnInventory?.length ?? 0
            const storeNames = item.storeOnInventory
              ?.map((s) => s.store?.name)
              .filter(Boolean)
              .join(", ")

            return (
              <div
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 cursor-pointer"
                onDoubleClick={() => router.push(`/dashboard/inventory/product-details/${item.id}`)}
              >
                {/* Product image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/50">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.product.name}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                        {getInitials(item.product.name || "?")}
                      </div>
                    </div>
                  )}

                  {/* Floating badges on image */}
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                    {legacy && (
                      <Badge variant="destructive" className="text-[10px] shadow-sm">
                        Legacy
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className={`text-[10px] shadow-sm backdrop-blur-sm ${
                        hasStock
                          ? "border-emerald-500/30 bg-emerald-500/90 text-white dark:bg-emerald-600/90"
                          : "border-rose-500/30 bg-rose-500/90 text-white dark:bg-rose-600/90"
                      }`}
                    >
                      {hasStock ? `Stock: ${item.stock}` : "Sin stock"}
                    </Badge>
                  </div>
                </div>

                {/* Header: name */}
                <div className="p-3 pb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="truncate text-sm font-semibold leading-tight">
                        {item.product.name}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-xs font-medium">{item.product.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Details */}
                <div className="space-y-1 px-3 pb-2">
                  {/* Category */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        <span className="truncate text-[11px] text-muted-foreground">
                          {item.product.category || "Sin categoría"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{item.product.category || "Sin categoría"}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Prices */}
                  <div className="flex items-center gap-3 text-[11px]">
                    {Number.isFinite(item.product.price) && (item.product.price ?? 0) > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground">
                            Compra: <span className="font-medium tabular-nums text-foreground">S/. {item.product.price!.toFixed(2)}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Precio de compra</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {Number.isFinite(item.product.priceSell) && (item.product.priceSell ?? 0) > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground">
                            Venta: <span className="font-medium tabular-nums text-foreground">S/. {item.product.priceSell!.toFixed(2)}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Precio de venta</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Store count */}
                  {storeCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          <Store className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          <span className="text-[10px] text-muted-foreground/70">
                            En {storeCount} tienda{storeCount > 1 ? "s" : ""}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px]">
                        <p className="text-xs">{storeNames || "Sin tiendas asignadas"}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Date footer */}
                <div className="mt-auto border-t px-3 py-2">
                  {updatedDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground">
                        Actualizado: {updatedDate}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 border-t px-3 py-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-[11px]"
                        onClick={() => router.push(`/dashboard/inventory/product-details/${item.id}`)}
                      >
                        <Eye className="h-3 w-3" />
                        Ver Info
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Ver detalles del producto</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-[11px] text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                        onClick={() => onTransferProduct(item as any)}
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        Transferir
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Transferir stock entre tiendas</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </TooltipProvider>
  )
}
