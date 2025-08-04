"use client"

import Image from "next/image"
import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { toast } from "sonner"
import { ShoppingCart, Heart } from "lucide-react"
import { toggleFavorite } from "@/app/favorites/favorite.api"
import Link from "next/link"

const MotionButton = motion(Button)

interface Product {
  id: number
  name: string
  description: string
  price: number
  brand: string
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
}

export default function MotionProductCard({ product, withActions = false }: MotionProductCardProps) {

  const { addItem } = useCart()
  const [isFavorite, setIsFavorite] = useState(false)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
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
            <div className="relative overflow-hidden rounded-t-lg">
              <Image
                src={product.images[0] || "/placeholder.svg"}
                alt={product.name}
                width={300}
                height={300}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
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
              <span className="text-sm text-muted-foreground mb-2 block">
                {product.brand}
              </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                S/.{product.price.toFixed(2)}
              </span>
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
            <MotionButton
              size="icon"
              variant="outline"
              onClick={handleToggleFavorite}
              whileHover={{ scale: 1.1, cursor: "grab" }}
              whileTap={{ scale: 0.95, cursor: "grabbing" }}
              className={`pointer-events-auto cursor-grab active:cursor-grabbing ${isFavorite ? "text-red-500 border-red-500" : ""}`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
            </MotionButton>
          </div>
        )}
      </Card>
    </motion.div>
  )
}