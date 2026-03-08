"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Heart } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import { useCart } from "@/context/cart-context"
import { useState } from "react"
import type { ProductCardProps } from "../types"

export default function EleganceProductCard({
  product,
  withActions = true,
  priority = false,
}: ProductCardProps) {
  const { addItem } = useCart()
  const [imageLoaded, setImageLoaded] = useState(false)

  const mainImage = product.images?.[0]
    ? resolveImageUrl(product.images[0])
    : "/placeholder.png"

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || "",
      quantity: 1,
    })
  }

  return (
    <Link
      href={`/store/${product.id}`}
      className="group flex flex-col w-full min-w-0 overflow-hidden"
    >
      {/* Image container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted/30">
        <Image
          src={mainImage}
          alt={product.name}
          fill
          priority={priority}
          className={`object-cover transition-all duration-700 group-hover:scale-105 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onLoad={() => setImageLoaded(true)}
        />
        {/* Shimmer placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-muted/50" />
        )}

        {/* Quick-add overlay */}
        {withActions && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-4 opacity-0 translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
            <button
              onClick={handleAddToCart}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm text-foreground shadow-lg transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:scale-110 cursor-pointer"
              aria-label="Agregar al carrito"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm text-foreground shadow-lg transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:scale-110 cursor-pointer"
              aria-label="Agregar a favoritos"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Info — minimal */}
      <div className="mt-3 flex flex-col gap-1 px-1">
        {product.brand && (
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
            {product.brand.name}
          </span>
        )}
        <h3 className="text-sm font-normal leading-snug text-foreground line-clamp-2 transition-colors duration-300 group-hover:text-primary">
          {product.name}
        </h3>
        <p className="text-sm font-light tracking-wide text-foreground/80">
          {formatCurrency(product.price)}
        </p>
      </div>
    </Link>
  )
}
