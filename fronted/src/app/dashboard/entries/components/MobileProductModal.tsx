import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Product {
    id: number
    name: string
    price: number
    priceSell: number
    quantity: number
    category_name: string
    series?: string[]
  }

export function MobileProductModal({ product, onClose }: { product: Product | null, onClose: () => void }) {
  if (!product) return null

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="sm:hidden">
        <DialogHeader>
          <DialogTitle>Detalle del producto</DialogTitle>
        </DialogHeader>
        <div className="text-sm space-y-1">
          <div><strong>Nombre:</strong> {product.name}</div>
          <div><strong>Categoría:</strong> {product.category_name}</div>
          <div><strong>Cantidad:</strong> {product.quantity}</div>
          <div><strong>Precio Compra:</strong> S/. {Number(product.price || 0).toFixed(2)}</div>
          <div><strong>Precio Venta:</strong> S/. {Number(product.priceSell || 0).toFixed(2)}</div>
          <div><strong>Series:</strong> {product.series?.join(", ") || "Sin series"}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}