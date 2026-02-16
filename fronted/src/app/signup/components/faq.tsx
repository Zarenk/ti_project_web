"use client";

import { ScrollReveal } from "@/components/scroll-reveal";

const QUESTIONS = [
  {
    question: "¿Necesito tarjeta para la prueba?",
    answer: "No. La demo dura 14 días, incluye datos por industria y puedes cancelarla o convertirla en plan de pago cuando quieras.",
  },
  {
    question: "¿Puedo usar mis propios comprobantes?",
    answer: "Sí. Puedes emitir facturas reales con tu RUC desde el día 1. Sólo debes conectar tu certificado digital SUNAT.",
  },
  {
    question: "¿Cómo migran mis datos?",
    answer: "Recibimos tus productos y clientes en Excel, los normalizamos y los subimos a tu tenant demo para que veas el resultado final.",
  },
  {
    question: "¿Qué soporte tengo en la prueba?",
    answer: "Acceso completo a chat, WhatsApp, vídeo-tutoriales y un onboarding corto en vivo para tu equipo.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-12">
        <ScrollReveal className="text-center space-y-4" animateClass="animate-fade-in-up">
          <p className="text-sm uppercase tracking-wide text-primary font-semibold">Preguntas frecuentes</p>
          <h2 className="text-3xl md:text-4xl font-bold text-balance">Todo lo que necesitas saber antes de probar</h2>
          <p className="text-lg text-foreground/60">
            Si tienes otra duda, escríbenos a soporte y te respondemos en minutos.
          </p>
        </ScrollReveal>
        <div className="space-y-4">
          {QUESTIONS.map((item, index) => (
            <ScrollReveal
              key={item.question}
              delay={0.05 * index}
              animateClass="animate-fade-in-up"
              className="rounded-2xl border border-border/40 bg-background px-6 py-5 shadow-sm"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{item.question}</h3>
                  <span className="text-sm text-primary">#{index + 1}</span>
                </div>
                <p className="text-foreground/70">{item.answer}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
