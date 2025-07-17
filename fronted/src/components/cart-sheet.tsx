"use client"

import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, Trash2 } from "lucide-react"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

import { formatCurrency } from "@/lib/utils"
import { useCart } from "@/context/cart-context"
import { useEffect, useState } from "react"

export default function CartSheet() {
  const { items, removeItem, clear } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  )

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" className="relative">
          <ShoppingCart className="w-5 h-5" />
          <span className="ml-2">Carrito</span>
          {mounted && items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
              {items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Carrito de Compras</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {!mounted || items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-4 border rounded-lg p-2"
                >
                  <Link
                    href={`/store/${item.id}`}
                    className="flex items-center gap-4 flex-1"
                  >
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="rounded-md object-cover w-14 h-14"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium leading-none">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.price, "PEN")} x {item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-blue-600">
                        {formatCurrency(item.price * item.quantity, "PEN")}
                      </p>
                    </div>
                  </Link>
                  <Button
                    onClick={() => removeItem(item.id)}
                    variant="ghost"
                    size="icon"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {mounted && items.length > 0 && (
          <div className="px-4 py-2 border-t">
            <div className="flex justify-between font-medium">
              <span>Subtotal</span>
              <span className="text-blue-600">{formatCurrency(subtotal, "PEN")}</span>
            </div>
          </div>
        )}
        <SheetFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={clear}
            disabled={!mounted || items.length === 0}
          >
            Limpiar carrito de compras
          </Button>
          <Button className="w-full" disabled={!mounted || items.length === 0} asChild>
            <Link href="/cart">Pagar</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}