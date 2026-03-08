"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { resolveImageUrl } from "@/lib/images"
import type { HeroSectionProps } from "../types"

export default function BoldHeroSection({ heroProducts }: HeroSectionProps) {
  const mainProduct = heroProducts[0]
  const heroImage = mainProduct?.images?.[0]
    ? resolveImageUrl(mainProduct.images[0])
    : "/placeholder-hero.jpg"

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      {/* Gradient mesh background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[80vh] items-center gap-8 py-16 md:grid-cols-2 md:py-24 lg:gap-16">
          {/* Text */}
          <div className="flex flex-col gap-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 self-center md:self-start px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm animate-[fadeInUp_0.5s_ease-out_both]">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-white/70">Nueva colección disponible</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl animate-[fadeInUp_0.5s_ease-out_0.1s_both]">
              El futuro es{" "}
              <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                ahora
              </span>
            </h1>

            <p className="max-w-md text-sm leading-relaxed text-white/50 sm:text-base animate-[fadeInUp_0.5s_ease-out_0.2s_both]">
              Tecnología de última generación seleccionada para los más exigentes.
              Rendimiento sin límites.
            </p>

            <div className="flex items-center justify-center gap-4 md:justify-start animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
              <Link
                href="/store"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[0_0_30px_rgba(var(--primary-rgb,99,102,241),0.4)] hover:scale-105"
              >
                Explorar tienda
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Image */}
          <div className="relative flex items-center justify-center animate-[fadeInUp_0.5s_ease-out_0.2s_both]">
            <div className="relative aspect-square w-full max-w-lg">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 blur-2xl" />
              <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <Image
                  src={heroImage}
                  alt={mainProduct?.name || "Producto destacado"}
                  fill
                  priority
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  )
}
