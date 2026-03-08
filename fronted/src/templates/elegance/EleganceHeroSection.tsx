"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { resolveImageUrl } from "@/lib/images"
import type { HeroSectionProps } from "../types"

export default function EleganceHeroSection({ heroProducts }: HeroSectionProps) {
  const mainProduct = heroProducts[0]
  const heroImage = mainProduct?.images?.[0]
    ? resolveImageUrl(mainProduct.images[0])
    : "/placeholder-hero.jpg"

  return (
    <section className="relative w-full overflow-hidden bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[70vh] items-center gap-8 py-16 md:grid-cols-2 md:py-24 lg:gap-16">
          {/* Text */}
          <div className="flex flex-col gap-6 text-center md:text-left">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 animate-[fadeInUp_0.6s_ease-out_both]">
              Colección exclusiva
            </p>
            <h1 className="text-3xl font-extralight leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl xl:text-6xl animate-[fadeInUp_0.6s_ease-out_0.1s_both]">
              Tecnología que{" "}
              <span className="font-normal text-primary">inspira</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
              Descubre productos seleccionados con el más alto estándar de calidad.
              Diseño y rendimiento en perfecta armonía.
            </p>
            <div className="flex items-center justify-center gap-4 md:justify-start animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
              <Link
                href="/store"
                className="group inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium uppercase tracking-[0.1em] text-foreground transition-all duration-500 hover:gap-3 hover:border-primary hover:text-primary"
              >
                Explorar tienda
                <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Image */}
          <div className="relative flex items-center justify-center animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
            <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-3xl bg-muted/50">
              <Image
                src={heroImage}
                alt={mainProduct?.name || "Producto destacado"}
                fill
                priority
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
    </section>
  )
}
