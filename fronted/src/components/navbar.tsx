"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import {
  UserIcon,
  Heart,
  Menu,
  Home,
  HelpCircle,
  Phone,
  ShoppingBag,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react"
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

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const closeTimer = useRef<NodeJS.Timeout | null>(null)
  const { logout, userName, userId } = useAuth()
  const router = useRouter()
  const { items } = useCart()

  // 🔄 Usa resolvedTheme para tener el modo “real” aplicado (incluye system)
  const { resolvedTheme } = useTheme()

  const [logoSrc, setLogoSrc] = useState("/logo_ti.png")
  const [navColor, setNavColor] = useState<string>("")

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

  // 🖼️ Logo según tema real
  useEffect(() => {
    setLogoSrc(resolvedTheme === "dark" ? "/ti_logo_final_blanco.png" : "/logo_ti.png")
  }, [resolvedTheme])

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const handleMouseLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  const hasActiveOrder = items.length > 0

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    await logout()
    router.replace("/login")
    setLoggingOut(false)
  }

  const navLinks = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/faq", label: "FAQ", icon: HelpCircle },
    { href: "/contact", label: "Contacto", icon: Phone },
    { href: "/store", label: "Productos", icon: ShoppingBag },
    { href: "/favorites", label: "Favoritos", icon: Heart },
  ]

  // 👀 Observer de secciones (solo md+) — depende de resolvedTheme
  useEffect(() => {
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
  }, [resolvedTheme])

  // ⚡ Cambio inmediato al togglear tema (sin esperar scroll)
  useEffect(() => {
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
  }, [resolvedTheme])

  return (
    <>
      <TopBanner />
      <nav
        className="relative bg-background shadow-sm md:sticky md:top-0 md:z-50 transition-colors duration-500 ease-in-out"
        /* ✅ inline style solo si hay navColor; si no, que mande Tailwind */
        style={navColor ? { backgroundColor: navColor } : undefined}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-foreground group hover:text-sky-600 transition-colors"
          >
            <Image
              src={logoSrc}
              alt="TI"
              width={64}
              height={64}
              className="h-16 w-16 transition duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]"
            />
            <span className="transition-colors duration-300 group-hover:text-sky-600">Tienda TI</span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Inicio
            </Link>
            <Link href="/faq" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              FAQ
            </Link>
            <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Contacto
            </Link>
            <Link href="/store" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Productos
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
                      <Image src={logoSrc} alt="TI" width={28} height={28} />
                      <span>Tienda TI</span>
                    </Link>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {/* Primary links */}
                    <Link href="/" className="block px-3 py-2 rounded hover:bg-accent">Inicio</Link>
                    <Link href="/faq" className="block px-3 py-2 rounded hover:bg-accent">FAQ</Link>
                    <Link href="/contact" className="block px-3 py-2 rounded hover:bg-accent">Contacto</Link>
                    <Link href="/store" className="block px-3 py-2 rounded hover:bg-accent">Productos</Link>
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
