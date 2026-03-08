"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import type { CartLayoutProps } from "../types"

export default function BoldCartLayout(_props: CartLayoutProps) {
  const { items, removeItem, updateQuantity } = useCart()
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="bg-slate-950 text-white min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
        <ShoppingBag className="h-12 w-12 text-white/10 mb-6" />
        <h1 className="text-2xl font-extrabold tracking-tight mb-3">Tu carrito está vacío</h1>
        <p className="text-sm text-white/40 mb-8">Explora nuestra tienda y encuentra lo que buscas.</p>
        <Link
          href="/store"
          className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.4)] hover:scale-105"
        >
          Explorar tienda
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-slate-950 text-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <h1 className="text-2xl font-extrabold tracking-tight mb-8 md:mb-12">Carrito de compras</h1>

        <div className="grid gap-8 lg:grid-cols-3 lg:gap-16">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const image = item.image ? resolveImageUrl(item.image) : "/placeholder.png"
              return (
                <div key={item.id} className="flex gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl">
                    <Image src={image} alt={item.name} fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <h3 className="text-sm font-semibold text-white line-clamp-2">{item.name}</h3>
                      <p className="mt-1 text-sm font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/5">
                        <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="flex h-8 w-8 items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-2 text-white/20 hover:text-red-400 transition-colors duration-200 cursor-pointer" aria-label="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="lg:sticky lg:top-24 self-start">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
              <h2 className="text-sm font-semibold text-white/60">Resumen</h2>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Subtotal</span>
                <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Envío</span>
                <span className="text-xs text-white/20">Calculado al pagar</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">{formatCurrency(subtotal)}</span>
              </div>
              <Button asChild className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-sm font-semibold mt-2 transition-all duration-200 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.4)] cursor-pointer">
                <Link href="/payment">Proceder al pago</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
