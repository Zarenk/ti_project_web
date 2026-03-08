"use client"

import { useState } from "react"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { ContactLayoutProps } from "../types"

export default function BoldContactLayout(_props: ContactLayoutProps) {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="bg-slate-950 text-white min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Contacto
            </span>
          </h1>
          <p className="mt-3 text-sm text-white/40">Estamos aquí para ayudarte</p>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          {/* Info */}
          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-white/50">
              No dudes en comunicarte con nosotros por cualquiera de estos medios.
            </p>
            {[
              { icon: Phone, label: "Teléfono", value: "+51 949 426 294" },
              { icon: Mail, label: "Email", value: "tecnologiatitacna@gmail.com" },
              { icon: MapPin, label: "Dirección", value: "Av. Coronel Mendoza 1945 C.C. Mercadillo Bolognesi K-367, Tacna, Perú" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/40 mb-1">{label}</p>
                  <p className="text-sm text-white/80 break-words">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-white/40 mb-1.5 block">Nombre</label>
                <Input required className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/40 mb-1.5 block">Email</label>
                <Input type="email" required className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/40 mb-1.5 block">Asunto</label>
              <Input className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/40 mb-1.5 block">Mensaje</label>
              <textarea
                required
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors duration-200"
              />
            </div>
            <Button
              type="submit"
              disabled={submitted}
              className="h-12 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-sm font-semibold px-8 transition-all duration-200 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.4)] cursor-pointer"
            >
              {submitted ? "¡Mensaje enviado!" : <><Send className="h-3.5 w-3.5 mr-2" />Enviar mensaje</>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
