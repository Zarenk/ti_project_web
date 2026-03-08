"use client"

import { Star, Quote } from "lucide-react"
import type { TestimonialsSectionProps } from "../types"

export default function BoldTestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  if (!testimonials.length) return null

  return (
    <section className="relative py-16 md:py-24 bg-slate-950 text-white overflow-hidden">
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Lo que dicen nuestros{" "}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              clientes
            </span>
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.slice(0, 6).map((testimonial, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:border-primary/20 hover:bg-white/[0.04]"
            >
              <Quote className="h-5 w-5 text-primary/30 mb-4" />

              <p className="text-sm leading-relaxed text-white/60 italic mb-4">
                &ldquo;{testimonial.comment}&rdquo;
              </p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{testimonial.name}</p>
                  <p className="text-xs text-white/30">{testimonial.location}</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className={`h-3.5 w-3.5 ${
                        j < testimonial.rating
                          ? "fill-primary/70 text-primary/70"
                          : "text-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
