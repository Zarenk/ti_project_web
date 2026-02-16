"use client";

import { Card } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";

const STEPS = [
  {
    step: "01",
    title: "Crea tu Cuenta",
    description: "Regístrate en minutos con tu email y contraseña. Sin documentos complicados.",
  },
  {
    step: "02",
    title: "Configura tu Negocio",
    description: "Ingresa los datos de tu empresa y conecta con SUNAT de forma segura.",
  },
  {
    step: "03",
    title: "Comienza a Facturar",
    description: "Genera tus primeros comprobantes electrónicos en segundos.",
  },
  {
    step: "04",
    title: "Escala tu Operación",
    description: "Controla inventarios, ventas y clientes con reportes en un solo lugar.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16 space-y-4" animateClass="animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance">Cómo Funciona</h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">Cuatro pasos simples para empezar</p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, index) => (
            <ScrollReveal
              key={step.step}
              delay={0.08 * index}
              animateClass="animate-fade-in-up"
              className="relative h-full"
            >
              {index < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-1 bg-gradient-to-r from-primary/30 to-transparent -z-10" />
              )}
              <Card className="p-6 border-border/40 bg-background h-full hover:border-primary/20 transition-all duration-300">
                <div className="mb-4 inline-block">
                  <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {step.step}
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
