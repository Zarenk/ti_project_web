"use client";

import Image from "next/image";
import Link from "next/link";
import { Lock, FileCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Compliance badges (merged from standalone Compliance section) */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <Image src="/icons/sunat-logo.png" alt="SUNAT" width={18} height={18} className="w-[18px] h-[18px] object-contain flex-shrink-0" />
            <span>Certificado SUNAT</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <Lock size={18} className="text-primary flex-shrink-0" />
            <span>Encriptacion AES-256</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <FileCheck size={18} className="text-primary flex-shrink-0" />
            <span>ISO 27001</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <Lock size={18} className="text-primary flex-shrink-0" />
            <span>LPDP Peru</span>
          </div>
        </div>

        {/* Footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">TI</span>
              </div>
              <span className="font-bold text-foreground">Factura Cloud</span>
            </div>
            <p className="text-sm text-foreground/60">
              Solucion integral de facturacion electronica SUNAT para empresas peruanas.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">Producto</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><a className="hover:text-foreground cursor-pointer" href="#features">Caracteristicas</a></li>
              <li><a className="hover:text-foreground cursor-pointer" href="#pricing">Precios</a></li>
              <li><a className="hover:text-foreground cursor-pointer" href="#how-it-works">Como funciona</a></li>
              <li><Link className="hover:text-foreground cursor-pointer" href="/dashboard">Panel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">Soporte</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><a className="hover:text-foreground cursor-pointer" href="#faq">Preguntas frecuentes</a></li>
              <li><span>soporte@facturacloud.pe</span></li>
              <li><span>+51 949 426 294</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><a className="hover:text-foreground cursor-pointer" href="/policy/privacy">Privacidad</a></li>
              <li><a className="hover:text-foreground cursor-pointer" href="/policy/terms">Terminos de servicio</a></li>
              <li><span>Backups diarios</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between gap-4 text-sm text-foreground/60">
          <p>&copy; {new Date().getFullYear()} Factura Cloud. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="https://twitter.com" className="hover:text-foreground cursor-pointer">Twitter</a>
            <a href="https://www.linkedin.com" className="hover:text-foreground cursor-pointer">LinkedIn</a>
            <a href="https://facebook.com" className="hover:text-foreground cursor-pointer">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
