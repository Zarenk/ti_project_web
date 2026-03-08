"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import type { PaymentLayoutProps } from "../types"

const STEPS = [
  { label: "Datos", key: "info" },
  { label: "Envío", key: "shipping" },
  { label: "Pago", key: "payment" },
]

export default function BoldPaymentLayout(_props: PaymentLayoutProps) {
  const [currentStep] = useState(0)

  return (
    <div className="bg-slate-950 text-white min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <h1 className="text-2xl font-extrabold tracking-tight text-center mb-8 md:mb-12">Checkout</h1>

        {/* Step indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition-all duration-300 ${
                  i < currentStep
                    ? "bg-gradient-to-r from-primary to-purple-500 text-white shadow-[0_0_12px_rgba(var(--primary-rgb,99,102,241),0.3)]"
                    : i === currentStep
                      ? "bg-gradient-to-r from-primary to-purple-500 text-white shadow-[0_0_12px_rgba(var(--primary-rgb,99,102,241),0.3)]"
                      : "bg-white/5 border border-white/10 text-white/20"
                }`}>
                  {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${i <= currentStep ? "text-white" : "text-white/20"}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 md:p-8 min-h-[300px]">
          <p className="text-sm text-white/30 text-center">
            El formulario de pago se integrará con la lógica existente de checkout.
          </p>
        </div>
      </div>
    </div>
  )
}
