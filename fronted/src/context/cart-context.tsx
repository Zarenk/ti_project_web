"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { getUserDataFromToken } from "@/lib/auth"

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
  const [items, setItems] = useState<CartItem[]>([])
  const [cartKey, setCartKey] = useState("cart-guest")

    const getKey = () => {
      const data = getUserDataFromToken()
      return data ? `cart-${data.userId}` : "cart-guest"
    }

    const loadCart = (key: string) => {
      if (typeof window === "undefined") return
      try {
        const stored = localStorage.getItem(key)
        setItems(stored ? (JSON.parse(stored) as CartItem[]) : [])
      } catch {
        // ignore read errors
        setItems([])
      }
    }
  
  useEffect(() => {
    if (typeof window === "undefined") return
    const key = getKey()
    setCartKey(key)
    loadCart(key)
    const handleAuth = () => {
      const newKey = getKey()
      setCartKey(newKey)
      loadCart(newKey)
    }
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "token") handleAuth()
    }
    window.addEventListener("authchange", handleAuth)
    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener("authchange", handleAuth)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])  

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
      localStorage.setItem(cartKey, JSON.stringify(items))
    } catch {
      // ignore write errors
    }
  }, [items, cartKey])

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