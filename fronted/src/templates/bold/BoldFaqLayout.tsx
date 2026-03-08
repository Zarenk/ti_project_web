"use client"

import { useState } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"
import type { FaqLayoutProps } from "../types"

const FAQ_ITEMS = [
  {
    question: "¿Cómo puedo realizar un pedido?",
    answer: "Navega por nuestra tienda, agrega productos al carrito y procede al checkout. Puedes pagar con múltiples métodos de pago.",
  },
  {
    question: "¿Cuáles son los métodos de pago disponibles?",
    answer: "Aceptamos tarjetas de crédito/débito (Visa, Mastercard, AMEX), transferencia bancaria y pagos en efectivo.",
  },
  {
    question: "¿Cuánto tarda el envío?",
    answer: "El tiempo de envío depende de tu ubicación. Generalmente entre 2 a 5 días hábiles para envíos nacionales.",
  },
  {
    question: "¿Puedo devolver un producto?",
    answer: "Sí, aceptamos devoluciones dentro de los 30 días posteriores a la compra. El producto debe estar en su estado original.",
  },
  {
    question: "¿Cómo puedo rastrear mi pedido?",
    answer: "Puedes rastrear tu pedido usando el número de seguimiento que recibirás por correo electrónico, o visitando nuestra página de rastreo.",
  },
]

export default function BoldFaqLayout(_props: FaqLayoutProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="bg-slate-950 text-white min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Preguntas{" "}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              frecuentes
            </span>
          </h1>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`rounded-2xl border transition-all duration-300 ${
                openIndex === i
                  ? "border-primary/20 bg-white/[0.03]"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left text-sm font-medium text-white transition-colors duration-200 cursor-pointer"
              >
                <span className="pr-4">{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-white/30 transition-transform duration-300 ${
                    openIndex === i ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  openIndex === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="px-5 pb-5 text-sm leading-relaxed text-white/50">
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
