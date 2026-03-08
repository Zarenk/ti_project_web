"use client"

import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Instagram, Youtube, Monitor } from "lucide-react"
import { useSiteSettings } from "@/context/site-settings-context"
import { getLogoForTheme, getSiteName, getSocialLinks, type SocialPlatform } from "@/utils/site-settings"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useState } from "react"
import type { FooterProps } from "../types"

const SOCIAL_ICON_MAP: Record<SocialPlatform, { label: string; icon: typeof Facebook }> = {
  facebook: { label: "Facebook", icon: Facebook },
  instagram: { label: "Instagram", icon: Instagram },
  tiktok: { label: "TikTok", icon: Monitor },
  youtube: { label: "YouTube", icon: Youtube },
  x: { label: "X", icon: Twitter },
}

export default function BoldFooter(_props: FooterProps) {
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
  const currentYear = new Date().getFullYear()

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

  const linkSections = [
    {
      title: "Tienda",
      links: [
        { label: "Productos", href: "/store" },
        { label: "Carrito", href: "/cart" },
        { label: "Favoritos", href: "/favorites" },
      ],
    },
    {
      title: "Soporte",
      links: [
        { label: "FAQ", href: "/faq" },
        { label: "Contacto", href: "/contact" },
        { label: "Rastrear pedido", href: "/track-order" },
      ],
    },
  ]

  return (
    <footer className="bg-slate-950 text-white">
      {/* Top gradient border */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
              <Image
                src={logoSrc}
                alt={siteName}
                width={36}
                height={36}
                className="h-9 w-9 transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(var(--primary-rgb,99,102,241),0.5)]"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                {siteName}
              </span>
            </Link>
            <p className="text-sm text-white/40 max-w-sm leading-relaxed mt-3">
              Tu destino para tecnología de vanguardia. Productos premium, soporte experto, precios competitivos.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2 mt-6">
                {socialLinks.map(({ key, icon: Icon, href, label }) => {
                  const isExternal = href.startsWith("http")
                  return (
                    <Link
                      key={key}
                      href={href}
                      aria-label={label}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noreferrer" : undefined}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white hover:shadow-[0_0_12px_rgba(var(--primary-rgb,99,102,241),0.2)]"
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Link sections */}
          {linkSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white/80 mb-4">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/40 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">
            &copy; {currentYear} {siteName}. Todos los derechos reservados.
          </p>
          <div className="flex gap-3">
            {["VISA", "MC", "AMEX"].map((brand) => (
              <div key={brand} className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] font-bold text-white/30">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
