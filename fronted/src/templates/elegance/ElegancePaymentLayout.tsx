"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import type { PaymentLayoutProps } from "../types"

const STEPS = [
  { label: "Datos", key: "info" },
  { label: "Envío", key: "shipping" },
  { label: "Pago", key: "payment" },
]

export default function ElegancePaymentLayout(_props: PaymentLayoutProps) {
  const [currentStep] = useState(0)

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      <h1 className="text-2xl font-extralight tracking-tight text-foreground text-center mb-8 md:mb-12">
        Checkout
      </h1>

      {/* Step indicator — thin progress bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-all duration-500 ${
                  i < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === currentStep
                      ? "border-foreground bg-foreground text-background"
                      : "border-border/30 text-muted-foreground/40"
                }`}
              >
                {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-xs uppercase tracking-[0.1em] hidden sm:inline ${
                  i <= currentStep ? "text-foreground" : "text-muted-foreground/40"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
        <div className="h-0.5 bg-border/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-500 rounded-full"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Payment content placeholder */}
      <div className="rounded-2xl border border-border/20 p-6 md:p-8 min-h-[300px]">
        <p className="text-sm text-muted-foreground text-center">
          El formulario de pago se integrará con la lógica existente de checkout.
        </p>
      </div>
    </div>
  )
}
