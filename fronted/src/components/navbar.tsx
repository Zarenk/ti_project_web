"use client"

import Image from "next/image"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import CartSheet from "@/components/cart-sheet"
import TopBanner from "./top-banner"

export default function Navbar() {
  return (
    <>
      <TopBanner />
      <nav className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
            <Image src="/logo_ti.png" alt="TI" width={32} height={32} className="h-8 w-8" />
            <span>Tienda TI</span>       
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/store" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Productos
            </Link>
            <CartSheet />
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Iniciar sesión
            </Link>
            <ModeToggle />
          </div>
        </div>
      </nav>
    </>
  )
}