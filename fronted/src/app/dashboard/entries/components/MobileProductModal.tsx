import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  return (
    <Dialog
      open={!!product}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
        }
      }}
    >
      <DialogContent className="w-[min(90vw,420px)] sm:w-[min(80vw,640px)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalle del producto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm sm:grid sm:grid-cols-[1fr_minmax(0,0.85fr)] sm:gap-6 sm:space-y-0">
          <div className="space-y-4">
            <div>
              <p className="font-medium text-base">{product.name}</p>
              <p className="text-muted-foreground text-xs">ID: {product.id}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={product.category_name || "__none__"}
                onValueChange={(value) =>
                  onUpdate({ category_name: value === "__none__" ? "" : value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecciona una categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin categoria</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Precio compra</Label>
                <Input
                  id="price"
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
              <div className="space-y-2">
                <Label htmlFor="priceSell">Precio venta</Label>
                <Input
                  id="priceSell"
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
          </div>

          <div className="space-y-4 rounded-md border p-4 text-sm sm:self-start sm:space-y-6">
            <div className="space-y-1">
              <p className="font-medium">Resumen</p>
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Precio total</span>
                <span>
                  S/. {(Number(product.quantity) * Number(product.price || 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Series</span>
                <span>
                  {product.series?.length
                    ? `${product.series.length} registradas`
                    : "Sin series"}
                </span>
              </div>
            </div>

            <div className="hidden flex-col gap-2 sm:flex">
              <Button variant="secondary" onClick={onManageSeries}>
                Administrar series
              </Button>
              <Button variant="destructive" onClick={onRemove}>
                Quitar producto
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <div className="flex w-full flex-col gap-2 sm:hidden">
            <Button variant="secondary" className="w-full" onClick={onManageSeries}>
              Administrar series
            </Button>
            <Button variant="destructive" className="w-full" onClick={onRemove}>
              Quitar producto
            </Button>
          </div>
          <Button className="w-full sm:w-auto" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
