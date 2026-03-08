"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Heart, ChevronLeft, Minus, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import { useCart } from "@/context/cart-context"
import type { ProductDetailProps } from "../types"

export default function EleganceProductDetail({ product, storeStock }: ProductDetailProps) {
  const { addItem } = useCart()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const images = product.images?.length
    ? product.images.map(resolveImageUrl)
    : ["/placeholder.png"]

  const totalStock = storeStock.reduce((sum, s) => sum + s.stock, 0)

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || "",
      quantity,
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      {/* Breadcrumb */}
      <Link
        href="/store"
        className="group inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground transition-colors duration-300 hover:text-foreground mb-8"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Volver a la tienda
      </Link>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-muted/30">
            <Image
              src={images[selectedImage]}
              alt={product.name}
              fill
              priority
              className="object-cover transition-all duration-500"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                    i === selectedImage
                      ? "border-foreground"
                      : "border-border/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} - ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6">
          {product.brand && (
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
              {product.brand.name}
            </p>
          )}
          <h1 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {product.name}
          </h1>
          <p className="text-2xl font-light text-foreground/90">
            {formatCurrency(product.price)}
          </p>

          <div className="h-px bg-border/30" />

          {product.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {/* Stock info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            {totalStock > 0 ? (
              <span>{totalStock} unidades disponibles</span>
            ) : (
              <span className="text-destructive">Agotado</span>
            )}
          </div>

          {/* Store availability */}
          {storeStock.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Disponibilidad por tienda
              </p>
              <div className="grid gap-2">
                {storeStock.map((store) => (
                  <div
                    key={store.storeName}
                    className="flex items-center justify-between rounded-xl border border-border/20 px-4 py-2.5"
                  >
                    <span className="text-xs text-foreground">{store.storeName}</span>
                    <span className={`text-xs font-medium ${store.stock > 0 ? "text-primary/70" : "text-muted-foreground/40"}`}>
                      {store.stock} uds
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specs */}
          {product.specification && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Especificaciones
              </p>
              <div className="grid gap-1.5">
                {Object.entries(product.specification)
                  .filter(([, v]) => v)
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between rounded-xl border border-border/20 px-4 py-2.5">
                      <span className="text-xs text-muted-foreground capitalize">{key}</span>
                      <span className="text-xs text-foreground">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="h-px bg-border/30" />

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-0.5 rounded-full border border-border/30">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors duration-300 cursor-pointer"
                aria-label="Reducir cantidad"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors duration-300 cursor-pointer"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={totalStock === 0}
              className="flex-1 h-12 rounded-full text-xs font-medium uppercase tracking-[0.1em] transition-all duration-300 cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Agregar al carrito
            </Button>

            <button
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-border/30 text-muted-foreground transition-all duration-300 hover:border-foreground hover:text-foreground cursor-pointer"
              aria-label="Agregar a favoritos"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
