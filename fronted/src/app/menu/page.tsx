"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BACKEND_URL } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import type {
  MenuCategory, MenuBranding, MenuAppearance, MenuHours,
  MenuContact, MenuSocialLinks, MenuResponse, MenuStyle, MenuStyleProps,
} from "./menu-types"
import { buildPalette } from "./menu-helpers"
import { StyleElegante } from "./styles/style-elegante"
import { StyleLuxury } from "./styles/style-luxury"
import { StyleModerno } from "./styles/style-moderno"
import { StyleTropical } from "./styles/style-tropical"

const DEFAULT_APPEARANCE: MenuAppearance = {
  theme: "dark",
  primaryColor: "#f59e0b",
  backgroundColor: "#1a1a1a",
  textColor: "#ffffff",
  menuStyle: "elegante",
}

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [branding, setBranding] = useState<MenuBranding | null>(null)
  const [appearance, setAppearance] = useState<MenuAppearance>(DEFAULT_APPEARANCE)
  const [hours, setHours] = useState<MenuHours | null>(null)
  const [contact, setContact] = useState<MenuContact | null>(null)
  const [socialLinks, setSocialLinks] = useState<MenuSocialLinks | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const urlParams = useMemo(() => {
    if (typeof window === "undefined") return { slug: null, orgId: "1", companyId: "1" }
    const params = new URLSearchParams(window.location.search)
    const slug = params.get("slug")
    const orgId = params.get("org") ?? params.get("tenant") ?? "1"
    const companyId = params.get("company") ?? orgId
    return { slug, orgId, companyId }
  }, [])

  const loadMenu = useCallback(async () => {
    setLoading(true)
    try {
      let res: Response
      if (urlParams.slug) {
        res = await fetch(
          `${BACKEND_URL}/api/public/menu/by-slug/${encodeURIComponent(urlParams.slug)}`,
          { cache: "no-store" },
        )
      } else {
        res = await fetch(`${BACKEND_URL}/api/public/menu`, {
          cache: "no-store",
          headers: {
            "x-org-id": urlParams.orgId,
            "x-company-id": urlParams.companyId,
          },
        })
      }
      if (!res.ok) throw new Error("No se pudo cargar el menu")
      const data: MenuResponse = await res.json()
      setCategories(data.categories)
      if (data.branding) setBranding(data.branding)
      if (data.appearance) setAppearance(data.appearance)
      if (data.hours) setHours(data.hours)
      if (data.contact) setContact(data.contact)
      if (data.socialLinks) setSocialLinks(data.socialLinks)
      if (data.categories.length > 0 && !activeCategory) {
        setActiveCategory(data.categories[0].categoryName)
      }
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [urlParams, activeCategory])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [categories, search])

  const featuredItems = useMemo(() => {
    return categories.flatMap((cat) => cat.items.filter((i) => i.featured))
  }, [categories])

  const palette = useMemo(() => buildPalette(appearance), [appearance])

  const restaurantName = branding?.restaurantName || "Nuestra Carta"
  const description = branding?.description || "Descubre nuestros platos preparados con los mejores ingredientes"
  const logoUrl = branding?.logoUrl ? resolveImageUrl(branding.logoUrl) : null
  const bannerUrl = branding?.bannerUrl ? resolveImageUrl(branding.bannerUrl) : null
  const showSearch = branding?.showSearch ?? true

  // Loading skeleton
  if (loading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3"
        style={{ backgroundColor: palette.bgColor, color: palette.textColor }}
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-full animate-bounce"
              style={{
                backgroundColor: palette.accentColor,
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
        <p className="text-sm" style={{ color: palette.mutedText }}>Cargando carta...</p>
      </div>
    )
  }

  const styleProps: MenuStyleProps = {
    categories,
    filteredMenu,
    featuredItems,
    branding,
    appearance,
    hours,
    contact,
    socialLinks,
    palette,
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    restaurantName,
    description,
    logoUrl,
    bannerUrl,
    showSearch,
  }

  const menuStyle: MenuStyle = appearance.menuStyle || "elegante"

  switch (menuStyle) {
    case "luxury":
      return <StyleLuxury {...styleProps} />
    case "moderno":
      return <StyleModerno {...styleProps} />
    case "tropical":
      return <StyleTropical {...styleProps} />
    case "elegante":
    default:
      return <StyleElegante {...styleProps} />
  }
}
