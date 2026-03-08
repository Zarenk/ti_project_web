"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useState, useEffect, useMemo } from "react"
import { Search, Heart, Menu, LogOut, LogIn, UserIcon, X } from "lucide-react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCart } from "@/context/cart-context"
import { ModeToggle } from "@/components/mode-toggle"
import CartSheet from "@/components/cart-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
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
import type { NavbarProps } from "../types"

export default function BoldNavbar(_props: NavbarProps) {
  const { settings } = useSiteSettings()
  const [loggingOut, setLoggingOut] = useState(false)
  const { logoutAndRedirect, userName, userId } = useAuth()
  const router = useRouter()
  const { items } = useCart()
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
  const siteName = useMemo(() => getSiteName(settings), [settings])
  const navLinks = useMemo(() => getNavbarLinks(settings), [settings])
  const showSearch = settings.navbar.showSearch

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (query.length === 0) {
      router.push("/store")
      return
    }
    router.push(`/store?search=${encodeURIComponent(query)}`)
    setSearchOpen(false)
  }

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    await logoutAndRedirect()
    setLoggingOut(false)
  }

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Image
                src={logoSrc}
                alt={siteName}
                width={40}
                height={40}
                priority
                className="h-10 w-10 transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(var(--primary-rgb,99,102,241),0.5)]"
              />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent transition-all duration-300 group-hover:from-primary group-hover:to-primary/70">
              {siteName}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link: { label: string; href: string }) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative text-sm font-medium text-white/60 transition-colors duration-200 hover:text-white"
              >
                {link.label}
                <span className="absolute inset-x-0 -bottom-1 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary to-primary/50 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            ))}
            <Link
              href="/track-order"
              className="text-sm font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent transition-opacity duration-200 hover:opacity-80"
            >
              Rastrea tu pedido
            </Link>
          </div>

          {/* Desktop right icons */}
          <div className="hidden md:flex items-center gap-2">
            {showSearch && (
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-white/50 transition-colors duration-200 hover:text-white cursor-pointer"
                aria-label="Buscar"
              >
                {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </button>
            )}
            <Link href="/favorites" className="p-2 text-white/50 transition-colors duration-200 hover:text-white">
              <Heart className="h-4 w-4" />
            </Link>
            <CartSheet />
            <ModeToggle />

            {userId ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-2 text-white/50 transition-colors duration-200 hover:text-white cursor-pointer" aria-label="Mi cuenta">
                    <UserIcon className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-44 p-2 bg-slate-900 border-white/10 rounded-xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="px-2 py-1 text-xs text-white/40">{userName || "Mi cuenta"}</span>
                    <Link href="/dashboard/account" className="px-2 py-1.5 rounded-lg text-sm text-white/80 hover:bg-white/5 transition-colors cursor-pointer">
                      Mi cuenta
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="px-2 py-1.5 rounded-lg text-sm text-white/80 hover:bg-white/5 text-left inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                      {loggingOut ? "Cerrando…" : "Cerrar sesión"}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-purple-500 text-xs font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.4)] hover:scale-105"
              >
                <LogIn className="h-3.5 w-3.5" />
                Ingresar
              </Link>
            )}
          </div>

          {/* Mobile icons */}
          <div className="flex items-center gap-1.5 md:hidden">
            <CartSheet />
            <ModeToggle />
            {userId ? (
              <Link href="/dashboard/account" aria-label="Mi cuenta" className="p-2 text-white/50">
                <UserIcon className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/login" aria-label="Iniciar sesión" className="p-2 text-white/50">
                <LogIn className="h-4 w-4" />
              </Link>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/5 cursor-pointer">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0 bg-slate-950/95 backdrop-blur-xl border-white/5 text-white">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menú</SheetTitle>
                  <SheetDescription>Navegación principal</SheetDescription>
                </SheetHeader>
                <div className="flex h-full flex-col">
                  <div className="px-6 py-5 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-2">
                      <Image src={logoSrc} alt={siteName} width={28} height={28} />
                      <span className="text-sm font-bold">{siteName}</span>
                    </Link>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
                    {showSearch && (
                      <form onSubmit={handleSearchSubmit} className="mb-4">
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar productos…"
                          className="h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        />
                      </form>
                    )}
                    {navLinks.map((link: { label: string; href: string }) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block py-2.5 text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <Link href="/track-order" className="block py-2.5 text-sm font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                      Rastrea tu pedido
                    </Link>
                    <Link href="/favorites" className="block py-2.5 text-sm text-white/60 hover:text-white transition-colors duration-200">
                      Favoritos
                    </Link>

                    <div className="pt-4 mt-4 border-t border-white/5 space-y-1">
                      {userId ? (
                        <>
                          <Link href="/dashboard/account" className="block py-2.5 text-sm text-white/60 hover:text-white">Mi cuenta</Link>
                          <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="w-full text-left py-2.5 text-sm text-white/60 hover:text-white inline-flex items-center gap-2 cursor-pointer"
                          >
                            {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                            {loggingOut ? "Cerrando…" : "Cerrar sesión"}
                          </button>
                        </>
                      ) : (
                        <Link href="/login" className="py-2.5 text-sm text-white/60 hover:text-white inline-flex items-center gap-2">
                          <LogIn className="h-3.5 w-3.5" />
                          Iniciar sesión
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Expandable search bar */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          searchOpen ? "max-h-16 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="mx-auto max-w-xl px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos…"
              className="h-10 pl-10 text-sm rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 transition-colors duration-200"
              autoFocus={searchOpen}
            />
          </form>
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </nav>
  )
}
