"use client"

import { X, ShoppingCart, Package, Plus, Minus, Barcode, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import type { ProductCardItem } from "./product-card"

export type CartItem = {
  product: ProductCardItem
  quantity: number
  unitPrice: number
}

type CartSidebarProps = {
  items: CartItem[]
  onUpdateQty: (productId: number, qty: number) => void
  onUpdatePrice: (productId: number, price: number) => void
  onRemove: (productId: number) => void
  onSubmit: () => void
  isSubmitting: boolean
  contextHint?: string
  serialsEnabled?: boolean
  serialsMap?: Map<number, string[]>
  onSerialClick?: (productId: number) => void
}

export function CartSidebar({
  items,
  onUpdateQty,
  onUpdatePrice,
  onRemove,
  onSubmit,
  isSubmitting,
  contextHint,
  serialsEnabled,
  serialsMap,
  onSerialClick,
}: CartSidebarProps) {
  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  )
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Card className="flex max-h-[calc(100vh-8rem)] flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-4 w-4" />
          Ingreso
          {items.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Package className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Haz clic en los productos para agregarlos
            </p>
          </div>
        ) : (
          items.map((item) => {
            const images = Array.isArray(item.product.images)
              ? item.product.images.filter(Boolean)
              : []
            const imageUrl = images[0]
              ? resolveImageUrl(images[0])
              : null
            const subtotal = item.quantity * item.unitPrice
            const serialCount = serialsMap?.get(item.product.id)?.length ?? 0

            return (
              <div
                key={item.product.id}
                className="group/item rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted/20"
              >
                {/* Top row: thumbnail + name + remove */}
                <div className="flex items-start gap-2.5">
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted/30">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-muted-foreground/60">
                        {item.product.category_name || "Sin categoria"}
                      </span>
                      {serialsEnabled && onSerialClick && (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded px-1 py-0.5 cursor-pointer transition-all duration-200",
                            "hover:bg-blue-500/10 hover:shadow-[0_0_6px_rgba(59,130,246,0.25)]",
                            serialCount > 0
                              ? "bg-blue-500/10"
                              : "bg-transparent",
                          )}
                          onClick={() => onSerialClick(item.product.id)}
                        >
                          <Barcode className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                          {serialCount > 0 && (
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                              {serialCount}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 cursor-pointer opacity-0 transition-opacity group-hover/item:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item.product.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Bottom row: qty controls + price + subtotal */}
                <div className="mt-2 flex items-center gap-2">
                  {/* Quantity stepper */}
                  <div className="flex items-center rounded-md border bg-muted/30">
                    <button
                      type="button"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() =>
                        onUpdateQty(
                          item.product.id,
                          Math.max(1, item.quantity - 1),
                        )
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[2rem] text-center text-xs font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() =>
                        onUpdateQty(item.product.id, item.quantity + 1)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="text-xs text-muted-foreground/50">x</span>

                  {/* Price input */}
                  <div className="flex items-center gap-0.5 rounded-md border bg-muted/30 px-1.5">
                    <span className="text-[10px] text-muted-foreground/60">S/.</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) =>
                        onUpdatePrice(
                          item.product.id,
                          Math.max(0, parseFloat(e.target.value) || 0),
                        )
                      }
                      className="h-6 w-16 border-0 bg-transparent px-0.5 text-xs text-center shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>

                  {/* Subtotal */}
                  <span className="ml-auto text-sm font-semibold tabular-nums">
                    {subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </CardContent>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span className="tabular-nums">S/. {total.toFixed(2)}</span>
        </div>
        <Button
          className="w-full cursor-pointer"
          onClick={onSubmit}
          disabled={items.length === 0 || isSubmitting}
        >
          {isSubmitting ? "Creando ingreso..." : "Crear Ingreso"}
        </Button>
        {contextHint && items.length > 0 && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {contextHint}
          </p>
        )}
      </div>
    </Card>
  )
}

export { CartSidebar as CartSidebarMobileContent }
