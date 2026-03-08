"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { CategoriesSectionProps } from "../types"

export default function BoldCategoriesSection({
  visibleCategories,
  currentIndex,
  onNext,
  onPrev,
  totalLength,
}: CategoriesSectionProps) {
  if (!visibleCategories.length) return null

  return (
    <section className="relative py-16 md:py-24 bg-slate-950 text-white overflow-hidden">
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Categorías
            </h2>
            <p className="mt-2 text-sm text-white/40">Explora por categoría</p>
          </div>
          {totalLength > visibleCategories.length && (
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
                disabled={currentIndex >= totalLength - visibleCategories.length}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/40 transition-all duration-200 hover:border-white/30 hover:text-white disabled:opacity-20 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visibleCategories.map((category) => {
            const Icon = category.icon
            return (
              <Link
                key={category.name}
                href={`/store?category=${encodeURIComponent(category.name)}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:border-primary/30 hover:bg-white/[0.04] hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.08)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 text-primary transition-all duration-300 group-hover:from-primary/20 group-hover:to-purple-500/20 group-hover:shadow-[0_0_16px_rgba(var(--primary-rgb,99,102,241),0.2)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors duration-200">
                    {category.name}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-white/30">
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
