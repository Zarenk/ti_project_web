"use client";

import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

const TESTIMONIALS = [
  {
    name: "Carlos Méndez",
    company: "TechSolutions Perú",
    content:
      "Factura Cloud ha transformado la forma en que gestionamos nuestro negocio. La facturación electrónica SUNAT es tan fácil que mi equipo lo hace sin problemas.",
    rating: 5,
    avatar: "👨‍💼",
  },
  {
    name: "María García",
    company: "Importaciones Express",
    content:
      "Antes gastábamos horas en trámites. Ahora todo está automatizado. El soporte en español es excelente y muy rápido.",
    rating: 5,
    avatar: "👩‍💼",
  },
  {
    name: "Juan López",
    company: "Distribuidora JL",
    content:
      "Lo que más me gusta es poder acceder desde mi celular. Genero facturas incluso cuando estoy fuera de la oficina.",
    rating: 5,
    avatar: "👨‍💼",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16 space-y-4" animateClass="animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance">Lo que Dicen Nuestros Clientes</h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">Empresas de todo Perú confían en nuestra plataforma</p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial, index) => (
            <ScrollReveal
              key={testimonial.name}
              delay={0.08 * index}
              animateClass="animate-fade-in-up"
              className="h-full"
            >
              <Card className="p-6 border-border/40 bg-background hover:border-primary/20 transition-all duration-300 h-full">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground/80 mb-6 leading-relaxed italic">“{testimonial.content}”</p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{testimonial.avatar}</div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-foreground/60">{testimonial.company}</p>
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
