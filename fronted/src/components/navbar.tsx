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
  const closeTimer = useRef<NodeJS.Timeout | null>(null)
  const { logout, userName } = useAuth()
  const router = useRouter()
  const { items } = useCart()
  const { theme } = useTheme()
  const [logoSrc, setLogoSrc] = useState("/logo_ti.png")
  const [navColor, setNavColor] = useState<string>("")

  const resolveColor = (el: HTMLElement): string => {
    let current: HTMLElement | null = el
    while (current) {
      const color = window.getComputedStyle(current).backgroundColor
      if (
        color &&
        color !== "rgba(0, 0, 0, 0)" &&
        color !== "transparent"
      ) {
        return color
      }
      current = current.parentElement
    }
    return ""
  }

  useEffect(() => {
    setLogoSrc(theme === "dark" ? "/ti_logo_final_blanco.png" : "/logo_ti.png")
  }, [theme])

  const handleMouseEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
    }
    setOpen(true)
  }

  const handleMouseLeave = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
    }
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  const hasActiveOrder = items.length > 0

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const navLinks = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/faq", label: "FAQ", icon: HelpCircle },
    { href: "/contact", label: "Contacto", icon: Phone },
    { href: "/store", label: "Productos", icon: ShoppingBag },
    { href: "/favorites", label: "Favoritos", icon: Heart },
  ]

  useEffect(() => {
    if (!window.matchMedia("(min-width: 768px)").matches) return

    const sections = document.querySelectorAll<HTMLElement>("[data-navcolor]")

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const color = resolveColor(entry.target as HTMLElement)
            if (color) {
              setNavColor(color)
            } else {
              setNavColor("")
            }
          }
        })
      },
      { threshold: 0.5 },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!window.matchMedia("(min-width: 768px)").matches) return

    // Clear inline color first so Tailwind `bg-background` reflects the new theme immediately
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
    // Wait for the theme classes to apply before checking colors.
    // Use a double rAF to ensure the DOM has repainted with new CSS variables.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(updateColor)
      // store cancel of inner frame on outer's cleanup scope
      ;(updateColor as any)._raf2 = raf2
    })
    return () => {
      cancelAnimationFrame(raf1)
      if ((updateColor as any)._raf2) cancelAnimationFrame((updateColor as any)._raf2)
    }
  }, [theme])

  return (
    <>
      <TopBanner />
      <nav
        className="bg-background shadow-sm border-b md:sticky md:top-0 md:z-50 transition-colors duration-500 ease-in-out"
        style={{ backgroundColor: navColor || undefined }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/"
            onClick={() => router.refresh()}
            className="flex items-center gap-2 font-bold text-foreground group hover:text-sky-600 transition-colors"
          >
            <Image
              src={logoSrc}
              alt="TI"
              width={64}
              height={64}
              className="h-16 w-16 transition duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]"
              priority
            />
            <span className="transition-colors duration-300 group-hover:text-sky-600">Tienda TI</span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/"
              onClick={() => router.refresh()}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
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
            {userName ? (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Link
                    href="/users"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <UserIcon className="size-4" />
                    {userName}
                  </Link>
                </PopoverTrigger>
                <PopoverContent
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  className="w-48 space-y-2 text-center transition-opacity duration-300"
                >
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs">Orden activa: {hasActiveOrder ? 'Sí' : 'No'}</p>
                  <Button onClick={handleLogout} variant="outline" className="w-full">
                    Cerrar Sesión
                  </Button>
                </PopoverContent>
              </Popover>
            ) : (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Link
                    href="/login"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Iniciar Sesión
                  </Link>
                </PopoverTrigger>
                <PopoverContent
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  className="w-64 space-y-2 text-center transition-opacity duration-300"
                >
                  <p className="text-xs font-semibold">
                    Regístrate para acceder a beneficios y descuentos
                  </p>
                  <Link href="/login" className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Iniciar sesión
                    </Button>  
                  </Link>
                  <p className="text-xs font-semibold">
                    Eres Nuevo Cliente?
                    <Link href="/register" className="underline text-blue-600 font-bold">
                      Regístrate
                    </Link>
                  </p>
                </PopoverContent>
              </Popover>
            )}
            <Link
              href="/favorites"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
            </Link>
            <CartSheet />
            <ModeToggle />
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <CartSheet />
            <ModeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 bg-background/95 backdrop-blur-md"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Menú</SheetTitle>
                  <SheetDescription>Navegación principal</SheetDescription>
                </SheetHeader>
                <div className="flex h-full flex-col">
                  <nav className="flex-1 px-6 py-6 space-y-1">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={href === '/' ? () => router.refresh() : undefined}
                        className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:pl-4"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    ))}
                  </nav>
                  {userName ? (
                    <div className="border-t px-6 py-4 space-y-3">
                      <span className="text-sm font-medium">{userName}</span>
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full justify-start gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                      </Button>
                    </div>
                  ) : (
                    <div className="border-t px-6 py-4 space-y-2">
                      <Link
                        href="/login"
                        className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-sky-600"
                      >
                        <LogIn className="h-4 w-4" />
                        Iniciar Sesión
                      </Link>
                      <Link
                        href="/register"
                        className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-sky-600"
                      >
                        <UserPlus className="h-4 w-4" />
                        Registrarse
                      </Link>
                    </div>
                  )}
                  </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </>
  )
}
