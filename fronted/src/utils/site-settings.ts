import type { SiteSettings } from "@/context/site-settings-schema"

export const DEFAULT_SITE_NAME = "Tienda TI"
export const DEFAULT_LOGO_LIGHT = "/logo_ti.png"
export const DEFAULT_LOGO_DARK = "/ti_logo_final_blanco.png"

const DEFAULT_NAV_LINKS: { label: string; href: string }[] = [
  { label: "Inicio", href: "/" },
  { label: "FAQ", href: "/faq" },
  { label: "Contacto", href: "/contact" },
  { label: "Productos", href: "/store" },
]

export function getSiteName(settings: SiteSettings | null | undefined): string {
  const value = settings?.brand.siteName?.trim()
  return value && value.length > 0 ? value : DEFAULT_SITE_NAME
}

export function getLogoForTheme(
  settings: SiteSettings | null | undefined,
  theme: "light" | "dark",
): string {
  const url = settings?.brand.logoUrl?.trim()
  if (url) {
    return url
  }

  return theme === "dark" ? DEFAULT_LOGO_DARK : DEFAULT_LOGO_LIGHT
}

export function getNavbarLinks(
  settings: SiteSettings | null | undefined,
): { label: string; href: string }[] {
  const links = settings?.navbar.links?.filter((link) =>
    Boolean(link?.label?.trim() && link?.href?.trim()),
  )

  return links && links.length > 0 ? links : DEFAULT_NAV_LINKS
}

export function normalizeHref(href: string | null | undefined): string | null {
  const trimmed = href?.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }

  if (trimmed.startsWith("/")) {
    return trimmed
  }

  return `https://${trimmed}`
}
export type SocialPlatform = keyof SiteSettings["social"]

export interface SocialLinkEntry {
  platform: SocialPlatform
  url: string
  handle?: string
}

const SOCIAL_KEYS: SocialPlatform[] = ["facebook", "instagram", "tiktok", "youtube", "x"]

function extractXHandle(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes("twitter.com") && !parsed.hostname.includes("x.com")) {
      return undefined
    }

    const segments = parsed.pathname.split("/").filter(Boolean)
    if (segments.length === 0) {
      return undefined
    }

    const handle = segments[0]
    if (!handle) {
      return undefined
    }

    return handle.startsWith("@") ? handle : `@${handle}`
  } catch {
    return undefined
  }
}

export function getSocialLinks(settings: SiteSettings | null | undefined): SocialLinkEntry[] {
  if (!settings) {
    return []
  }

  return SOCIAL_KEYS.reduce<SocialLinkEntry[]>((acc, key) => {
    const value = normalizeHref(settings.social?.[key])
    if (!value) {
      return acc
    }

    const entry: SocialLinkEntry = {
      platform: key,
      url: value,
    }

    if (key === "x") {
      const handle = extractXHandle(value)
      if (handle) {
        entry.handle = handle
      }
    }

    acc.push(entry)
    return acc
  }, [])
}

export function getChipPresentation(settings: SiteSettings | null | undefined): {
  variant: "default" | "secondary" | "outline"
  className?: string
} {
  const chipStyle = settings?.components.chipStyle ?? "solid"

  if (chipStyle === "outline") {
    return { variant: "outline" }
  }

  return {
    variant: "secondary",
    className: "bg-primary/10 text-primary",
  }
}

export function getCardToneClass(settings: SiteSettings | null | undefined): string {
  const cardStyle = settings?.components.cardStyle ?? "shadow"

  if (cardStyle === "border") {
    return "border border-border shadow-none"
  }

  return "shadow-lg"
}

export function getTableDensityTokens(settings: SiteSettings | null | undefined): {
  cell: string
  head: string
  table: string
} {
  const density = settings?.components.tableDensity ?? "normal"

  if (density === "compact") {
    return {
      cell: "p-1 text-xs",
      head: "h-9 text-xs",
      table: "text-xs",
    }
  }

  return {
    cell: "p-3 text-sm",
    head: "h-11 text-sm",
    table: "text-sm",
  }
}