"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Monitor, Facebook, Twitter, Instagram, Youtube, Phone, Mail, MapPin, Headphones } from "lucide-react"
import Image from "next/image"
import { useSiteSettings } from "@/context/site-settings-context"
import { getLogoForTheme, getSiteName, normalizeHref } from "@/utils/site-settings"
import { useTheme } from "next-themes"
import { useMemo } from "react"

export default function Footer() {
  const { settings } = useSiteSettings()
  const { resolvedTheme } = useTheme()
  const siteName = getSiteName(settings)
  const logoSrc = getLogoForTheme(settings, resolvedTheme === "dark" ? "dark" : "light")

  const socialLinks = useMemo(() => {
    const entries: Array<{
      key: keyof typeof settings.social
      label: string
      href: string
      icon: typeof Facebook
    }> = [
      { key: "facebook", label: "Facebook", icon: Facebook, href: "" },
      { key: "instagram", label: "Instagram", icon: Instagram, href: "" },
      { key: "tiktok", label: "TikTok", icon: Monitor, href: "" },
      { key: "youtube", label: "YouTube", icon: Youtube, href: "" },
      { key: "x", label: "X", icon: Twitter, href: "" },
    ]

    return entries
      .map((entry) => {
        const href = normalizeHref(settings.social[entry.key])
        if (!href) {
          return null
        }
        return { ...entry, href }
      })
      .filter(Boolean) as Array<{ key: string; label: string; href: string; icon: typeof Facebook }>
  }, [settings.social])

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-blue-900 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Image
                src={logoSrc}
                alt={siteName}
                width={64}
                height={64}
                className="h-16 w-16"
              />
              <span className="text-2xl font-bold">{siteName}</span>
            </div>
            <p className="text-blue-200 mb-6">
              {siteName} es tu socio de confianza para computadoras, laptops y accesorios tecnológicos de primera calidad.
              Productos de calidad, soporte experto y precios inmejorables.
            </p>
            {socialLinks.length > 0 ? (
              <div className="flex gap-4">
                {socialLinks.map(({ key, icon: Icon, href, label }) => {
                  const isExternal = href.startsWith("http")
                  return (
                    <Button
                      key={key}
                      size="icon"
                      variant="ghost"
                      className="text-blue-200 hover:text-white hover:bg-blue-800"
                      asChild
                    >
                      <Link
                        href={href}
                        aria-label={label}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noreferrer" : undefined}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                    </Button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6">Acceso Rapido</h3>
            <ul className="space-y-3 text-blue-200">
              <li>
                <Link href="/laptops" className="hover:text-white transition-colors">
                  Laptops
                </Link>
              </li>
              <li>
                <Link href="/desktops" className="hover:text-white transition-colors">
                  Computadoras
                </Link>
              </li>
              <li>
                <Link href="/gaming" className="hover:text-white transition-colors">
                  PCs Gaming
                </Link>
              </li>
              <li>
                <Link href="/accessories" className="hover:text-white transition-colors">
                  Accesorios
                </Link>
              </li>
              <li>
                <Link href="/deals" className="hover:text-white transition-colors">
                  Ofertas
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-white transition-colors">
                  Soporte Tecnico
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6">Servicio al Cliente</h3>
            <ul className="space-y-3 text-blue-200">
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contactos
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-white transition-colors">
                  Informacion de envio
                </Link>
              </li>
              <li>
                <Link href="/warranty" className="hover:text-white transition-colors">
                  Devoluciones
                </Link>
              </li>
              <li>
                <Link href="/warranty" className="hover:text-white transition-colors">
                  Garantias
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-white transition-colors">
                  Revisa tu pedido
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6">Contactanos</h3>
            <div className="space-y-4 text-blue-200">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5" />
                <span>+51 949 426 294</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5" />
                <span>tecnologiatitacna@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5" />
                <span>Av. Coronel Mendoza 1945 C.C. Mercadillo Bolognesi K-367 Primera Fila Tacna - Peru</span>
              </div>
              <div className="flex items-center gap-3">
                <Headphones className="h-5 w-5" />
                <span>24/7 Soporte a Clientes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-blue-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-blue-200 mb-4 md:mb-0">
            © {currentYear} {siteName}. Todos los derechos reservados. | Politicas de Privacidad | Terminos de Servicio
          </p>
          <div className="flex items-center gap-4 text-blue-200">
            <span>Pagos seguros a través de</span>
            <div className="flex gap-2">
              <div className="bg-card text-blue-900 px-2 py-1 rounded text-xs font-bold">VISA</div>
              <div className="bg-card text-blue-900 px-2 py-1 rounded text-xs font-bold">MC</div>
              <div className="bg-card text-blue-900 px-2 py-1 rounded text-xs font-bold">AMEX</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
