"use client"

import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { ShoppingCart } from "lucide-react"
import type { FeaturedProductsProps } from "../types"

export default function EleganceFeaturedProducts({ products }: FeaturedProductsProps) {
  const { addItem } = useCart()

  if (!products.length) return null

  const handleAddToCart = (e: React.MouseEvent, product: FeaturedProductsProps["products"][0]) => {
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
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-3">
            Selección curada
          </p>
          <h2 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Productos destacados
          </h2>
          <div className="mx-auto mt-4 h-px w-12 bg-border" />
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible md:pb-0">
          {products.slice(0, 8).map((product, i) => {
            const image = product.images?.[0]
              ? resolveImageUrl(product.images[0])
              : "/placeholder.png"

            return (
              <Link
                key={product.id}
                href={`/store/${product.id}`}
                className="group flex-shrink-0 w-[70vw] snap-start md:w-auto flex flex-col"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted/30">
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 opacity-0 translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm shadow-lg transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:scale-110 cursor-pointer"
                      aria-label="Agregar al carrito"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 px-1">
                  {product.brand && (
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
                      {product.brand.name}
                    </p>
                  )}
                  <h3 className="text-sm font-normal leading-snug text-foreground line-clamp-2 mt-1 transition-colors duration-300 group-hover:text-primary">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm font-light tracking-wide text-foreground/80">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* View all link */}
        <div className="mt-10 text-center">
          <Link
            href="/store"
            className="group relative inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors duration-500 hover:text-foreground"
          >
            Ver todos los productos
            <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-out group-hover:scale-x-100" />
          </Link>
        </div>
      </div>
    </section>
  )
}
