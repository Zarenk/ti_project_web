"use client";

import { Card } from "@/components/ui/card";
import {
  FileText,
  BarChart3,
  Zap,
  Smartphone,
  Calculator,
  ShoppingBag,
} from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

const FEATURES = [
  {
    icon: FileText,
    label: "Comprobantes",
    metric: "4 tipos",
    title: "Facturacion Electronica SUNAT",
    description: "Boletas, facturas, NC/ND con validacion automatica y envio directo a SUNAT.",
  },
  {
    icon: Zap,
    label: "Inventario",
    metric: "Tiempo real",
    title: "Control de Inventarios",
    description: "Stock en tiempo real, alertas de minimo, series, lotes y transferencias entre tiendas.",
  },
  {
    icon: BarChart3,
    label: "Analitica",
    metric: "+25 reportes",
    title: "Reportes y Dashboard",
    description: "KPIs de ventas, rentabilidad por producto, exportacion a Excel y reportes SUNAT.",
  },
  {
    icon: Calculator,
    label: "Contabilidad",
    metric: "PCGE completo",
    title: "Contabilidad Integrada",
    description: "Asientos automaticos, libros electronicos PLE, balance y estados financieros.",
  },
  {
    icon: Smartphone,
    label: "Multi-dispositivo",
    metric: "100% cloud",
    title: "Acceso desde Cualquier Lugar",
    description: "PC, tablet o celular con sincronizacion instantanea. Sin instalaciones.",
  },
  {
    icon: ShoppingBag,
    label: "E-commerce",
    metric: "Tienda 24/7",
    title: "Tienda Online Conectada",
    description: "Catalogo publico, pedidos web y stock sincronizado con tu inventario real.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-14 space-y-4" animateClass="animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance">
            Todo lo que tu negocio necesita
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Facturacion, inventario, contabilidad y mas — en una sola plataforma
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <ScrollReveal
              key={feature.title}
              delay={0.06 * index}
              animateClass="animate-fade-in-up"
              className="h-full"
            >
              <Card className="p-6 border-border/40 bg-background hover:shadow-lg hover:border-primary/20 transition-all duration-300 group h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-block p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
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
