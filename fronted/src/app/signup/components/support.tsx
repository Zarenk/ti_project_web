"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { Mail, MessageCircle, BookOpen, Headphones } from "lucide-react";

const CHANNELS = [
  {
    icon: Mail,
    title: "Centro de ayuda 24/7",
    description: "Responde FAQs y abre tickets ilimitados. Tiempo medio de respuesta < 30 min.",
    action: "support@facturacloud.pe",
  },
  {
    icon: MessageCircle,
    title: "Chat y WhatsApp",
    description: "Agentes en vivo para onboarding, dudas contables y SUNAT.",
    action: "+51 949 426 294",
  },
  {
    icon: BookOpen,
    title: "Guías y plantillas",
    description: "Video-tutoriales, checklists de migración y casos de uso por industria.",
    action: "Ver documentación",
  },
  {
    icon: Headphones,
    title: "Éxito del cliente",
    description: "Acompañamiento personalizado para empresas con más de 50 usuarios.",
    action: "Agenda una sesión",
  },
];

export default function Support() {
  return (
    <section id="support" className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-12">
        <ScrollReveal className="text-center space-y-4" animateClass="animate-fade-in-up">
          <p className="text-sm uppercase tracking-wide text-primary font-semibold">Estamos contigo</p>
          <h2 className="text-3xl md:text-4xl font-bold text-balance">Soporte dedicado para tu operación</h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Desde la activación hasta la facturación diaria. Elige el canal que prefieras y responde en minutos.
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CHANNELS.map((channel, index) => (
            <ScrollReveal
              key={channel.title}
              delay={0.05 * index}
              animateClass="animate-fade-in-up"
              className="h-full"
            >
              <div className="h-full rounded-2xl border border-border/40 bg-muted/20 p-6 flex flex-col gap-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <channel.icon className="w-10 h-10 text-primary" />
                  <div>
                    <h3 className="text-xl font-semibold">{channel.title}</h3>
                    <p className="text-sm text-foreground/60">{channel.action}</p>
                  </div>
                </div>
                <p className="text-foreground/70 flex-1">{channel.description}</p>
                <div className="text-sm text-primary font-semibold">Respuesta garantizada</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
