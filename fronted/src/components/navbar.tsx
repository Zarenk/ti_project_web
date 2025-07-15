"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import CartSheet from "@/components/cart-sheet"
import TopBanner from "./top-banner"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const [open, setOpen] = useState(false)

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
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Link
                  href="/login"
                  onMouseEnter={() => setOpen(true)}
                  onMouseLeave={() => setOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Iniciar Sesión
                </Link>
              </PopoverTrigger>
              <PopoverContent
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                className="w-64 space-y-2 text-center"
              >
                <p className="text-sm">
                  Regístrate para acceder a beneficios y descuentos
                </p>
                <Link href="/login" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Iniciar sesión
                  </Button>
                </Link>
                <Link href="/register" className="text-sm underline block">
                  Eres Nuevo Cliente? Regístrate
                </Link>
              </PopoverContent>
            </Popover>
            <CartSheet />
            <ModeToggle />
          </div>
        </div>
      </nav>
    </>
  )
}