"use client"

import { useState, useEffect } from "react"
import { Star, ChevronLeft, ChevronRight } from "lucide-react"
import type { TestimonialsSectionProps } from "../types"

export default function EleganceTestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (testimonials.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  if (!testimonials.length) return null

  const active = testimonials[activeIndex]

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-3">
            Testimonios
          </p>
          <h2 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl">
            Lo que dicen nuestros clientes
          </h2>
          <div className="mx-auto mt-4 h-px w-12 bg-border" />
        </div>

        {/* Single rotating testimonial */}
        <div className="relative text-center">
          <div
            key={activeIndex}
            className="animate-[fadeIn_0.5s_ease-out_both]"
          >
            {/* Stars */}
            <div className="flex items-center justify-center gap-1 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < active.rating
                      ? "fill-primary/70 text-primary/70"
                      : "text-border"
                  }`}
                />
              ))}
            </div>

            {/* Quote */}
            <blockquote className="text-base font-light leading-relaxed text-foreground/90 italic sm:text-lg md:text-xl max-w-2xl mx-auto">
              &ldquo;{active.comment}&rdquo;
            </blockquote>

            {/* Author */}
            <div className="mt-6">
              <p className="text-sm font-medium text-foreground tracking-wide">
                {active.name}
              </p>
              <p className="text-xs text-muted-foreground/60 tracking-wider uppercase mt-1">
                {active.location}
              </p>
            </div>
          </div>

          {/* Navigation dots + arrows */}
          {testimonials.length > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                onClick={() =>
                  setActiveIndex((prev) =>
                    prev === 0 ? testimonials.length - 1 : prev - 1,
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/30 text-muted-foreground transition-all duration-300 hover:border-foreground hover:text-foreground cursor-pointer"
                aria-label="Anterior testimonio"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                      i === activeIndex
                        ? "w-6 bg-primary/70"
                        : "w-1.5 bg-border hover:bg-muted-foreground/30"
                    }`}
                    aria-label={`Ver testimonio ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setActiveIndex((prev) => (prev + 1) % testimonials.length)
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/30 text-muted-foreground transition-all duration-300 hover:border-foreground hover:text-foreground cursor-pointer"
                aria-label="Siguiente testimonio"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
