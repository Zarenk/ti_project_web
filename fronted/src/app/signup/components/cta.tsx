"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function CTA() {
  return (
    <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-y border-primary/10">
      <ScrollReveal className="max-w-4xl mx-auto text-center space-y-6" animateClass="animate-fade-in-up">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance">Comienza Hoy, Sin Tarjeta de Crédito</h2>
        <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
          Únete a cientos de empresas peruanas que ya gestionan su facturación electrónica con Factura Cloud.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground font-semibold group"
            asChild
          >
            <Link href="#signup-form">
              <span className="relative z-10 flex items-center">
                Probar 14 Días Gratis
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 translate-x-[-120%] group-hover:opacity-100 group-hover:translate-x-[120%] transition duration-700 ease-out" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-border/50 hover:bg-muted font-semibold">
            Ver Demo en Vivo
          </Button>
        </div>
      </ScrollReveal>
    </section>
  );
}
