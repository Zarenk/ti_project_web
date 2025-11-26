"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-20 md:pt-32 md:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute top-20 right-10 w-80 h-80 bg-primary/15 blur-3xl rounded-full animate-pulse" />
          <div className="absolute bottom-0 left-10 w-96 h-96 bg-primary/10 blur-[140px] rounded-full animate-[pulse_8s_ease-in-out_infinite]" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <ScrollReveal className="space-y-6" animateClass="animate-fade-in-up">
          <div className="inline-flex px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
            <p className="text-sm font-medium text-primary">🚀 La solución #1 en Perú</p>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-balance">
            Gestiona tu Negocio en la Nube
          </h1>
          <p className="text-lg text-foreground/70 max-w-md leading-relaxed">
            Genera comprobantes electrónicos SUNAT, controla inventarios, ventas y clientes desde cualquier dispositivo.
            Todo conectado, seguro y fácil.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold group"
              asChild
            >
              <Link href="#signup-form">
                Probar Gratis
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="font-semibold border-border/50 hover:bg-muted">
              Ver Demo
            </Button>
          </div>
          <div className="pt-4 space-y-2 text-sm text-foreground/60">
            <p>✓ Sin tarjeta de crédito requerida</p>
            <p>✓ Acceso a todas las características</p>
            <p>✓ Soporte 24/7 en español</p>
          </div>
        </ScrollReveal>
        <ScrollReveal className="relative" animateClass="animate-fade-in-up" delay={0.15}>
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-1 border border-primary/20 shadow-2xl">
            <div className="bg-background rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-3 w-24 bg-primary/20 rounded" />
                <div className="flex gap-2">
                  <div className="h-3 w-3 bg-primary/20 rounded-full" />
                  <div className="h-3 w-3 bg-primary/20 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-16 bg-primary/10 rounded-lg" />
                <div className="h-16 bg-primary/10 rounded-lg" />
                <div className="h-16 bg-primary/10 rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-primary/10 rounded" />
                <div className="h-2 bg-primary/10 rounded w-5/6" />
                <div className="h-2 bg-primary/10 rounded w-4/6" />
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 bg-white dark:bg-slate-900 shadow-lg rounded-xl p-4 border border-border/20">
            <p className="text-sm font-semibold">+10,000 usuarios</p>
            <p className="text-xs text-foreground/60">confían en nosotros</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
