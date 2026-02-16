"use client";

import { Card } from "@/components/ui/card";
import {
  FileText,
  BarChart3,
  Users,
  Zap,
  Shield,
  Smartphone,
  Calculator,
  LayoutDashboard,
  Megaphone,
  Bot,
  ShoppingBag,
} from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

const FEATURES = [
  {
    icon: FileText,
    label: "Comprobantes",
    metric: "4 tipos soportados",
    title: "Facturación Electrónica SUNAT",
    description: "Genera boletas, facturas, NC/ND y envía a SUNAT en segundos con validación automática.",
  },
  {
    icon: BarChart3,
    label: "Analítica",
    metric: "+25 reportes",
    title: "Reportes Detallados",
    description: "Seguimiento de ventas, KPIs y dashboards descargables para presentaciones y SUNAT.",
  },
  {
    icon: Users,
    label: "Clientes",
    metric: "Historial completo",
    title: "Gestión de Clientes",
    description: "Segmenta clientes, registra documentos y consulta su comportamiento y créditos.",
  },
  {
    icon: Zap,
    label: "Inventario",
    metric: "Alertas inteligentes",
    title: "Control de Inventarios",
    description: "Stock en tiempo real, mínimo por producto y transferencias entre tiendas.",
  },
  {
    icon: Smartphone,
    label: "Cloud",
    metric: "100% responsive",
    title: "Acceso Multi-dispositivo",
    description: "Trabaja desde PC, tablet o smartphone con sincronización instantánea en la nube.",
  },
  {
    icon: Shield,
    label: "Seguridad",
    metric: "ISO + Backups",
    title: "Seguridad Empresarial",
    description: "Encriptación AES-256, backups diarios y cumplimiento total con las regulaciones peruanas.",
  },
  {
    icon: Calculator,
    label: "Contabilidad",
    metric: "Libros + reportes",
    title: "Contabilidad Integrada",
    description: "Genera asientos contables, libros electrónicos y reportes tributarios sin salir del panel.",
  },
  {
    icon: LayoutDashboard,
    label: "Catálogos",
    metric: "PDF + Web",
    title: "Catálogos Inteligentes",
    description: "Crea catálogos en PDF y micrositios públicos con la información viva de tu inventario.",
  },
  {
    icon: Megaphone,
    label: "Marketing",
    metric: "Campañas",
    title: "Publicidad Automática",
    description: "Activa anuncios y promociones basadas en stock y precios en tiempo real.",
  },
  {
    icon: Bot,
    label: "IA",
    metric: "Insights",
    title: "Asistentes con IA",
    description: "Recibe recomendaciones de precios, textos promocionales y pronósticos con inteligencia artificial.",
  },
  {
    icon: ShoppingBag,
    label: "E-commerce",
    metric: "Store 24/7",
    title: "Tienda Online Propia",
    description: "Publica tu catálogo completo y recibe pedidos en tu propio storefront conectado al inventario.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16 space-y-4" animateClass="animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance">Características Poderosas</h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Todo lo que necesitas para gestionar tu negocio profesionalmente
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <ScrollReveal
              key={feature.title}
              delay={0.05 * index}
              animateClass="animate-fade-in-up"
              className="h-full"
            >
              <Card className="p-6 border-border/40 bg-background hover:shadow-lg hover:border-primary/20 transition-all duration-300 group h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-block p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="text-primary" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-foreground/50">{feature.label}</p>
                    <p className="text-sm font-semibold text-primary">{feature.metric}</p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-foreground/60 text-sm leading-relaxed">{feature.description}</p>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
