import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function ProductDetailModal({ product, onClose }: { product: any; onClose: () => void }) {
  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p><strong>Categoría:</strong> {product.category_name}</p>
          <p><strong>Cantidad:</strong> {product.quantity}</p>
          <p><strong>Precio:</strong> S/ {product.price}</p>
          <p><strong>Series:</strong> {product.series?.join(", ") || "Sin series"}</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}