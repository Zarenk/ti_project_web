"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/context/cart-context"
import { ModeToggle } from "@/components/mode-toggle"
import CartSheet from "@/components/cart-sheet"
import TopBanner from "./top-banner"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<NodeJS.Timeout | null>(null)
  const { userName, refreshUser, logout } = useAuth()
  const router = useRouter()
  const { items } = useCart()

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      <TopBanner />
      <nav className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
            <Image src="/logo_ti.png" alt="TI" width={64} height={64} className="h-16 w-16" />
            <span>Tienda TI</span>       
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/store" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Productos
            </Link>
            {userName ? (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Link
                    href="/users"
                    onMouseEnter={() => {
                      if (closeTimer.current) {
                        clearTimeout(closeTimer.current)
                      }
                      setOpen(true)
                    }}
                    onMouseLeave={() => {
                      if (closeTimer.current) {
                        clearTimeout(closeTimer.current)
                      }
                      closeTimer.current = setTimeout(() => setOpen(false), 150)
                    }}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Bienvenido, {userName}
                  </Link>
                </PopoverTrigger>
                <PopoverContent
                  onMouseEnter={() => {
                    if (closeTimer.current) {
                      clearTimeout(closeTimer.current)
                    }
                    setOpen(true)
                  }}
                  onMouseLeave={() => {
                    if (closeTimer.current) {
                      clearTimeout(closeTimer.current)
                    }
                    closeTimer.current = setTimeout(() => setOpen(false), 150)
                  }}
                  className="w-48 space-y-2 text-center transition-opacity duration-300"
                >
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs">Orden activa: {items.length > 0 ? 'Sí' : 'No'}</p>
                  <Button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white">
                    Cerrar Sesión
                  </Button>
                </PopoverContent>
              </Popover>
            ) : (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Link
                    href="/login"
                    onMouseEnter={() => {
                      if (closeTimer.current) {
                        clearTimeout(closeTimer.current)
                      }
                      setOpen(true)
                    }}
                    onMouseLeave={() => {
                      if (closeTimer.current) {
                        clearTimeout(closeTimer.current)
                      }
                      closeTimer.current = setTimeout(() => setOpen(false), 150)
                    }}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Iniciar Sesión
                  </Link>
                </PopoverTrigger>
                <PopoverContent
                  onMouseEnter={() => {
                    if (closeTimer.current) {
                      clearTimeout(closeTimer.current)
                    }
                    setOpen(true)
                  }}
                  onMouseLeave={() => {
                    if (closeTimer.current) {
                      clearTimeout(closeTimer.current)
                    }
                    closeTimer.current = setTimeout(() => setOpen(false), 150)
                  }}
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
            <CartSheet />
            <ModeToggle />
          </div>
        </div>
      </nav>
    </>
  )
}