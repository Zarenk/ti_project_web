"use client"

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react"
import { getAuthToken } from "@/utils/auth-token"
import { isTokenValid } from "@/lib/auth"
import { jwtDecode } from "jwt-decode"

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
  const [isHydrated, setIsHydrated] = useState(false)
  const prevKeyRef = useRef<string>("cart-guest")
  const hasMergedRef = useRef<boolean>(false)

  const getKey = async () => {
    const token = await getAuthToken()
    if (!token) return "cart-guest"
    try {
      const decoded: { userId?: number } = jwtDecode(token)
      const valid = await isTokenValid()
      if (!valid || !decoded.userId) return "cart-guest"
      return `cart-${decoded.userId}`
    } catch {
      return "cart-guest"
    }
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
    setIsHydrated(false)
    getKey().then((key) => {
      setCartKey(key)
      try {
        // Si ya está autenticado al montar, fusionar carrito guest -> usuario una sola vez
        const guestKey = "cart-guest"
        const guestRaw = localStorage.getItem(guestKey)
        const guestItems: CartItem[] = guestRaw ? JSON.parse(guestRaw) : []
        if (key !== guestKey && guestItems.length > 0 && !hasMergedRef.current) {
          const targetRaw = localStorage.getItem(key)
          const targetItems: CartItem[] = targetRaw ? JSON.parse(targetRaw) : []
          const mergedMap = new Map<number, CartItem>()
          ;[...targetItems, ...guestItems].forEach((it) => {
            const existing = mergedMap.get(it.id)
            if (existing) {
              mergedMap.set(it.id, { ...existing, quantity: existing.quantity + it.quantity })
            } else {
              mergedMap.set(it.id, { ...it })
            }
          })
          const merged = Array.from(mergedMap.values())
          setItems(merged)
          localStorage.setItem(key, JSON.stringify(merged))
          localStorage.removeItem(guestKey)
          hasMergedRef.current = true
        } else {
          loadCart(key)
        }
      } catch {
        loadCart(key)
      }
      prevKeyRef.current = key
      setIsHydrated(true)
    })
    const handleAuth = () => {
      setIsHydrated(false)
      getKey().then((newKey) => {
        try {
          const prevKey = prevKeyRef.current
          // Si pasamos de guest -> user, fusionar
          if (prevKey === "cart-guest" && newKey !== "cart-guest") {
            const guestRaw = localStorage.getItem("cart-guest")
            const guestItems: CartItem[] = guestRaw ? JSON.parse(guestRaw) : []
            const userRaw = localStorage.getItem(newKey)
            const userItems: CartItem[] = userRaw ? JSON.parse(userRaw) : []
            const mergedMap = new Map<number, CartItem>()
            ;[...userItems, ...guestItems].forEach((it) => {
              const existing = mergedMap.get(it.id)
              if (existing) {
                mergedMap.set(it.id, { ...existing, quantity: existing.quantity + it.quantity })
              } else {
                mergedMap.set(it.id, { ...it })
              }
            })
            const merged = Array.from(mergedMap.values())
            setCartKey(newKey)
            setItems(merged)
            localStorage.setItem(newKey, JSON.stringify(merged))
            localStorage.removeItem("cart-guest")
          } else {
            setCartKey(newKey)
            loadCart(newKey)
          }
          prevKeyRef.current = newKey
        } catch {
          setCartKey(newKey)
          loadCart(newKey)
          prevKeyRef.current = newKey
        }
        setIsHydrated(true)
      })
    }
    window.addEventListener("authchange", handleAuth)
    return () => {
      window.removeEventListener("authchange", handleAuth)
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
    if (!isHydrated) return // avoid overwriting storage during key detection/hydration
    try {
      localStorage.setItem(cartKey, JSON.stringify(items))
    } catch {
      // ignore write errors
    }
  }, [items, cartKey, isHydrated])

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
