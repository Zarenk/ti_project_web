"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { AdminProductImageButton } from "@/components/admin/AdminProductImageButton"
import { AdminProductEditButton } from "@/components/admin/AdminProductEditButton"

interface ProductImageGalleryProps {
  images: string[]
  productName: string
  productId: number
  currentImages: string[]
  discountPercentage: number
  onImageUpdated: (nextImages: string[]) => void
  onEditClick: () => void
}

export function ProductImageGallery({
  images,
  productName,
  productId,
  currentImages,
  discountPercentage,
  onImageUpdated,
  onEditClick,
}: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [zoomActive, setZoomActive] = useState(false)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  return (
    <div className="space-y-4">
      <div className="relative">
        {discountPercentage > 0 && (
          <Badge className="absolute top-4 left-4 z-10 bg-red-500 hover:bg-red-600">
            -{discountPercentage}% OFF
          </Badge>
        )}

        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
          <Badge className="bg-green-500 hover:bg-green-600">Envío Gratis</Badge>
          <div className="pointer-events-none">
            <div className="pointer-events-auto flex gap-2">
              <AdminProductImageButton
                productId={productId}
                currentImages={currentImages}
                onImageUpdated={onImageUpdated}
              />
              <AdminProductEditButton
                productId={productId}
                onClick={onEditClick}
              />
            </div>
          </div>
        </div>

        <div
          className="aspect-square rounded-2xl overflow-hidden bg-card shadow-lg relative"
          onMouseEnter={() => setZoomActive(true)}
          onMouseLeave={() => setZoomActive(false)}
          onMouseMove={(e) => {
            const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
            const x = ((e.clientX - left) / width) * 100
            const y = ((e.clientY - top) / height) * 100
            if (imgRef.current) {
              imgRef.current.style.transformOrigin = `${x}% ${y}%`
            }
          }}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute bottom-4 right-4 z-20 bg-card/70 hover:bg-card rounded-full cursor-pointer"
            onClick={() => setIsImageDialogOpen(true)}
          >
            <Maximize2 className="w-5 h-5" />
            <span className="sr-only">Maximizar imagen</span>
          </Button>

          <Image
            ref={imgRef}
            src={images[selectedImage] || "/placeholder.svg"}
            alt={productName}
            width={600}
            height={600}
            priority
            className={`w-full h-full object-cover transition-transform duration-200 ${zoomActive ? "scale-150" : "scale-100"}`}
          />
        </div>
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-3xl p-0 bg-transparent border-none shadow-none"
        >
          <VisuallyHidden>
            <DialogTitle>{productName}</DialogTitle>
            <DialogDescription>Imagen ampliada</DialogDescription>
          </VisuallyHidden>
          <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-lg space-y-4">
            <div className="relative w-full">
              <Image
                src={images[selectedImage] || "/placeholder.svg"}
                alt={productName}
                width={900}
                height={900}
                className="w-full h-full object-contain"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImage === index
                        ? "border-blue-500 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`Vista ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Thumbnails */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(index)}
            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
              selectedImage === index
                ? "border-blue-500 shadow-md"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Image
              src={image || "/placeholder.svg"}
              alt={`Vista ${index + 1}`}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
