"use client"

import Image from "next/image"
import { resolveImageUrl } from "@/lib/images"
import { BrandLogo } from "@/components/BrandLogo"
import { useState } from "react"
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
}

export default function MotionProductCard({ product, withActions = false, priority = false, highlightPrice = false }: MotionProductCardProps) {

  const { addItem } = useCart()
  const [isFavorite, setIsFavorite] = useState(false)
  const canAddToCart = typeof product.stock === 'number' && product.stock > 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: resolveImageUrl(product.images[0]),
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
      <Card className="group relative overflow-hidden hover:shadow-lg transition-shadow duration-200 card-stripes border-transparent hover:border-border">
        <Link href={`/store/${product.id}`} className="block">
          <CardHeader className="p-0">
            <div className="relative h-56 flex items-center justify-center overflow-hidden rounded-t-lg">
              <Image
                src={
                  product.images[0]
                    ? resolveImageUrl(product.images[0])
                    : "/placeholder.svg"
                }
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
              <Badge variant="outline" className="text-xs">
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
                {product.brand?.logoSvg && (
                  <BrandLogo
                    src={resolveImageUrl(product.brand.logoSvg)}
                    alt={product.brand.name}
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
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
