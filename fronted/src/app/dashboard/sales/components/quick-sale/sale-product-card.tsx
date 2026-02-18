"use client"

import { useState } from "react"
import { Package, Plus, Minus, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { resolveImageUrl } from "@/lib/images"

type ProductFeature = {
  title?: string | null
  description?: string | null
} | null

export type SaleProductCardItem = {
  id: number
  name: string
  description?: string
  price: number
  priceSell: number
  categoryId?: number | string | null
  category_name?: string | null
  images?: string[]
  specification?: Record<string, string | null>
  brand?: string | { name?: string }
  features?: ProductFeature[]
  extraAttributes?: Record<string, unknown>
  stock: number
}

type SaleProductCardProps = {
  product: SaleProductCardItem
  cartQuantity: number
  maxStock: number
  onAdd: () => void
  onIncrement: () => void
  onDecrement: () => void
}

const SPEC_KEYS = ["processor", "ram", "storage"] as const

const SPEC_LABELS: Record<string, string> = {
  processor: "Procesador",
  ram: "RAM",
  storage: "Almacenamiento",
  graphics: "Graficos",
  screen: "Pantalla",
  resolution: "Resolucion",
  refreshRate: "Tasa de refresco",
  connectivity: "Conectividad",
}

function getSpecSummary(spec?: Record<string, string | null>): string | null {
  if (!spec) return null
  const parts = SPEC_KEYS.map((k) => spec[k]).filter(Boolean)
  return parts.length > 0 ? parts.join(" / ") : null
}

function hasDetailContent(product: SaleProductCardItem): boolean {
  if (product.description) return true
  const features = (product.features ?? []).filter(
    (f): f is NonNullable<typeof f> => !!f && !!(f.title || f.description),
  )
  if (features.length > 0) return true
  const spec = product.specification
  if (spec) {
    const entries = Object.entries(spec).filter(
      ([key, v]) =>
        v != null &&
        v !== "" &&
        !["id", "productId", "createdAt", "updatedAt"].includes(key),
    )
    if (entries.length > 0) return true
  }
  const extras = Object.entries(product.extraAttributes ?? {}).filter(
    ([, v]) => v != null && v !== "",
  )
  if (extras.length > 0) return true
  return false
}

export function SaleProductCard({
  product,
  cartQuantity,
  maxStock,
  onAdd,
  onIncrement,
  onDecrement,
}: SaleProductCardProps) {
  const [showDetail, setShowDetail] = useState(false)

  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : []
  const imageUrl = images[0] ? resolveImageUrl(images[0]) : null
  const specSummary = getSpecSummary(product.specification)
  const brandName =
    typeof product.brand === "string"
      ? product.brand
      : product.brand?.name || null
  const inCart = cartQuantity > 0
  const hasDetail = hasDetailContent(product)
  const outOfStock = maxStock === 0
  const canAdd = maxStock > 0 && cartQuantity < maxStock

  const features = (product.features ?? []).filter(
    (f): f is NonNullable<typeof f> => !!f && !!(f.title || f.description),
  )
  const specEntries = Object.entries(product.specification ?? {}).filter(
    ([key, v]) =>
      v != null &&
      v !== "" &&
      !["id", "productId", "createdAt", "updatedAt"].includes(key),
  )
  const extraEntries = Object.entries(product.extraAttributes ?? {}).filter(
    ([, v]) => v != null && v !== "",
  )

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-0.5 ${
        outOfStock
          ? "opacity-60"
          : inCart
            ? "border-primary/40 ring-1 ring-primary/20 hover:shadow-primary/10"
            : "hover:border-blue-400/40 hover:shadow-blue-500/10 dark:hover:border-blue-500/30 dark:hover:shadow-blue-500/15"
      }`}
    >
      {/* Image */}
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden bg-muted/30 ${canAdd ? "cursor-pointer" : ""}`}
        onClick={canAdd ? (inCart ? onIncrement : onAdd) : undefined}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105 group-hover:brightness-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center transition-colors duration-300 group-hover:bg-muted/50">
            <Package className="h-10 w-10 text-muted-foreground/20 transition-colors duration-300 group-hover:text-muted-foreground/40" />
          </div>
        )}

        {/* Hover blue overlay */}
        {!outOfStock && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-blue-500/0 transition-all duration-300 group-hover:to-blue-500/15 dark:group-hover:to-blue-400/10" />
        )}

        {/* Cart quantity badge */}
        {inCart && (
          <Badge className="absolute right-2 top-2 bg-primary text-primary-foreground shadow-md">
            {cartQuantity}
          </Badge>
        )}

        {/* Category badge on image */}
        {product.category_name && (
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 bg-background/80 text-[11px] font-medium backdrop-blur-sm"
          >
            {product.category_name}
          </Badge>
        )}

        {/* Stock badge */}
        <Badge
          variant={outOfStock ? "destructive" : "secondary"}
          className="absolute bottom-2 right-2 bg-background/80 text-[10px] font-medium backdrop-blur-sm"
        >
          Stock: {maxStock}
        </Badge>

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
            <Badge variant="destructive" className="text-xs">
              Agotado
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="text-xs font-semibold leading-tight cursor-default">
                  {product.name}
                </h3>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px]">
                <p className="text-xs font-medium">{product.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {hasDetail && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                setShowDetail(!showDetail)
              }}
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!product.category_name && (
            <span className="text-xs text-muted-foreground">Sin categoria</span>
          )}
          {brandName && (
            <span className="truncate text-xs text-muted-foreground">
              {brandName}
            </span>
          )}
        </div>

        {/* Specs summary (COMPUTERS) */}
        {specSummary && (
          <p className="truncate text-xs text-muted-foreground/80">
            {specSummary}
          </p>
        )}

        {/* Price + controls */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground">Precio venta</span>
            <span className="text-sm font-semibold">
              {Number.isFinite(product.priceSell) && product.priceSell > 0
                ? `S/. ${product.priceSell.toFixed(2)}`
                : "—"}
            </span>
          </div>

          {cartQuantity === 0 ? (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 cursor-pointer rounded-lg"
              onClick={onAdd}
              disabled={!canAdd}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 cursor-pointer rounded-lg"
                onClick={onDecrement}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="min-w-[1.5rem] text-center text-sm font-semibold">
                {cartQuantity}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 cursor-pointer rounded-lg"
                onClick={onIncrement}
                disabled={cartQuantity >= maxStock}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Expandable detail panel */}
      {showDetail && (
        <div className="border-t bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Detalles
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 cursor-pointer text-muted-foreground"
              onClick={() => setShowDetail(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {/* Features */}
          {features.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Caracteristicas
              </span>
              {features.map((f, i) => (
                <div key={i} className="rounded bg-muted/40 px-2 py-1">
                  {f.title && (
                    <span className="text-[11px] font-semibold">{f.title}</span>
                  )}
                  {f.description && (
                    <p className="text-[10px] text-muted-foreground">
                      {f.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Full specs */}
          {specEntries.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Especificaciones
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {specEntries.map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="truncate text-[10px] text-muted-foreground/60">
                      {SPEC_LABELS[key] ?? key}
                    </span>
                    <span className="truncate text-[11px] font-medium">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra attributes */}
          {extraEntries.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Atributos adicionales
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {extraEntries.map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="truncate text-[10px] capitalize text-muted-foreground/60">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="truncate text-[11px] font-medium">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
