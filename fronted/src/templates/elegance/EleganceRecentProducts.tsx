"use client"

import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { RecentProductsProps } from "../types"

export default function EleganceRecentProducts({
  visibleProducts,
  currentIndex,
  onNext,
  onPrev,
  totalLength,
}: RecentProductsProps) {
  if (!visibleProducts.length) return null

  return (
    <section className="py-16 md:py-24 bg-muted/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header with navigation */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-3">
              Lo más nuevo
            </p>
            <h2 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl">
              Recién llegados
            </h2>
          </div>
          {totalLength > visibleProducts.length && (
            <div className="flex items-center gap-2">
              <button
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/40 text-muted-foreground transition-all duration-300 hover:border-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={onNext}
                disabled={currentIndex >= totalLength - visibleProducts.length}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/40 text-muted-foreground transition-all duration-300 hover:border-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product) => {
            const image = product.images?.[0]
              ? resolveImageUrl(product.images[0])
              : "/placeholder.png"

            return (
              <Link
                key={product.id}
                href={`/store/${product.id}`}
                className="group flex flex-col"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted/30">
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
                <div className="mt-3 px-1">
                  <h3 className="text-sm font-normal leading-snug text-foreground line-clamp-1 transition-colors duration-300 group-hover:text-primary">
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
      </div>
    </section>
  )
}
