"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import type { CartLayoutProps } from "../types"

export default function EleganceCartLayout(_props: CartLayoutProps) {
  const { items, removeItem, updateQuantity } = useCart()

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-6" />
        <h1 className="text-2xl font-extralight tracking-tight text-foreground mb-3">
          Tu carrito está vacío
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Descubre nuestra colección y encuentra lo que buscas.
        </p>
        <Link
          href="/store"
          className="group inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium uppercase tracking-[0.1em] text-foreground transition-all duration-500 hover:gap-3 hover:border-primary hover:text-primary"
        >
          Explorar tienda
          <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      <h1 className="text-2xl font-extralight tracking-tight text-foreground mb-8 md:mb-12">
        Carrito de compras
      </h1>

      <div className="grid gap-8 lg:grid-cols-3 lg:gap-16">
        {/* Items */}
        <div className="lg:col-span-2 space-y-0 divide-y divide-border/20">
          {items.map((item) => {
            const image = item.image ? resolveImageUrl(item.image) : "/placeholder.png"
            return (
              <div key={item.id} className="flex gap-4 py-6 first:pt-0 last:pb-0">
                <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted/30">
                  <Image
                    src={image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-sm font-normal text-foreground line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm font-light text-foreground/80">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-0.5 rounded-full border border-border/30">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-muted-foreground/40 hover:text-destructive transition-colors duration-300 cursor-pointer"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="rounded-2xl border border-border/20 p-6 space-y-4">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Resumen
            </h2>
            <div className="h-px bg-border/20" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Envío</span>
              <span className="text-xs text-muted-foreground/60">Calculado al pagar</span>
            </div>
            <div className="h-px bg-border/20" />
            <div className="flex justify-between">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-lg font-light text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <Button
              asChild
              className="w-full h-12 rounded-full text-xs font-medium uppercase tracking-[0.1em] mt-2 cursor-pointer"
            >
              <Link href="/payment">Proceder al pago</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
