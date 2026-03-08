"use client"

import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { NewsletterSectionProps } from "../types"

export default function EleganceNewsletterSection(_props: NewsletterSectionProps) {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setTimeout(() => {
      setEmail("")
      setSubmitted(false)
    }, 3000)
  }

  return (
    <section className="py-16 md:py-24 bg-muted/10">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-3">
          Mantente al día
        </p>
        <h2 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl">
          Suscríbete al newsletter
        </h2>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Recibe las últimas novedades, ofertas exclusivas y lanzamientos directamente en tu correo.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="h-11 flex-1 rounded-full border-border/30 bg-background px-5 text-sm transition-colors duration-300 focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={submitted}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-all duration-300 hover:bg-primary hover:scale-105 disabled:opacity-50 cursor-pointer"
            aria-label="Suscribirse"
          >
            {submitted ? (
              <Check className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </button>
        </form>

        {submitted && (
          <p className="mt-3 text-xs text-primary/70 animate-[fadeIn_0.3s_ease-out_both]">
            ¡Gracias por suscribirte!
          </p>
        )}
      </div>
    </section>
  )
}
