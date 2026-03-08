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

export default function EleganceNavbar(_props: NavbarProps) {
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

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-lg transition-all duration-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo — left */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
          >
            <Image
              src={logoSrc}
              alt={siteName}
              width={40}
              height={40}
              priority
              className="h-10 w-10 transition-transform duration-500 group-hover:scale-105"
            />
            <span className="text-lg font-light tracking-[0.08em] text-foreground transition-colors duration-500 group-hover:text-primary">
              {siteName}
            </span>
          </Link>

          {/* Center links — desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link: { label: string; href: string }) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative py-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors duration-500 hover:text-foreground"
              >
                {link.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-out group-hover:scale-x-100" />
              </Link>
            ))}
            <Link
              href="/track-order"
              className="group relative py-1 text-xs font-medium uppercase tracking-[0.12em] text-primary/80 transition-colors duration-500 hover:text-primary"
            >
              Rastrea tu pedido
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform duration-500 ease-out group-hover:scale-x-100" />
            </Link>
          </div>

          {/* Right icons — desktop */}
          <div className="hidden md:flex items-center gap-3">
            {showSearch && (
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-muted-foreground transition-colors duration-300 hover:text-foreground cursor-pointer"
                aria-label="Buscar"
              >
                {searchOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>
            )}
            <Link
              href="/favorites"
              className="p-2 text-muted-foreground transition-colors duration-300 hover:text-foreground"
              aria-label="Favoritos"
            >
              <Heart className="h-4 w-4" />
            </Link>
            <CartSheet />
            <ModeToggle />

            {/* Auth */}
            {userId ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="p-2 text-muted-foreground transition-colors duration-300 hover:text-foreground cursor-pointer"
                    aria-label="Mi cuenta"
                  >
                    <UserIcon className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-44 p-2 rounded-xl border-border/50">
                  <div className="flex flex-col gap-0.5">
                    <span className="px-2 py-1 text-xs text-muted-foreground tracking-wider uppercase">
                      {userName || "Mi cuenta"}
                    </span>
                    <Link
                      href="/dashboard/account"
                      className="px-2 py-1.5 rounded-lg text-sm hover:bg-accent transition-colors duration-300 cursor-pointer"
                    >
                      Mi cuenta
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="px-2 py-1.5 rounded-lg text-sm hover:bg-accent text-left inline-flex items-center gap-2 transition-colors duration-300 cursor-pointer"
                    >
                      {loggingOut ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      {loggingOut ? "Cerrando…" : "Cerrar sesión"}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Ingresar</span>
              </Link>
            )}
          </div>

          {/* Mobile icons */}
          <div className="flex items-center gap-1.5 md:hidden">
            <CartSheet />
            <ModeToggle />
            {userId ? (
              <Link href="/dashboard/account" aria-label="Mi cuenta" className="p-2">
                <UserIcon className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/login" aria-label="Iniciar sesión" className="p-2">
                <LogIn className="h-4 w-4" />
              </Link>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="cursor-pointer">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0 bg-background/95 backdrop-blur-xl">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menú</SheetTitle>
                  <SheetDescription>Navegación principal</SheetDescription>
                </SheetHeader>
                <div className="flex h-full flex-col">
                  <div className="px-6 py-5 border-b border-border/30">
                    <Link href="/" className="flex items-center gap-2">
                      <Image src={logoSrc} alt={siteName} width={28} height={28} />
                      <span className="text-sm font-light tracking-[0.08em]">{siteName}</span>
                    </Link>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
                    {showSearch && (
                      <form onSubmit={handleSearchSubmit} className="mb-4">
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar productos…"
                          className="h-9 text-sm rounded-lg"
                        />
                      </form>
                    )}
                    {navLinks.map((link: { label: string; href: string }) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors duration-300"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <Link
                      href="/track-order"
                      className="block py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-primary/80 hover:text-primary transition-colors duration-300"
                    >
                      Rastrea tu pedido
                    </Link>
                    <Link
                      href="/favorites"
                      className="block py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      Favoritos
                    </Link>

                    <div className="pt-4 mt-4 border-t border-border/30 space-y-1">
                      {userId ? (
                        <>
                          <Link
                            href="/dashboard/account"
                            className="block py-2.5 text-xs uppercase tracking-[0.12em] hover:text-foreground text-muted-foreground transition-colors duration-300"
                          >
                            Mi cuenta
                          </Link>
                          <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="w-full text-left py-2.5 text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors duration-300 inline-flex items-center gap-2 cursor-pointer"
                          >
                            {loggingOut ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <LogOut className="h-3.5 w-3.5" />
                            )}
                            {loggingOut ? "Cerrando…" : "Cerrar sesión"}
                          </button>
                        </>
                      ) : (
                        <Link
                          href="/login"
                          className="py-2.5 text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors duration-300 inline-flex items-center gap-2"
                        >
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

      {/* Expandable search bar — desktop */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-500 ease-out border-t border-border/20",
          searchOpen ? "max-h-16 opacity-100" : "max-h-0 opacity-0 border-t-0",
        )}
      >
        <div className="mx-auto max-w-xl px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos…"
              className="h-10 pl-10 text-sm rounded-full border-border/40 bg-muted/30 focus:bg-background transition-colors duration-300"
              autoFocus={searchOpen}
            />
          </form>
        </div>
      </div>
    </nav>
  )
}
