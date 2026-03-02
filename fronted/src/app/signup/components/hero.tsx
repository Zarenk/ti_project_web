"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { SignupWizard } from "./signup-wizard";

export default function Hero() {
  return (
    <section
      id="signup-form"
      className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 lg:px-8"
    >
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute top-20 right-10 w-80 h-80 bg-primary/15 blur-3xl rounded-full animate-pulse" />
          <div className="absolute bottom-0 left-10 w-96 h-96 bg-primary/10 blur-[140px] rounded-full animate-[pulse_8s_ease-in-out_infinite]" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        {/* Left: Copy */}
        <ScrollReveal className="space-y-6 pt-4 lg:pt-10" animateClass="animate-fade-in-up">
          <div className="inline-flex px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
            <p className="text-sm font-medium text-primary">
              Prueba gratis &middot; Sin tarjeta de credito
            </p>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-balance">
            Gestiona tu Negocio en la Nube
          </h1>
          <p className="text-base md:text-lg text-foreground/70 max-w-md leading-relaxed">
            Facturacion electronica SUNAT, inventarios, ventas y clientes.
            Todo conectado, seguro y facil desde cualquier dispositivo.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-foreground/60">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Demo adaptada a tu industria
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Invita a tu equipo al instante
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Soporte 24/7 en espanol
            </span>
          </div>

          {/* Trust metrics */}
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-2xl font-bold text-foreground">+10,000</p>
              <p className="text-xs text-foreground/50">usuarios activos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">99.9%</p>
              <p className="text-xs text-foreground/50">uptime garantizado</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">&lt;30 min</p>
              <p className="text-xs text-foreground/50">respuesta soporte</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Right: Wizard */}
        <ScrollReveal animateClass="animate-fade-in-up" delay={0.1}>
          <SignupWizard />
        </ScrollReveal>
      </div>
    </section>
  );
}
