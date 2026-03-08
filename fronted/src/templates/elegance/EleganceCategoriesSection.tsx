"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { CategoriesSectionProps } from "../types"

export default function EleganceCategoriesSection({
  visibleCategories,
  currentIndex,
  onNext,
  onPrev,
  totalLength,
}: CategoriesSectionProps) {
  if (!visibleCategories.length) return null

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-3">
              Explora por
            </p>
            <h2 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl">
              Categorías
            </h2>
          </div>
          {totalLength > visibleCategories.length && (
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
                disabled={currentIndex >= totalLength - visibleCategories.length}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/40 text-muted-foreground transition-all duration-300 hover:border-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visibleCategories.map((category) => {
            const Icon = category.icon
            return (
              <Link
                key={category.name}
                href={`/store?category=${encodeURIComponent(category.name)}`}
                className="group flex flex-col items-center gap-4 rounded-2xl border border-border/20 bg-muted/10 p-6 transition-all duration-500 hover:border-border/40 hover:bg-muted/20 hover:shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary/70 transition-all duration-500 group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-foreground">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    {category.count} productos
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
