"use client";

import { Card } from "@/components/ui/card";
import { UserPlus, Building2, Rocket } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

const STEPS = [
  {
    step: "01",
    icon: UserPlus,
    title: "Crea tu Cuenta",
    description: "Registrate en 2 minutos con tu email. Sin documentos, sin tarjeta de credito.",
  },
  {
    step: "02",
    icon: Building2,
    title: "Configura tu Negocio",
    description: "Selecciona tu industria y recibe datos demo personalizados listos para explorar.",
  },
  {
    step: "03",
    icon: Rocket,
    title: "Comienza a Facturar",
    description: "Genera comprobantes electronicos, controla inventario y gestiona clientes desde el dia 1.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-14 space-y-4" animateClass="animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance">
            Empieza en 3 pasos
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            De cero a facturando en menos de 5 minutos
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 -z-10" />

          {STEPS.map((step, index) => (
            <ScrollReveal
              key={step.step}
              delay={0.1 * index}
              animateClass="animate-fade-in-up"
              className="h-full"
            >
              <Card className="p-6 border-border/40 bg-background h-full hover:border-primary/20 hover:shadow-lg transition-all duration-300 text-center">
                <div className="mb-4 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="text-primary" size={28} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">
                    Paso {step.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-foreground/60 text-sm leading-relaxed">{step.description}</p>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
