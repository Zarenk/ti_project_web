"use client";

import { ScrollReveal } from "@/components/scroll-reveal";

const LOGOS = [
  { name: "SUNAT", label: "Certificado SUNAT" },
  { name: "ISO 27001", label: "ISO 27001" },
  { name: "AES-256", label: "Encriptacion AES-256" },
  { name: "SSL/TLS", label: "Conexion Segura" },
  { name: "AWS", label: "Cloud AWS" },
];

export default function SocialProof() {
  return (
    <section className="py-8 md:py-10 px-4 sm:px-6 lg:px-8 border-y border-border/30 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal animateClass="animate-fade-in-up">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
            Certificaciones y tecnologia que respaldan tu negocio
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {LOGOS.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {logo.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-medium whitespace-nowrap">
                  {logo.label}
                </span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
