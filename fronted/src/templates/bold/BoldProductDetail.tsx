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

export default function BoldProductDetail({ product, storeStock }: ProductDetailProps) {
  const { addItem } = useCart()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const images = product.images?.length ? product.images.map(resolveImageUrl) : ["/placeholder.png"]
  const totalStock = storeStock.reduce((sum, s) => sum + s.stock, 0)

  const handleAddToCart = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || "", quantity })
  }

  return (
    <div className="bg-slate-950 text-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <Link href="/store" className="group inline-flex items-center gap-1.5 text-sm font-medium text-white/40 transition-colors duration-200 hover:text-white mb-8">
          <ChevronLeft className="h-3.5 w-3.5" />
          Volver a la tienda
        </Link>

        <div className="grid gap-8 md:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 blur-2xl" />
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                priority
                className="object-cover relative z-10"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                      i === selectedImage ? "border-primary shadow-[0_0_12px_rgba(var(--primary-rgb,99,102,241),0.3)]" : "border-white/5 opacity-50 hover:opacity-100"
                    }`}
                  >
                    <Image src={img} alt={`${product.name} - ${i + 1}`} fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            {product.brand && (
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">{product.brand.name}</p>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">{product.name}</h1>
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              {formatCurrency(product.price)}
            </p>

            <div className="h-px bg-white/5" />

            {product.description && (
              <p className="text-sm leading-relaxed text-white/50">{product.description}</p>
            )}

            <div className="flex items-center gap-2 text-xs text-white/40">
              <Package className="h-3.5 w-3.5" />
              {totalStock > 0 ? <span>{totalStock} unidades disponibles</span> : <span className="text-red-400">Agotado</span>}
            </div>

            {storeStock.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/50">Disponibilidad</p>
                <div className="grid gap-2">
                  {storeStock.map((store) => (
                    <div key={store.storeName} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
                      <span className="text-xs text-white/70">{store.storeName}</span>
                      <span className={`text-xs font-semibold ${store.stock > 0 ? "text-primary" : "text-white/20"}`}>{store.stock} uds</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.specification && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/50">Especificaciones</p>
                <div className="grid gap-1.5">
                  {Object.entries(product.specification).filter(([, v]) => v).map(([key, value]) => (
                    <div key={key} className="flex justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
                      <span className="text-xs text-white/40 capitalize">{key}</span>
                      <span className="text-xs text-white/80">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-white/5" />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/5">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} className="flex h-10 w-10 items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={totalStock === 0}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.4)] hover:scale-[1.02] cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Agregar al carrito
              </Button>

              <button className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 transition-all duration-200 hover:border-primary/30 hover:text-white cursor-pointer">
                <Heart className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
