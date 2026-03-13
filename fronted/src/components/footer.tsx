"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Monitor, Facebook, Twitter, Instagram, Youtube, Phone, Mail, MapPin, Headphones, ChevronDown } from "lucide-react"
import Image from "next/image"
import { useSiteSettings } from "@/context/site-settings-context"
import { getLogoForTheme, getSiteName, getSocialLinks, type SocialPlatform } from "@/utils/site-settings"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useState } from "react"

const SOCIAL_ICON_MAP: Record<SocialPlatform, { label: string; icon: typeof Facebook }> = {
  facebook: { label: "Facebook", icon: Facebook },
  instagram: { label: "Instagram", icon: Instagram },
  tiktok: { label: "TikTok", icon: Monitor },
  youtube: { label: "YouTube", icon: Youtube },
  x: { label: "X", icon: Twitter },
}

function FooterAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden border-b border-blue-800 last:border-b-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between py-4 text-lg font-bold cursor-pointer"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-blue-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-64 opacity-100 pb-4" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export default function Footer() {
  const { settings } = useSiteSettings()
  const { resolvedTheme } = useTheme()
  const [logoTheme, setLogoTheme] = useState<"light" | "dark">(() =>
    settings.theme.mode === "dark" ? "dark" : "light",
  )

  useEffect(() => {
    if (settings.theme.mode === "light" || settings.theme.mode === "dark") {
      setLogoTheme(settings.theme.mode === "dark" ? "dark" : "light")
      return
    }

    if (resolvedTheme) {
      setLogoTheme(resolvedTheme === "dark" ? "dark" : "light")
    }
  }, [resolvedTheme, settings.theme.mode])

  const siteName = getSiteName(settings)
  const logoSrc = useMemo(() => getLogoForTheme(settings, logoTheme), [settings, logoTheme])

  const socialLinks = useMemo(() => {
    return getSocialLinks(settings).map((entry) => {
      const iconEntry = SOCIAL_ICON_MAP[entry.platform]
      return {
        key: entry.platform,
        label: iconEntry.label,
        icon: iconEntry.icon,
        href: entry.url,
      }
    })
  }, [settings])

  const currentYear = new Date().getFullYear()

  const quickLinks = (
    <ul className="space-y-3 text-blue-200">
      <li><Link href="/store" className="hover:text-white transition-colors">Tienda</Link></li>
      <li><Link href="/cart" className="hover:text-white transition-colors">Carrito</Link></li>
      <li><Link href="/track-order" className="hover:text-white transition-colors">Rastrear pedido</Link></li>
      <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesion</Link></li>
    </ul>
  )

  const customerService = (
    <ul className="space-y-3 text-blue-200">
      <li><Link href="/track-order" className="hover:text-white transition-colors cursor-pointer">Revisa tu pedido</Link></li>
      <li><Link href="/libro-reclamaciones" className="hover:text-white transition-colors cursor-pointer">Libro de Reclamaciones</Link></li>
    </ul>
  )

  const contactInfo = (
    <div className="space-y-4 text-blue-200">
      <div className="flex items-center gap-3">
        <Phone className="h-5 w-5 flex-shrink-0" />
        <span>+51 949 426 294</span>
      </div>
      <div className="flex items-center gap-3">
        <Mail className="h-5 w-5 flex-shrink-0" />
        <span className="break-words">tecnologiatitacna@gmail.com</span>
      </div>
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <span>Av. Coronel Mendoza 1945 C.C. Mercadillo Bolognesi K-367 Primera Fila Tacna - Peru</span>
      </div>
      <div className="flex items-center gap-3">
        <Headphones className="h-5 w-5 flex-shrink-0" />
        <span>24/7 Soporte a Clientes</span>
      </div>
    </div>
  )

  return (
    <footer className="bg-blue-900 text-white py-10 md:py-16">
      <div className="container mx-auto px-4">
        {/* Mobile: brand + accordion sections */}
        <div className="md:hidden mb-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Image src={logoSrc} alt={siteName} width={64} height={64} className="h-16 w-16" />
              <span className="text-2xl font-bold">{siteName}</span>
            </div>
            <p className="text-blue-200 mb-4 max-w-md">
              {siteName} es tu socio de confianza para computadoras, laptops y accesorios tecnológicos de primera calidad.
              Productos de calidad, soporte experto y precios inmejorables.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4">
                {socialLinks.map(({ key, icon: Icon, href, label }) => {
                  const isExternal = href.startsWith("http")
                  return (
                    <Button
                      key={key}
                      size="icon"
                      variant="ghost"
                      className="text-blue-200 hover:text-white hover:bg-blue-800 cursor-pointer"
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
            )}
          </div>
          <div className="divide-y divide-blue-800 border-t border-blue-800">
            <FooterAccordion title="Acceso Rapido">{quickLinks}</FooterAccordion>
            <FooterAccordion title="Servicio al Cliente">{customerService}</FooterAccordion>
            <FooterAccordion title="Contactanos">{contactInfo}</FooterAccordion>
          </div>
        </div>

        {/* Desktop: all 4 columns aligned in one row */}
        <div className="hidden md:grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Image src={logoSrc} alt={siteName} width={64} height={64} className="h-16 w-16" />
              <span className="text-2xl font-bold">{siteName}</span>
            </div>
            <p className="text-blue-200 mb-6">
              {siteName} es tu socio de confianza para computadoras, laptops y accesorios tecnológicos de primera calidad.
              Productos de calidad, soporte experto y precios inmejorables.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4">
                {socialLinks.map(({ key, icon: Icon, href, label }) => {
                  const isExternal = href.startsWith("http")
                  return (
                    <Button
                      key={key}
                      size="icon"
                      variant="ghost"
                      className="text-blue-200 hover:text-white hover:bg-blue-800 cursor-pointer"
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
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6">Acceso Rapido</h3>
            {quickLinks}
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6">Servicio al Cliente</h3>
            {customerService}
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6">Contactanos</h3>
            {contactInfo}
          </div>
        </div>

        <div className="border-t border-blue-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-blue-200 mb-4 md:mb-0 text-sm text-center md:text-left">
            © {currentYear} {siteName}. Todos los derechos reservados. | Politicas de Privacidad | Terminos de Servicio
          </p>
          <div className="flex items-center gap-4 text-blue-200">
            <span className="text-sm">Pagos seguros a través de</span>
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
