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

export default function EleganceFaqLayout(_props: FaqLayoutProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-24">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5">
            <HelpCircle className="h-5 w-5 text-primary/70" />
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-3">
          Soporte
        </p>
        <h1 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl">
          Preguntas frecuentes
        </h1>
        <div className="mx-auto mt-4 h-px w-12 bg-border" />
      </div>

      <div className="space-y-0 divide-y divide-border/20">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between py-5 text-left text-sm font-normal text-foreground transition-colors duration-300 hover:text-primary cursor-pointer"
            >
              <span className="pr-4">{item.question}</span>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-500 ${
                  openIndex === i ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-500 ease-out ${
                openIndex === i ? "max-h-40 opacity-100 pb-5" : "max-h-0 opacity-0"
              }`}
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
