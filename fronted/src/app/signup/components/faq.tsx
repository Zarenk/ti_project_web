"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "@/components/scroll-reveal";

const QUESTIONS = [
  {
    id: "trial",
    question: "Necesito tarjeta para la prueba?",
    answer:
      "No. La demo dura 14 dias, incluye datos por industria y puedes cancelarla o convertirla en plan de pago cuando quieras.",
  },
  {
    id: "comprobantes",
    question: "Puedo usar mis propios comprobantes?",
    answer:
      "Si. Puedes emitir facturas reales con tu RUC desde el dia 1. Solo debes conectar tu certificado digital SUNAT.",
  },
  {
    id: "migracion",
    question: "Como migran mis datos?",
    answer:
      "Recibimos tus productos y clientes en Excel, los normalizamos y los subimos a tu entorno demo para que veas el resultado final.",
  },
  {
    id: "soporte",
    question: "Que soporte tengo en la prueba?",
    answer:
      "Acceso completo a chat, WhatsApp, video-tutoriales y un onboarding corto en vivo para tu equipo.",
  },
  {
    id: "seguridad",
    question: "Mis datos estan seguros?",
    answer:
      "Usamos encriptacion AES-256, backups diarios automaticos y cumplimos con la Ley de Proteccion de Datos Personales del Peru e ISO 27001.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-3xl mx-auto space-y-10">
        <ScrollReveal className="text-center space-y-4" animateClass="animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-balance">
            Preguntas frecuentes
          </h2>
          <p className="text-lg text-foreground/60">
            Si tienes otra duda, escribenos a soporte y te respondemos en minutos.
          </p>
        </ScrollReveal>

        <ScrollReveal animateClass="animate-fade-in-up" delay={0.1}>
          <Accordion type="single" collapsible className="space-y-3">
            {QUESTIONS.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="rounded-xl border border-border/40 bg-background px-5 shadow-sm data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-4 cursor-pointer">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/70 pb-4 leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </section>
  );
}
