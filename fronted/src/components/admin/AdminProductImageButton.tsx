"use client"

import { ChangeEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { uploadProductImage, updateProduct } from "@/app/dashboard/products/products.api"
import { toast } from "sonner"
import { Loader2, ImagePlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminProductImageButtonProps {
  productId: number
  currentImages?: string[]
  onImageUpdated?: (images: string[]) => void
  className?: string
}

export function AdminProductImageButton({
  productId,
  currentImages = [],
  onImageUpdated,
  className,
}: AdminProductImageButtonProps) {
  const { role } = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  if (role?.toUpperCase() !== "ADMIN") {
    return null
  }

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setIsUploading(true)
    const input = event.target
    try {
      const { url } = await uploadProductImage(file)
      let toStore = url
      try {
        const parsed = new URL(url)
        if (parsed.pathname.startsWith("/uploads")) {
          toStore = parsed.pathname
        }
      } catch {
        // Ignore malformed URL, fallback to raw value
      }

      const remaining = currentImages.slice(1)
      const nextImages = [toStore, ...remaining]

      await updateProduct(String(productId), { images: nextImages })
      toast.success("Imagen principal actualizada")
      onImageUpdated?.(nextImages)
    } catch (error) {
      console.error("Error actualizando imagen de producto", error)
      toast.error("No se pudo actualizar la imagen")
    } finally {
      setIsUploading(false)
      input.value = ""
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Actualizar imagen"
        title="Actualizar imagen"
        disabled={isUploading}
        onClick={handleButtonClick}
        className={cn("h-8 w-8 rounded-full shadow-sm", className)}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </Button>
    </>
  )
}
