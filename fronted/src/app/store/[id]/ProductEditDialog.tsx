"use client"

import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import ProductForm from "@/app/dashboard/products/new/product-form"

interface ProductEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  productToEdit: any | null
  isLoadingProduct: boolean
  categories: any[]
  isLoadingCategories: boolean
  onSuccess: (updatedProduct: any) => void
}

export function ProductEditDialog({
  isOpen,
  onOpenChange,
  productToEdit,
  isLoadingProduct,
  categories,
  isLoadingCategories,
  onSuccess,
}: ProductEditDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
          <DialogDescription>
            Actualiza las características y detalles del producto sin salir de esta página.
          </DialogDescription>
        </DialogHeader>

        {isLoadingProduct ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : productToEdit ? (
          isLoadingCategories && categories.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="pb-4">
              <ProductForm
                key={productToEdit.id}
                product={productToEdit}
                categories={categories}
                onSuccess={onSuccess}
                onCancel={() => onOpenChange(false)}
              />
            </div>
          )
        ) : (
          <div className="py-10">
            <Skeleton className="h-6 w-40 mx-auto" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
