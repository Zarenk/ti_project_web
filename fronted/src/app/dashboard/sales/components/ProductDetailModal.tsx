import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ProductDetailModalProps {
  product: {
    id: number
    name: string
    price: number
    quantity: number
    category_name: string
    series?: string[]
  } | null
  onClose: () => void
  onUpdate: (updates: { quantity: number; price: number }) => void
  onRemove: () => void
  onManageSeries: () => void
}

export function ProductDetailModal({
  product,
  onClose,
  onUpdate,
  onRemove,
  onManageSeries,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState<number>(product?.quantity ?? 1)
  const [price, setPrice] = useState<number>(product?.price ?? 0)
  const [errors, setErrors] = useState<{ quantity?: string; price?: string }>({})

  useEffect(() => {
    if (!product) return
    setQuantity(product.quantity)
    setPrice(product.price)
    setErrors({})
  }, [product])

  const total = useMemo(() => {
    const parsedQuantity = Number(quantity)
    const parsedPrice = Number(price)
    if (Number.isNaN(parsedQuantity) || Number.isNaN(parsedPrice)) {
      return "0.00"
    }
    return (parsedQuantity * parsedPrice).toFixed(2)
  }, [quantity, price])

  const handleSave = () => {
    if (!product) return

    const nextErrors: { quantity?: string; price?: string } = {}

    if (!Number.isFinite(quantity) || quantity <= 0) {
      nextErrors.quantity = "Ingresa una cantidad valida mayor a 0"
    }

    if (!Number.isFinite(price) || price < 0) {
      nextErrors.price = "Ingresa un precio de venta valido"
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onUpdate({ quantity, price })
    onClose()
  }

  if (!product) return null

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm sm:grid sm:grid-cols-[1.4fr,1fr] sm:items-start sm:gap-6 sm:space-y-0">
          <div className="space-y-4">
            <div className="grid gap-1">
              <span className="text-xs text-muted-foreground">Categoria</span>
              <span className="font-medium">{product.category_name || "Sin categoria"}</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={quantity}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    setQuantity(value)
                    if (errors.quantity) {
                      setErrors((prev) => ({ ...prev, quantity: undefined }))
                    }
                  }}
                />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="price">Precio de venta</Label>
                <Input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    setPrice(value)
                    if (errors.price) {
                      setErrors((prev) => ({ ...prev, price: undefined }))
                    }
                  }}
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
            <p className="text-sm font-semibold">Resumen</p>
            <div className="flex justify-between text-xs">
              <span>Cantidad</span>
              <span>{quantity}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Precio unitario</span>
              <span>S/. {Number.isFinite(price) ? price.toFixed(2) : "0.00"}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Total</span>
              <span>S/. {total}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Series registradas</span>
              <span>{product.series?.length ?? 0}</span>
            </div>
          </div>
        </div>
        <DialogFooter className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-4">
          <div className="flex w-full flex-col gap-2 sm:w-1/2">
            <Button variant="secondary" className="w-full" onClick={onManageSeries}>
              Ver series
            </Button>
            <Button variant="destructive" className="w-full" onClick={onRemove}>
              Quitar producto
            </Button>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-1/2">
            <Button className="w-full" onClick={handleSave}>
              Guardar cambios
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
