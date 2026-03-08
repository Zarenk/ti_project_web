"use client"

import { useState } from "react"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { ContactLayoutProps } from "../types"

export default function EleganceContactLayout(_props: ContactLayoutProps) {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-24">
      <div className="text-center mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-3">
          Comunícate con nosotros
        </p>
        <h1 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl">
          Contacto
        </h1>
        <div className="mx-auto mt-4 h-px w-12 bg-border" />
      </div>

      <div className="grid gap-12 md:grid-cols-2">
        {/* Contact info */}
        <div className="space-y-8">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Estamos aquí para ayudarte. No dudes en comunicarte con nosotros por cualquiera de estos medios.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/5">
                <Phone className="h-4 w-4 text-primary/70" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1">
                  Teléfono
                </p>
                <p className="text-sm text-foreground">+51 949 426 294</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/5">
                <Mail className="h-4 w-4 text-primary/70" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1">
                  Email
                </p>
                <p className="text-sm text-foreground break-words">tecnologiatitacna@gmail.com</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/5">
                <MapPin className="h-4 w-4 text-primary/70" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1">
                  Dirección
                </p>
                <p className="text-sm text-foreground">
                  Av. Coronel Mendoza 1945 C.C. Mercadillo Bolognesi K-367, Tacna, Perú
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
                Nombre
              </label>
              <Input
                required
                className="h-11 rounded-xl border-border/30 transition-colors duration-300 focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                required
                className="h-11 rounded-xl border-border/30 transition-colors duration-300 focus:border-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
              Asunto
            </label>
            <Input
              className="h-11 rounded-xl border-border/30 transition-colors duration-300 focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
              Mensaje
            </label>
            <textarea
              required
              rows={5}
              className="w-full rounded-xl border border-border/30 bg-background px-4 py-3 text-sm resize-none transition-colors duration-300 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <Button
            type="submit"
            disabled={submitted}
            className="h-12 rounded-full text-xs font-medium uppercase tracking-[0.1em] px-8 transition-all duration-300 cursor-pointer"
          >
            {submitted ? (
              "¡Mensaje enviado!"
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-2" />
                Enviar mensaje
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
