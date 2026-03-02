"use client";

import { Card } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

const TESTIMONIALS = [
  {
    name: "Carlos Mendez",
    role: "Gerente General",
    company: "TechSolutions Peru",
    content:
      "Factura Cloud ha transformado la forma en que gestionamos nuestro negocio. La facturacion electronica SUNAT es tan facil que mi equipo lo hace sin problemas.",
    rating: 5,
    initials: "CM",
    color: "bg-blue-500",
  },
  {
    name: "Maria Garcia",
    role: "Contadora",
    company: "Importaciones Express",
    content:
      "Antes gastabamos horas en tramites. Ahora todo esta automatizado y los libros electronicos se generan solos. El soporte es excelente.",
    rating: 5,
    initials: "MG",
    color: "bg-emerald-500",
  },
  {
    name: "Juan Lopez",
    role: "Propietario",
    company: "Distribuidora JL",
    content:
      "Lo que mas me gusta es poder acceder desde mi celular. Genero facturas incluso cuando estoy fuera de la oficina. Muy recomendado.",
    rating: 5,
    initials: "JL",
    color: "bg-violet-500",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-14 space-y-4" animateClass="animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance">
            Empresas que confian en nosotros
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Negocios de todo Peru gestionan su facturacion con Factura Cloud
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial, index) => (
            <ScrollReveal
              key={testimonial.name}
              delay={0.08 * index}
              animateClass="animate-fade-in-up"
              className="h-full"
            >
              <Card className="p-6 border-border/40 bg-background hover:border-primary/20 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                <Quote size={24} className="text-primary/20 mb-3" />
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground/80 mb-6 leading-relaxed flex-1">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                  <div className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {testimonial.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-foreground/50">{testimonial.role} — {testimonial.company}</p>
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
