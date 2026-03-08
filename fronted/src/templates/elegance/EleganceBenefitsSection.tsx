"use client"

import type { BenefitsSectionProps } from "../types"

export default function EleganceBenefitsSection({ benefits }: BenefitsSectionProps) {
  if (!benefits.length) return null

  return (
    <section className="py-16 md:py-24 bg-muted/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-3">
            Por qué elegirnos
          </p>
          <h2 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl">
            Nuestras ventajas
          </h2>
          <div className="mx-auto mt-4 h-px w-12 bg-border" />
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center gap-4 p-6"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/5 text-primary/70">
                {benefit.icon}
              </div>
              <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-foreground">
                {benefit.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground max-w-[220px]">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
