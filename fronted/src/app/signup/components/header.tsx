"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">TI</span>
            </div>
            <span className="text-xl font-bold hidden sm:inline text-foreground">
              Factura Cloud
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-foreground/70 hover:text-foreground transition">
              Características
            </a>
            <a href="#how-it-works" className="text-foreground/70 hover:text-foreground transition">
              Cómo Funciona
            </a>
            <a href="#pricing" className="text-foreground/70 hover:text-foreground transition">
              Precios
            </a>
            <a href="#testimonials" className="text-foreground/70 hover:text-foreground transition">
              Testimonios
            </a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <ModeToggle />
            <Button asChild variant="ghost">
              <Link href="/portal/login">Iniciar Sesion</Link>
            </Button>
            <Button asChild>
              <Link href="/signup#signup-form">Probar Gratis</Link>
            </Button>
          </div>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {isOpen && (
          <nav className="md:hidden pb-4 space-y-2 border-t border-border/40 pt-4">
            <a href="#features" className="block px-3 py-2 rounded-lg hover:bg-muted">
              Características
            </a>
            <a href="#how-it-works" className="block px-3 py-2 rounded-lg hover:bg-muted">
              Cómo Funciona
            </a>
            <a href="#pricing" className="block px-3 py-2 rounded-lg hover:bg-muted">
              Precios
            </a>
            <a href="#testimonials" className="block px-3 py-2 rounded-lg hover:bg-muted">
              Testimonios
            </a>
            <div className="flex flex-col gap-2 pt-2">
              <ModeToggle />
              <Button asChild variant="ghost">
                <Link href="/portal/login">Iniciar Sesion</Link>
              </Button>
              <Button asChild>
                <Link href="/signup#signup-form">Probar Gratis</Link>
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
