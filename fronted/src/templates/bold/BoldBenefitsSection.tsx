"use client"

import type { BenefitsSectionProps } from "../types"

export default function BoldBenefitsSection({ benefits }: BenefitsSectionProps) {
  if (!benefits.length) return null

  return (
    <section className="relative py-16 md:py-24 bg-slate-950 text-white overflow-hidden">
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            ¿Por qué{" "}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              elegirnos
            </span>
            ?
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="group flex flex-col items-center text-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:border-primary/20 hover:bg-white/[0.04]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 text-primary transition-all duration-300 group-hover:from-primary/20 group-hover:to-purple-500/20 group-hover:shadow-[0_0_16px_rgba(var(--primary-rgb,99,102,241),0.2)]">
                {benefit.icon}
              </div>
              <h3 className="text-sm font-semibold text-white">
                {benefit.title}
              </h3>
              <p className="text-xs leading-relaxed text-white/40 max-w-[220px]">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
