"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Heart } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import { useCart } from "@/context/cart-context"
import { useState } from "react"
import type { ProductCardProps } from "../types"

export default function BoldProductCard({
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
      {/* Card with glow border on hover */}
      <div className="relative rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.1)]">
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-slate-900/50">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            priority={priority}
            className={`object-cover transition-all duration-500 group-hover:scale-110 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-white/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

          {/* Overlay actions */}
          {withActions && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
              <button
                onClick={handleAddToCart}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/90 text-white backdrop-blur-sm shadow-lg transition-all duration-200 hover:bg-primary hover:scale-110 hover:shadow-[0_0_16px_rgba(var(--primary-rgb,99,102,241),0.5)] cursor-pointer"
                aria-label="Agregar al carrito"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
              </button>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm shadow-lg transition-all duration-200 hover:bg-white/20 hover:scale-110 cursor-pointer"
                aria-label="Agregar a favoritos"
              >
                <Heart className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          {product.brand && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
              {product.brand.name}
            </span>
          )}
          <h3 className="text-sm font-medium text-foreground line-clamp-2 mt-0.5 transition-colors duration-200 group-hover:text-primary">
            {product.name}
          </h3>
          <p className="mt-1.5 text-sm font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            {formatCurrency(product.price)}
          </p>
        </div>
      </div>
    </Link>
  )
}
