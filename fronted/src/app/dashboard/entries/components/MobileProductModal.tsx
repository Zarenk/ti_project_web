import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Hash, Layers, Package, Settings2, ShoppingCart, Tag, Trash2, X } from "lucide-react"

interface Product {
  id: number
  name: string
  price: number
  priceSell: number
  quantity: number
  category_name: string
  series?: string[]
}

interface CategoryOption {
  id: number
  name: string
}

interface MobileProductModalProps {
  product: Product | null
  onClose: () => void
  onUpdate: (updates: Partial<Product>) => void
  onRemove: () => void
  onManageSeries: () => void
  categories: CategoryOption[]
}

export function MobileProductModal({
  product,
  onClose,
  onUpdate,
  onRemove,
  onManageSeries,
  categories,
}: MobileProductModalProps) {
  if (!product) return null

  const totalPrice = (Number(product.quantity) * Number(product.price || 0)).toFixed(2)
  const seriesCount = product.series?.length ?? 0

  return (
    <Dialog
      open={!!product}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-lg !flex !flex-col !p-0 !gap-0 max-h-[90dvh] overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            Detalle del producto
          </DialogTitle>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        {/* ── Scrollable content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-4 sm:px-5 py-4 space-y-4">

            {/* Product name + ID */}
            <div className="rounded-lg border bg-muted/30 p-3 w-full min-w-0 overflow-hidden">
              <p className="font-semibold text-sm sm:text-base break-words leading-snug">
                {product.name}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                  <Hash className="h-2.5 w-2.5" />
                  {product.id}
                </Badge>
                {seriesCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Layers className="h-2.5 w-2.5" />
                    {seriesCount} {seriesCount === 1 ? "serie" : "series"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-category" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                Categoría
              </Label>
              <Select
                value={product.category_name || "__none__"}
                onValueChange={(value) =>
                  onUpdate({ category_name: value === "__none__" ? "" : value })
                }
              >
                <SelectTrigger id="modal-category" className="w-full cursor-pointer">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="cursor-pointer">Sin categoría</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name} className="cursor-pointer">
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-quantity" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ShoppingCart className="h-3 w-3" />
                Cantidad
              </Label>
              <Input
                id="modal-quantity"
                type="number"
                min={1}
                value={product.quantity}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isNaN(value) || value <= 0) return
                  onUpdate({ quantity: value })
                }}
              />
            </div>

            {/* Prices — always 2 columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="modal-price" className="text-xs font-medium text-muted-foreground">
                  Precio compra
                </Label>
                <Input
                  id="modal-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={product.price}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (Number.isNaN(value) || value < 0) return
                    onUpdate({ price: value })
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-priceSell" className="text-xs font-medium text-muted-foreground">
                  Precio venta
                </Label>
                <Input
                  id="modal-priceSell"
                  type="number"
                  min={0}
                  step="0.01"
                  value={product.priceSell ?? ""}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (Number.isNaN(value) || value < 0) return
                    onUpdate({ priceSell: value })
                  }}
                />
              </div>
            </div>

            {/* Summary card */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resumen
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Precio total</span>
                <span className="font-semibold tabular-nums">S/. {totalPrice}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Series</span>
                <span className="text-muted-foreground">
                  {seriesCount > 0
                    ? `${seriesCount} registrada${seriesCount > 1 ? "s" : ""}`
                    : "Sin series"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="flex-shrink-0" />

        {/* ── Footer actions ── */}
        <DialogFooter className="px-4 sm:px-5 py-3 sm:py-4 flex-shrink-0">
          <div className="flex flex-col gap-2 w-full min-w-0">
            {/* Action buttons row */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onManageSeries}
                className="cursor-pointer gap-1.5 text-xs sm:text-sm"
              >
                <Settings2 className="h-3.5 w-3.5 flex-shrink-0" />
                Series
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onRemove}
                className="cursor-pointer gap-1.5 text-xs sm:text-sm"
              >
                <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                Quitar
              </Button>
            </div>
            {/* Close button */}
            <Button onClick={onClose} className="w-full cursor-pointer">
              <X className="h-4 w-4 mr-1.5" />
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
