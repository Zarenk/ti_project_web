"use client"

import { useState } from "react"
import { ArrowRight, Check, Zap } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { NewsletterSectionProps } from "../types"

export default function BoldNewsletterSection(_props: NewsletterSectionProps) {
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
    <section className="relative py-16 md:py-24 bg-slate-950 text-white overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-white/60">No te pierdas nada</span>
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Únete a la{" "}
          <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            comunidad
          </span>
        </h2>
        <p className="mt-3 text-sm text-white/40 leading-relaxed">
          Ofertas exclusivas, lanzamientos y contenido especial directo a tu correo.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="h-12 flex-1 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 transition-colors duration-200"
          />
          <button
            type="submit"
            disabled={submitted}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.4)] hover:scale-105 disabled:opacity-50 cursor-pointer"
            aria-label="Suscribirse"
          >
            {submitted ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {submitted && (
          <p className="mt-3 text-xs text-primary animate-[fadeIn_0.3s_ease-out_both]">
            ¡Bienvenido a la comunidad!
          </p>
        )}
      </div>
    </section>
  )
}
