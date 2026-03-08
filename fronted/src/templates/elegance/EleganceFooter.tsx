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

export default function EleganceFooter(_props: FooterProps) {
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

  const footerLinks = [
    { label: "Tienda", href: "/store" },
    { label: "FAQ", href: "/faq" },
    { label: "Contacto", href: "/contact" },
    { label: "Rastrear pedido", href: "/track-order" },
  ]

  return (
    <footer className="border-t border-border/30 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main row */}
        <div className="flex flex-col items-center gap-8 py-12 md:flex-row md:justify-between md:gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src={logoSrc}
              alt={siteName}
              width={32}
              height={32}
              className="h-8 w-8 transition-transform duration-500 group-hover:scale-105"
            />
            <span className="text-sm font-light tracking-[0.08em] text-foreground">
              {siteName}
            </span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors duration-500 hover:text-foreground"
              >
                {link.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-out group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          {/* Social icons */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              {socialLinks.map(({ key, icon: Icon, href, label }) => {
                const isExternal = href.startsWith("http")
                return (
                  <Link
                    key={key}
                    href={href}
                    aria-label={label}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noreferrer" : undefined}
                    className="p-2 text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/20 py-6 text-center">
          <p className="text-xs tracking-wider text-muted-foreground/60">
            &copy; {currentYear} {siteName}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
