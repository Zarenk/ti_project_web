"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { ShieldCheck, FileCheck, Lock } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Términos de servicio",
    description: "Contrato transparente: SLA, límites de uso y responsabilidades del proveedor y del cliente.",
    details: ["Actualizado cada semestre", "Disponible en español e inglés", "Aprobado por el área legal"],
  },
  {
    icon: Lock,
    title: "Privacidad y datos",
    description: "Cumplimos con la LPDP peruana e ISO 27001. Accesos auditados y cifrado AES-256.",
    details: ["Backups diarios", "Retención configurable", "Consentimiento explícito"],
  },
  {
    icon: FileCheck,
    title: "Certificaciones y cumplimiento",
    description: "Integración directa con SUNAT, reportes de auditoría y controles SOC-ready.",
    details: ["Conectores SUNAT", "Reportes de actividad", "Soporte para inspecciones"],
  },
];

export default function Compliance() {
  return (
    <section id="compliance" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/10">
      <div className="max-w-6xl mx-auto space-y-12">
        <ScrollReveal className="text-center space-y-4" animateClass="animate-fade-in-up">
          <p className="text-sm uppercase tracking-wide text-primary font-semibold">Términos & Privacidad</p>
          <h2 className="text-3xl md:text-4xl font-bold text-balance">Confianza legal desde el primer día</h2>
          <p className="text-lg text-foreground/60">
            Compartimos nuestros acuerdos y políticas en lenguaje claro. Aquí tienes un resumen de los puntos claves.
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ITEMS.map((item, index) => (
            <ScrollReveal
              key={item.title}
              delay={0.05 * index}
              animateClass="animate-fade-in-up"
              className="h-full"
            >
              <div className="h-full rounded-2xl border border-border/40 bg-background/95 p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <item.icon className="w-10 h-10 text-primary" />
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                </div>
                <p className="text-foreground/70">{item.description}</p>
                <ul className="text-sm text-foreground/60 space-y-2">
                  {item.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                <a href="/policy/privacy" className="text-primary font-semibold text-sm mt-auto hover:underline">
                  Conoce más →
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
