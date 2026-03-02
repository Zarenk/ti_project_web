"use client"

import { useCallback, useMemo, useState } from "react"
import type { ProductCardItem } from "../components/quick-entry/product-card"
import type { CartItem } from "../components/quick-entry/cart-sidebar"

export function useEntryCart() {
  const [cartMap, setCartMap] = useState<Map<number, CartItem>>(new Map())
  const [serialsMap, setSerialsMap] = useState<Map<number, string[]>>(new Map())
  const [serialDialogProductId, setSerialDialogProductId] = useState<number | null>(null)

  const addToCart = useCallback((product: ProductCardItem) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(product.id)
      if (existing) {
        next.set(product.id, {
          ...existing,
          quantity: existing.quantity + 1,
        })
      } else {
        next.set(product.id, {
          product,
          quantity: 1,
          unitPrice: product.price,
        })
      }
      return next
    })
  }, [])

  const removeFromCart = useCallback((productId: number) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
  }, [])

  const updateCartQty = useCallback((productId: number, qty: number) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      const item = next.get(productId)
      if (item) {
        next.set(productId, { ...item, quantity: qty })
      }
      return next
    })
  }, [])

  const updateCartPrice = useCallback((productId: number, price: number) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      const item = next.get(productId)
      if (item) {
        next.set(productId, { ...item, unitPrice: price })
      }
      return next
    })
  }, [])

  const decrementCart = useCallback((productId: number) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      const item = next.get(productId)
      if (!item) return prev
      if (item.quantity <= 1) {
        next.delete(productId)
      } else {
        next.set(productId, { ...item, quantity: item.quantity - 1 })
      }
      return next
    })
  }, [])

  const cartItems = useMemo(() => Array.from(cartMap.values()), [cartMap])
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [cartItems],
  )
  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems],
  )

  // --- Serial helpers ---
  const handleSerialClick = useCallback((productId: number) => {
    setSerialDialogProductId(productId)
  }, [])

  const handleSerialSave = useCallback((productId: number, serials: string[]) => {
    setSerialsMap((prev) => {
      const next = new Map(prev)
      if (serials.length > 0) {
        next.set(productId, serials)
      } else {
        next.delete(productId)
      }
      return next
    })
  }, [])

  const getOtherSerials = useCallback(
    (excludeProductId: number): string[] => {
      const result: string[] = []
      serialsMap.forEach((serials, pid) => {
        if (pid !== excludeProductId) result.push(...serials)
      })
      return result
    },
    [serialsMap],
  )

  const removeFromCartWithSerials = useCallback((productId: number) => {
    removeFromCart(productId)
    setSerialsMap((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
  }, [removeFromCart])

  const closeSerialDialog = useCallback(() => {
    setSerialDialogProductId(null)
  }, [])

  return {
    cartMap,
    cartItems,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    updateCartQty,
    updateCartPrice,
    decrementCart,
    removeFromCartWithSerials,
    serialsMap,
    serialDialogProductId,
    handleSerialClick,
    handleSerialSave,
    getOtherSerials,
    closeSerialDialog,
  }
}
