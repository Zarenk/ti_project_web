"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"

export type CartItem = {
  id: number
  name: string
  price: number
  image?: string
  quantity: number
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem("cart")
      return stored ? (JSON.parse(stored) as CartItem[]) : []
    } catch {
      return []
    }
  })
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  )

  const addItem = (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id)
      if (existing) {
        return prev.map((p) =>
          p.id === item.id
            ? { ...p, quantity: p.quantity + (item.quantity ?? 1) }
            : p,
        )
      }
      return [...prev, { ...item, quantity: item.quantity ?? 1 }]
    })
  }

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((p) => p.id !== id))
  }

  const updateQuantity = (id: number, quantity: number) => {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, quantity) } : p)),
    )
  }

  const clear = () => setItems([])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem("cart", JSON.stringify(items))
    } catch {
      // ignore write errors
    }
  }, [items])

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clear }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}