"use client"

import Image from "next/image"
import { getBrandLogoSources, resolveImageUrl } from "@/lib/images"
import { BrandLogo } from "@/components/BrandLogo"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { toast } from "sonner"
import { ShoppingCart, Heart } from "lucide-react"
import { toggleFavorite } from "@/app/favorites/favorite.api"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import Link from "next/link"
import { AdminProductImageButton } from "@/components/admin/AdminProductImageButton"
import { AdminProductEditButton } from "@/components/admin/AdminProductEditButton"
import { useSiteSettings } from "@/context/site-settings-context"
import { getCardToneClass, getChipPresentation } from "@/utils/site-settings"
import { cn } from "@/lib/utils"

// Use the new `motion.create` API to avoid deprecated `motion()` usage
const MotionButton = motion.create(Button)

interface Brand {
  name: string
  logoSvg?: string
  logoPng?: string
}

interface Product {
  id: number
  name: string
  description: string
  price: number
  brand: Brand | null
  category: string
  images: string[]
  stock: number | null
  specification?: {
    processor?: string
    ram?: string
    storage?: string
    graphics?: string
    screen?: string
    resolution?: string
    refreshRate?: string
    connectivity?: string
  }
}

interface MotionProductCardProps {
  product: Product
  withActions?: boolean
  priority?: boolean
  highlightPrice?: boolean
  onEditProduct?: (productId: number) => void
}

