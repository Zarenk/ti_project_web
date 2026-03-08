"use client"

import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { ShoppingCart, ArrowRight } from "lucide-react"
import type { FeaturedProductsProps } from "../types"

export default function BoldFeaturedProducts({ products }: FeaturedProductsProps) {
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
    <section className="relative py-16 md:py-24 bg-slate-950 text-white overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
              Productos{" "}
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                destacados
              </span>
            </h2>
            <p className="mt-2 text-sm text-white/40">Lo mejor de nuestra colección</p>
          </div>
          <Link
            href="/store"
            className="group hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-white/50 transition-colors duration-200 hover:text-white"
          >
            Ver todo
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 md:grid-rows-2">
          {products.slice(0, 5).map((product, i) => {
            const image = product.images?.[0] ? resolveImageUrl(product.images[0]) : "/placeholder.png"
            const isLarge = i === 0

            return (
              <Link
                key={product.id}
                href={`/store/${product.id}`}
                className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.1)] ${
                  isLarge ? "col-span-2 row-span-2" : ""
                }`}
              >
                <div className={`relative w-full overflow-hidden ${isLarge ? "aspect-square" : "aspect-square"}`}>
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes={isLarge ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                  {/* Overlay add-to-cart */}
                  <button
                    onClick={(e) => handleAddToCart(e, product)}
                    className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/80 text-white backdrop-blur-sm opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-primary hover:scale-110 cursor-pointer"
                    aria-label="Agregar al carrito"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                  </button>

                  {/* Info overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
                    {product.brand && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-0.5">
                        {product.brand.name}
                      </p>
                    )}
                    <h3 className={`font-semibold text-white line-clamp-2 ${isLarge ? "text-base md:text-lg" : "text-sm"}`}>
                      {product.name}
                    </h3>
                    <p className={`mt-1 font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent ${isLarge ? "text-lg" : "text-sm"}`}>
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Mobile link */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/store"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white transition-colors"
          >
            Ver todos los productos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
