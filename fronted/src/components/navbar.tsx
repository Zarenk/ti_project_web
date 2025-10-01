"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"
import {
  Home,
  HelpCircle,
  Phone,
  ShoppingBag,
  UserPlus,
} from "lucide-react"
import { FormEvent, useState, useEffect, useMemo } from "react"
import { UserIcon, Heart, Menu, LogOut, LogIn } from "lucide-react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCart } from "@/context/cart-context"
import { ModeToggle } from "@/components/mode-toggle"
import CartSheet from "@/components/cart-sheet"
import TopBanner from "./top-banner"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import { useAuth } from "@/context/auth-context"
import { Input } from "@/components/ui/input"
import { useSiteSettings } from "@/context/site-settings-context"
import { cn } from "@/lib/utils"
import {
  getLogoForTheme,
  getNavbarLinks,
  getSiteName,
} from "@/utils/site-settings"


export default function Navbar() {
  const { settings } = useSiteSettings()
  const [loggingOut, setLoggingOut] = useState(false)
  const { logout, userName, userId } = useAuth()
  const router = useRouter()
  const { items } = useCart()

  // 🔄 Usa resolvedTheme para tener el modo “real” aplicado (incluye system)
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

  const logoSrc = useMemo(() => getLogoForTheme(settings, logoTheme), [settings, logoTheme])

  const [navColor, setNavColor] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  const siteName = useMemo(() => getSiteName(settings), [settings])
  const navLinks = useMemo(() => getNavbarLinks(settings), [settings])
  const navbarStyle = settings.navbar.style
  const navbarPosition = settings.navbar.position
  const showSearch = settings.navbar.showSearch

  const navbarClassName = useMemo(
    () =>
      cn(
        "relative transition-colors duration-500 ease-in-out",
        navbarPosition === "fixed"
          ? "md:sticky md:top-0 md:z-50"
          : "md:relative md:top-auto md:z-40",
        {
          light: "bg-background text-foreground shadow-sm",
          dark: "bg-slate-900 text-slate-50 shadow-lg",
          transparent: "bg-transparent text-white",
        }[navbarStyle],
      ),
    [navbarStyle, navbarPosition],
  )

  const desktopLinkClass = useMemo(() => {
    if (navbarStyle === "dark" || navbarStyle === "transparent") {
      return "text-sm font-medium text-slate-200 hover:text-white"
    }

    return "text-sm font-medium text-muted-foreground hover:text-foreground"
  }, [navbarStyle])

  const searchInputClass = useMemo(() => {
    if (navbarStyle === "dark") {
      return "bg-slate-800 text-slate-100 placeholder:text-slate-400 border-slate-700"
    }

    if (navbarStyle === "transparent") {
      return "bg-white/10 text-white placeholder:text-white/70 border-white/30 focus:bg-white/20"
    }

    return ""
  }, [navbarStyle])

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (query.length === 0) {
      router.push("/store")
      return
    }
    const url = `/store?search=${encodeURIComponent(query)}`
    router.push(url)
  }

  // --- Helpers to constrain nav color to the light theme palette (whites/sky/blues) ---
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }
    return { h: h * 360, s, l }
  }
  const parseCssColorToHsl = (color: string): { h: number; s: number; l: number } | null => {
    if (!color) return null
    const c = color.trim().toLowerCase()
    // rgb/rgba
    let m = c.match(/^rgba?\(([^)]+)\)$/)
    if (m) {
      const parts = m[1].split(',').map((p) => p.trim())
      if (parts.length >= 3) {
        const r = parseFloat(parts[0])
        const g = parseFloat(parts[1])
        const b = parseFloat(parts[2])
        if ([r, g, b].every((v) => !Number.isNaN(v))) return rgbToHsl(r, g, b)
      }
      return null
    }
    // hex #rrggbb or #rgb
    m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
    if (m) {
      const hex = m[1]
      let r: number, g: number, b: number
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16)
        g = parseInt(hex[1] + hex[1], 16)
        b = parseInt(hex[2] + hex[2], 16)
      } else {
        r = parseInt(hex.slice(0, 2), 16)
        g = parseInt(hex.slice(2, 4), 16)
        b = parseInt(hex.slice(4, 6), 16)
      }
      return rgbToHsl(r, g, b)
    }
    return null
  }
  const sanitizeNavColorLight = (color: string | null | undefined): string => {
    if (!color) return ""
    if (color === "transparent" || color === "rgba(0, 0, 0, 0)") return ""
    const hsl = parseCssColorToHsl(color)
    if (!hsl) return ""
    const { h, s, l } = hsl
    if (l >= 0.92 && s <= 0.15) return "rgba(255,255,255,0.95)"
    const hueOk = h >= 185 && h <= 250
    const satOk = s >= 0.25
    const lightOk = l >= 0.25 && l <= 0.86
    if (hueOk && satOk && lightOk) return color
    return "rgba(255,255,255,0.95)"
  }

  // 🧠 Usa resolvedTheme aquí dentro
  const resolveColor = (el: HTMLElement): string => {
    const explicitLight = el.getAttribute("data-navcolor") || undefined
    const explicitDark  = el.getAttribute("data-navcolor-dark") || undefined

    if (resolvedTheme === "dark") {
      if (explicitDark) return explicitDark
    } else {
      if (explicitLight) return sanitizeNavColorLight(explicitLight)
    }

    let current: HTMLElement | null = el
    while (current) {
      const color = window.getComputedStyle(current).backgroundColor
      if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
        return resolvedTheme === "light" ? sanitizeNavColorLight(color) : color
      }
      current = current.parentElement
    }
    return ""
  }

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    await logout()
    router.replace("/login")
    setLoggingOut(false)
  }

  // 👀 Observer de secciones (solo md+) — depende de resolvedTheme
  useEffect(() => {
    if (navbarStyle !== "light") {
      setNavColor("")
      return
    }
    if (!window.matchMedia("(min-width: 768px)").matches) return

    const sections = document.querySelectorAll<HTMLElement>("[data-navcolor]")

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const color = resolveColor(entry.target as HTMLElement)
            setNavColor(color || "")
          }
        })
      },
      { threshold: 0.5 },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [resolvedTheme, navbarStyle])

  // ⚡ Cambio inmediato al togglear tema (sin esperar scroll)
  useEffect(() => {
    if (navbarStyle !== "light") {
      setNavColor("")
      return
    }
    // 1) Limpia inline style para que bg-background responda al tema al instante
    setNavColor("")

    const sections = document.querySelectorAll<HTMLElement>("[data-navcolor]")
    const midpoint = window.innerHeight / 2

    const updateColor = () => {
      for (const section of Array.from(sections)) {
        const rect = section.getBoundingClientRect()
        if (rect.top <= midpoint && rect.bottom >= midpoint) {
          const color = resolveColor(section)
          setNavColor(color || "")
          return
        }
      }
      setNavColor("")
    }

    const run = () => requestAnimationFrame(() => requestAnimationFrame(updateColor))
    const wantedDark = resolvedTheme === "dark"

    // Si ya coincide la clase <html> con el tema resuelto, ejecuta ya
    const htmlIsDark = document.documentElement.classList.contains("dark")
    if (htmlIsDark === wantedDark) {
      run()
    }

    // Observa cambios de clase para evitar carreras
    const mo = new MutationObserver(() => {
      const nowDark = document.documentElement.classList.contains("dark")
      if (nowDark === wantedDark) {
        run()
      }
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    return () => mo.disconnect()
  }, [resolvedTheme, navbarStyle])

  return (
    <>
      <TopBanner />
      <nav
        className={navbarClassName}
        /* ✅ inline style solo si hay navColor; si no, que mande Tailwind */
        style={navbarStyle === "light" && navColor ? { backgroundColor: navColor } : undefined}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-foreground group hover:text-sky-600 transition-colors"
          >
            <Image
              src={logoSrc}
              alt={siteName}
              width={64}
              height={64}
              priority
              className="h-16 w-16 transition duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]"
            />
            <span className="transition-colors duration-300 group-hover:text-sky-600">{siteName}</span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            {showSearch && (
              <form onSubmit={handleSearchSubmit} className="relative">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar productos"
                  className={cn("h-9 w-48 lg:w-56", searchInputClass)}
                />
              </form>
            )}
            {navLinks.map((link:any) => (
              <Link key={link.href} href={link.href} className={desktopLinkClass}>
                {link.label}
              </Link>
            ))}
            <Link
              href="/track-order"
              className="group relative text-sm font-semibold text-sky-600 transition-colors duration-300 dark:text-sky-300"
            >
              <span className="relative inline-block bg-gradient-to-r from-sky-600 via-sky-400 to-sky-600 bg-[length:200%_100%] bg-[position:0%_0] bg-clip-text text-transparent transition-[background-position] duration-500 ease-out group-hover:bg-[position:100%_0] group-focus-visible:bg-[position:100%_0] dark:from-sky-400 dark:via-white/70 dark:to-sky-400">
                Rastrea tu pedido
              </span>
            </Link>
            {/* Usuario */}
            {/* ... (todo lo tuyo igual) ... */}
            <Link
              href="/favorites"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
            </Link>
            <CartSheet />
            <ModeToggle />
            {/* Auth area (desktop) */}
            {userId ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    aria-label="Usuario"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span className="hidden lg:inline">{userName || 'Mi cuenta'}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2">
                  <div className="flex flex-col gap-1">
                    <Link href="/dashboard/account" className="px-2 py-1.5 rounded hover:bg-accent text-sm">
                      Mi cuenta
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="px-2 py-1.5 rounded hover:bg-accent text-left text-sm inline-flex items-center gap-2"
                    >
                      {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      {loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <LogIn className="h-5 w-5" />
                <span className="hidden lg:inline">Iniciar sesión</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <CartSheet />
            <ModeToggle />
            {/* Quick login/account (mobile header) */}
            {userId ? (
              <Link href="/dashboard/account" aria-label="Mi cuenta">
                <UserIcon className="h-5 w-5" />
              </Link>
            ) : (
              <Link href="/login" aria-label="Iniciar sesión">
                <LogIn className="h-5 w-5" />
              </Link>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-background/95 backdrop-blur-md">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menú</SheetTitle>
                  <SheetDescription>Navegación principal</SheetDescription>
                </SheetHeader>
                <div className="flex h-full flex-col">
                  <div className="px-4 py-3 border-b">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                      <Image src={logoSrc} alt={siteName} width={28} height={28} />
                      <span>{siteName}</span>
                    </Link>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {showSearch && (
                      <form onSubmit={handleSearchSubmit} className="mb-3">
                        <Input
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Buscar productos"
                          className={cn("h-10", searchInputClass)}
                        />
                      </form>
                    )}
                    {/* Primary links */}
                    {navLinks.map((link:any) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-3 py-2 rounded hover:bg-accent"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <Link
                      href="/track-order"
                      className="group relative block px-3 py-2 rounded hover:bg-accent text-sky-600 font-semibold transition-colors duration-300 dark:text-sky-300"
                    >
                      <span className="relative inline-block bg-gradient-to-r from-sky-600 via-sky-400 to-sky-600 bg-[length:200%_100%] bg-[position:0%_0] bg-clip-text text-transparent transition-[background-position] duration-500 ease-out group-hover:bg-[position:100%_0] group-focus-visible:bg-[position:100%_0] dark:from-sky-400 dark:via-white/70 dark:to-sky-400">
                        Rastrea tu pedido
                      </span>
                    </Link>
                    <Link href="/favorites" className="block px-3 py-2 rounded hover:bg-accent">Favoritos</Link>

                    {/* Auth actions */}
                    {userId ? (
                      <>
                        <Link href="/dashboard/account" className="block px-3 py-2 rounded hover:bg-accent">Mi cuenta</Link>
                        <button
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="w-full text-left px-3 py-2 rounded hover:bg-accent inline-flex items-center gap-2"
                        >
                          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                          {loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
                        </button>
                      </>
                    ) : (
                      <Link href="/login" className="block px-3 py-2 rounded hover:bg-accent inline-flex items-center gap-2">
                        <LogIn className="h-4 w-4" /> Iniciar sesión
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {/* Línea inferior con degradado azul para acento visual */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(to_right,#1e3a8a,#2563eb,#38bdf8,#7dd3fc)]"
          aria-hidden
        />
      </nav>
    </>
  )
}