export default function MotionProductCard({ product, withActions = false, priority = false, highlightPrice = false, onEditProduct }: MotionProductCardProps) {

  const { addItem } = useCart()
  const { settings } = useSiteSettings()
  const chipPresentation = getChipPresentation(settings)
  const cardToneClass = getCardToneClass(settings)
  const cardHoverClass =
    settings.components.cardStyle === "shadow"
      ? "border border-transparent hover:border-border hover:shadow-xl"
      : "hover:border-primary/40"
  const [isFavorite, setIsFavorite] = useState(false)
  const [imageList, setImageList] = useState<string[]>(product.images ?? [])
  useEffect(() => {
    setImageList(product.images ?? [])
  }, [product.id, product.images])
  const primaryImage = imageList[0]
  const resolvedPrimaryImage = primaryImage ? resolveImageUrl(primaryImage) : "/placeholder.svg"
  const canAddToCart = typeof product.stock === 'number' && product.stock > 0
  const [brandLogo, ...brandLogoFallbacks] = getBrandLogoSources(product.brand ?? null)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: resolvedPrimaryImage,
      quantity: 1,
    })
    toast.success("Producto agregado al carrito")
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await toggleFavorite(product.id)
      setIsFavorite((prev) => !prev)
      toast.success(
        isFavorite ? "Eliminado de favoritos" : "Agregado a favoritos",
      )
    } catch (err) {
      console.error("Error toggling favorite:", err)
      toast.error("No se pudo actualizar favoritos")
    }
  }

  return (
    <motion.div layout>
      <Card
        className={cn(
          "group relative overflow-hidden transition-shadow duration-200 card-stripes",
          cardToneClass,
          cardHoverClass,
        )}
      >
        <div className="pointer-events-none absolute right-3 top-3 z-20 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <div className="flex gap-2 pointer-events-auto">
            <AdminProductImageButton
              productId={product.id}
              currentImages={imageList}
              onImageUpdated={setImageList}
            />
            <AdminProductEditButton
              productId={product.id}
              onClick={
                onEditProduct ? () => onEditProduct(product.id) : undefined
              }
            />
          </div>
        </div>
        <Link href={`/store/${product.id}`} className="block">
          <CardHeader className="p-0">
            <div className="relative h-56 flex items-center justify-center overflow-hidden rounded-t-lg">
              <Image
                src={resolvedPrimaryImage}
                alt={product.name}
                width={300}
                height={300}
                className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-200"
                priority={priority}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="mb-2">
              <Badge
                variant={chipPresentation.variant}
                className={cn("text-xs", chipPresentation.className)}
              >
                {product.category}
              </Badge>
            </div>
              <h3 className="font-semibold text-base sm:text-lg mb-1 break-words whitespace-normal">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {product.description}
              </p>
              <span className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                {brandLogo && (
                  <BrandLogo
                    src={brandLogo}
                    alt={product.brand?.name}
                    fallbackSrc={brandLogoFallbacks}
                    className="h-4 w-auto"
                  />
                )}
                {product.brand?.name}
              </span>
            <div className="flex items-center justify-between">
              {highlightPrice ? (
                <motion.span
                  aria-label="Precio"
                  className="inline-block origin-left font-extrabold text-sky-600"
                  animate={{
                    x: [0, 6, 0],
                    scale: [1, 1.08, 1],
                    opacity: [1, 0.98, 1],
                    color: [
                      "#0369a1", // sky-700
                      "#0ea5e9", // sky-500
                      "#0369a1",
                    ],
                    textShadow: [
                      "0 0 0 rgba(14,165,233,0)",
                      "0 0 12px rgba(14,165,233,0.9), 0 0 24px rgba(14,165,233,0.6)",
                      "0 0 0 rgba(14,165,233,0)",
                    ],
                  }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="text-3xl">S/.{product.price.toFixed(2)}</span>
                </motion.span>
              ) : (
                <span className="text-2xl font-bold text-green-600">S/.{product.price.toFixed(2)}</span>
              )}
            </div>
            <p
              className={`text-xs mt-1 flex items-center gap-1 ${
                product.stock !== null && product.stock > 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {product.stock !== null && product.stock > 0
                ? `Stock: ${product.stock}`
                : "Sin stock"}
            </p>
            <div className="hidden group-hover:block mt-2 space-y-1 text-xs text-muted-foreground">
              {product.specification?.processor && (
                <p>Procesador: {product.specification.processor}</p>
              )}
              {product.specification?.ram && (
                <p>RAM: {product.specification.ram}</p>
              )}
              {product.specification?.storage && (
                <p>Almacenamiento: {product.specification.storage}</p>
              )}
              {product.specification?.graphics && (
                <p>Gráficos: {product.specification.graphics}</p>
              )}
              {product.specification?.screen && (
                <p>Pantalla: {product.specification.screen}</p>
              )}
              {product.specification?.resolution && (
                <p>Resolución: {product.specification.resolution}</p>
              )}
              {product.specification?.refreshRate && (
                <p>Tasa de refresco: {product.specification.refreshRate}</p>
              )}
              {product.specification?.connectivity && (
                <p>Conectividad: {product.specification.connectivity}</p>
              )}
            </div>
          </CardContent>
        </Link>
        {withActions && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none md:flex-col md:gap-4 lg:flex-row lg:gap-2">
            {canAddToCart && (
              <MotionButton
                size="sm"
                onClick={handleAddToCart}
                whileHover={{ scale: 1.1, cursor: "grab" }}
                whileTap={{ scale: 0.95, cursor: "grabbing" }}
                className="bg-sky-500 hover:bg-sky-600 text-white pointer-events-auto cursor-grab active:cursor-grabbing"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Agregar al carrito
              </MotionButton>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <MotionButton
                  aria-label="Agregar favoritos"
                  title="Agregar favoritos"
                  size="icon"
                  variant="outline"
                  onClick={handleToggleFavorite}
                  whileHover={{ scale: 1.1, cursor: "grab" }}
                  whileTap={{ scale: 0.95, cursor: "grabbing" }}
                  className={`group pointer-events-auto cursor-grab active:cursor-grabbing transition-colors ${
                    isFavorite ? "text-red-500 border-red-500" : ""
                  } hover:text-red-500 hover:border-red-500`}
                >
                  <Heart className={`w-4 h-4 transition-transform duration-150 ${
                    isFavorite ? "" : ""
                  } group-hover:scale-110`} />
                </MotionButton>
              </TooltipTrigger>
              <TooltipContent side="top">Agregar favoritos</TooltipContent>
            </Tooltip>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

