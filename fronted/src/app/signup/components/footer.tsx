"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">TI</span>
              </div>
              <span className="font-bold text-foreground">Factura Cloud</span>
            </div>
            <p className="text-sm text-foreground/60">
              Solución integral de facturación electrónica SUNAT para empresas peruanas.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">Producto</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><a className="hover:text-foreground" href="#features">Características</a></li>
              <li><a className="hover:text-foreground" href="#pricing">Precios</a></li>
              <li><a className="hover:text-foreground" href="#how-it-works">Seguridad</a></li>
              <li><Link className="hover:text-foreground" href="/dashboard">Panel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><a className="hover:text-foreground" href="#support">Soporte</a></li>
              <li><a className="hover:text-foreground" href="#faq">Preguntas frecuentes</a></li>
              <li><a className="hover:text-foreground" href="#compliance">Términos & Privacidad</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li>Certificado SUNAT</li>
              <li>ISO 27001</li>
              <li>Encriptación 256-bit</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between gap-4 text-sm text-foreground/60">
          <p>© {new Date().getFullYear()} Factura Cloud. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="https://twitter.com" className="hover:text-foreground">Twitter</a>
            <a href="https://www.linkedin.com" className="hover:text-foreground">LinkedIn</a>
            <a href="https://facebook.com" className="hover:text-foreground">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
