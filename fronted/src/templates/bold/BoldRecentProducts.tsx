"use client"

import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { RecentProductsProps } from "../types"

export default function BoldRecentProducts({
  visibleProducts,
  currentIndex,
  onNext,
  onPrev,
  totalLength,
}: RecentProductsProps) {
  if (!visibleProducts.length) return null

  return (
    <section className="relative py-16 md:py-24 bg-slate-950 text-white overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Recién{" "}
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                llegados
              </span>
            </h2>
            <p className="mt-2 text-sm text-white/40">Lo más nuevo en nuestra tienda</p>
          </div>
          {totalLength > visibleProducts.length && (
            <div className="flex items-center gap-2">
              <button
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/40 transition-all duration-200 hover:border-white/30 hover:text-white disabled:opacity-20 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={onNext}
                disabled={currentIndex >= totalLength - visibleProducts.length}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/40 transition-all duration-200 hover:border-white/30 hover:text-white disabled:opacity-20 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product) => {
            const image = product.images?.[0] ? resolveImageUrl(product.images[0]) : "/placeholder.png"
            return (
              <Link
                key={product.id}
                href={`/store/${product.id}`}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.1)]"
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-white line-clamp-1 transition-colors duration-200 group-hover:text-primary">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
