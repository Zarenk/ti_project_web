"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

const PLANS = [
  {
    name: "Básico",
    price: "S/.50",
    period: "/mes",
    description: "Perfecto para comenzar",
    cta: "Probar Gratis",
    features: [
      "Hasta 100 comprobantes/mes",
      "Control de inventarios básico",
      "Acceso para 1 usuario",
      "Reportes estándar",
    ],
    highlighted: false,
  },
  {
    name: "Profesional",
    price: "S/.100",
    period: "/mes",
    description: "Para negocios en crecimiento",
    cta: "Comenzar Ahora",
    features: [
      "Comprobantes ilimitados",
      "Inventario avanzado",
      "Hasta 5 usuarios",
      "Reportes personalizados",
      "Integraciones y API",
    ],
    highlighted: true,
  },
  {
    name: "Empresarial",
    price: "Personalizado",
    period: "",
    description: "Soluciones a medida",
    cta: "Contactar Ventas",
    features: [
      "Todas las características Pro",
      "Usuarios ilimitados",
      "Capacitación personalizada",
      "Account manager dedicado",
    ],
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16 space-y-4" animateClass="animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance">Precios claros y flexibles</h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">Sin costos ocultos. Cancela cuando quieras.</p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan, index) => (
            <ScrollReveal
              key={plan.name}
              delay={0.08 * index}
              animateClass="animate-fade-in-up"
              className="h-full"
            >
              <Card
                className={`relative overflow-hidden border transition-all duration-300 h-full ${
                  plan.highlighted
                    ? "border-primary/50 shadow-2xl ring-1 ring-primary/30 md:scale-105 bg-primary/5"
                    : "border-border/40 hover:border-primary/20 bg-background"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold rounded-bl-lg">
                    Popular
                  </div>
                )}
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-foreground/60 text-sm mb-6">{plan.description}</p>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-foreground/60 ml-1">{plan.period}</span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full mb-8 font-semibold"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
                <div className="space-y-4 text-sm">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check size={18} className="text-primary mt-0.5" />
                      <span className="text-foreground/80 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
                </div>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
