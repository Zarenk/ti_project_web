"use client"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { Package, Tag, Hash, DollarSign, BarChart3 } from "lucide-react"
import type { ReactNode } from "react"

interface Product {
  id: number
  name: string
  price: number
  priceSell: number
  quantity: number
  category_name: string
  series?: string[]
}

interface Props {
  product: Product
  children: ReactNode
}

export function ProductTooltipCard({ product, children }: Props) {
  const totalPurchase = product.price * product.quantity

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-72 p-3 space-y-2.5"
      >
        {/* Product name */}
        <div className="flex items-start gap-2">
          <Package className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold break-words leading-tight">
            {product.name}
          </p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Tag className="h-3 w-3 flex-shrink-0" />
            <span>Categoría</span>
          </div>
          <span className="text-xs font-medium truncate">
            {product.category_name || "Sin categoría"}
          </span>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Hash className="h-3 w-3 flex-shrink-0" />
            <span>Cantidad</span>
          </div>
          <span className="text-xs font-medium">{product.quantity}</span>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span>P. Compra</span>
          </div>
          <span className="text-xs font-medium">
            S/ {product.price.toFixed(2)}
          </span>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span>P. Venta</span>
          </div>
          <span className="text-xs font-medium">
            S/ {product.priceSell.toFixed(2)}
          </span>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BarChart3 className="h-3 w-3 flex-shrink-0" />
            <span>Total Compra</span>
          </div>
          <span className="text-xs font-bold">
            S/ {totalPurchase.toFixed(2)}
          </span>
        </div>

        {/* Series */}
        {product.series && product.series.length > 0 && (
          <div className="pt-1.5 border-t space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              Series ({product.series.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {product.series.slice(0, 8).map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="text-[10px] font-mono px-1.5 py-0"
                >
                  {s}
                </Badge>
              ))}
              {product.series.length > 8 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{product.series.length - 8} más
                </Badge>
              )}
            </div>
          </div>
        )}

        {(!product.series || product.series.length === 0) && (
          <p className="text-xs text-muted-foreground italic pt-1 border-t">
            Sin series registradas
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
