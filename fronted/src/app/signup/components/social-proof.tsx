"use client";

import Image from "next/image";
import { ScrollReveal } from "@/components/scroll-reveal";

interface CertItem {
  name: string;
  label: string;
  abbr: string;
  logo?: string;
}

const CERTS: CertItem[] = [
  { name: "SUNAT", label: "Certificado SUNAT", abbr: "SU", logo: "/icons/sunat-logo.png" },
  { name: "ISO 27001", label: "ISO 27001", abbr: "IS" },
  { name: "AES-256", label: "Encriptacion AES-256", abbr: "AE" },
  { name: "SSL/TLS", label: "Conexion Segura", abbr: "SS" },
  { name: "AWS", label: "Cloud AWS", abbr: "AW", logo: "/icons/aws-logo.png" },
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
            {CERTS.map((cert) => (
              <div
                key={cert.name}
                className="flex items-center gap-2.5 text-muted-foreground/70 hover:text-foreground/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {cert.logo ? (
                    <Image
                      src={cert.logo}
                      alt={cert.name}
                      width={32}
                      height={32}
                      className="w-5 h-5 object-contain"
                    />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {cert.abbr}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium whitespace-nowrap">
                  {cert.label}
                </span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
