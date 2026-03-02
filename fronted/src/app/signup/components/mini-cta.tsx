"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function MiniCta() {
  return (
    <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-y border-primary/10">
      <ScrollReveal
        className="max-w-2xl mx-auto text-center space-y-5"
        animateClass="animate-fade-in-up"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-balance">
          Listo para gestionar tu negocio?
        </h2>
        <p className="text-foreground/60">
          Crea tu cuenta gratis en menos de 2 minutos. Sin tarjeta de credito.
        </p>
        <Button
          size="lg"
          className="font-semibold group cursor-pointer"
          asChild
        >
          <a href="#signup-form">
            Crear cuenta gratis
            <ArrowRight
              size={16}
              className="ml-2 group-hover:translate-x-1 transition-transform"
            />
          </a>
        </Button>
      </ScrollReveal>
    </section>
  );
}
