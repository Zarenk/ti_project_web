"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { fetchSeriesByProductAndStore } from "../sales.api"
import {
  type SaleProductCardItem,
} from "../components/quick-sale/sale-product-card"
import {
  type SaleCartItem,
} from "../components/quick-sale/sale-cart-sidebar"

export function useSaleCart(storeId: number | null, serialsEnabled: boolean) {
  // --- Cart ---
  const [cartMap, setCartMap] = useState<Map<number, SaleCartItem>>(new Map())

  // --- Stock tracking ---
  const [stockMap, setStockMap] = useState<Map<number, number>>(new Map())

  // --- Serials (auto-assigned) ---
  const [serialsMap, setSerialsMap] = useState<Map<number, string[]>>(
    new Map(),
  )
  const [availableSeriesMap, setAvailableSeriesMap] = useState<
    Map<number, string[]>
  >(new Map())

  // --- Serial dialog ---
  const [serialDialogOpen, setSerialDialogOpen] = useState(false)
  const [serialDialogProductId, setSerialDialogProductId] = useState<
    number | null
  >(null)
  const [serialDialogLoading, setSerialDialogLoading] = useState(false)

  // ──────────────────────────────────────────────
  // Computed
  // ──────────────────────────────────────────────
  const cartItems = useMemo(() => Array.from(cartMap.values()), [cartMap])
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [cartItems],
  )
  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems],
  )

  // ──────────────────────────────────────────────
  // Auto-assign series
  // ──────────────────────────────────────────────
  const autoAssignSeries = useCallback(
    async (productId: number, qty: number) => {
      if (!storeId || !serialsEnabled) return

      let available = availableSeriesMap.get(productId)
      if (!available) {
        try {
          available = await fetchSeriesByProductAndStore(storeId, productId)
          setAvailableSeriesMap((prev) => {
            const next = new Map(prev)
            next.set(productId, available!)
            return next
          })
        } catch {
          return
        }
      }

      if (!available || available.length === 0) return

      const usedByOthers = new Set<string>()
      serialsMap.forEach((serials, pid) => {
        if (pid !== productId) serials.forEach((s) => usedByOthers.add(s))
      })

      const assignable = available.filter((s) => !usedByOthers.has(s))
      const assigned = assignable.slice(0, qty)

      setSerialsMap((prev) => {
        const next = new Map(prev)
        if (assigned.length > 0) {
          next.set(productId, assigned)
        } else {
          next.delete(productId)
        }
        return next
      })
    },
    [storeId, serialsEnabled, availableSeriesMap, serialsMap],
  )

  // ──────────────────────────────────────────────
  // Cart operations
  // ──────────────────────────────────────────────
  const addToCart = useCallback(
    (product: SaleProductCardItem) => {
      const currentStock = stockMap.get(product.id) ?? 0
      const currentQty = cartMap.get(product.id)?.quantity ?? 0

      if (currentQty >= currentStock) {
        toast.error(
          `Stock insuficiente para ${product.name} (disponible: ${currentStock})`,
        )
        return
      }

      // Validate product has valid price before adding to cart
      if (!product.priceSell || product.priceSell <= 0 || !Number.isFinite(product.priceSell)) {
        toast.error(
          `El producto "${product.name}" no tiene un precio de venta valido. Por favor, actualiza el precio del producto antes de agregarlo al carrito.`,
        )
        return
      }

      const newQty = currentQty + 1

      setCartMap((prev) => {
        const next = new Map(prev)
        const existing = next.get(product.id)
        if (existing) {
          next.set(product.id, { ...existing, quantity: newQty })
        } else {
          next.set(product.id, {
            product,
            quantity: 1,
            unitPrice: product.priceSell,
          })
        }
        return next
      })

      // Auto-assign series
      void autoAssignSeries(product.id, newQty)
    },
    [stockMap, cartMap, autoAssignSeries],
  )

  const decrementCart = useCallback(
    (productId: number) => {
      setCartMap((prev) => {
        const next = new Map(prev)
        const item = next.get(productId)
        if (!item) return prev
        if (item.quantity <= 1) {
          next.delete(productId)
          setSerialsMap((s) => {
            const ns = new Map(s)
            ns.delete(productId)
            return ns
          })
        } else {
          const newQty = item.quantity - 1
          next.set(productId, { ...item, quantity: newQty })
          void autoAssignSeries(productId, newQty)
        }
        return next
      })
    },
    [autoAssignSeries],
  )

  const updateCartQty = useCallback(
    (productId: number, qty: number) => {
      const maxStock = stockMap.get(productId) ?? 0
      const clampedQty = Math.min(Math.max(1, qty), maxStock)
      setCartMap((prev) => {
        const next = new Map(prev)
        const item = next.get(productId)
        if (item) {
          next.set(productId, { ...item, quantity: clampedQty })
        }
        return next
      })
      void autoAssignSeries(productId, clampedQty)
    },
    [stockMap, autoAssignSeries],
  )

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

  const removeFromCart = useCallback((productId: number) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
    setSerialsMap((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
  }, [])

  // ──────────────────────────────────────────────
  // Serial dialog
  // ──────────────────────────────────────────────
  const handleSerialClick = useCallback(
    async (productId: number) => {
      setSerialDialogProductId(productId)
      setSerialDialogOpen(true)

      // Ensure available series are fetched for this product
      if (!availableSeriesMap.has(productId) && storeId) {
        setSerialDialogLoading(true)
        try {
          const available = await fetchSeriesByProductAndStore(
            storeId,
            productId,
          )
          setAvailableSeriesMap((prev) => {
            const next = new Map(prev)
            next.set(productId, available)
            return next
          })
        } catch {
          // Keep empty
        } finally {
          setSerialDialogLoading(false)
        }
      }
    },
    [storeId, availableSeriesMap],
  )

  const handleSerialSave = useCallback(
    (serials: string[]) => {
      if (serialDialogProductId === null) return
      setSerialsMap((prev) => {
        const next = new Map(prev)
        if (serials.length > 0) {
          next.set(serialDialogProductId, serials)
        } else {
          next.delete(serialDialogProductId)
        }
        return next
      })
    },
    [serialDialogProductId],
  )

  // Computed data for serials dialog
  const serialDialogProduct = serialDialogProductId !== null
    ? cartItems.find((i) => i.product.id === serialDialogProductId)
    : null
  const serialDialogAssigned =
    serialDialogProductId !== null
      ? serialsMap.get(serialDialogProductId) ?? []
      : []
  const serialDialogAvailable =
    serialDialogProductId !== null
      ? availableSeriesMap.get(serialDialogProductId) ?? []
      : []
  const serialDialogOtherSerials = useMemo(() => {
    const others: string[] = []
    serialsMap.forEach((serials, pid) => {
      if (pid !== serialDialogProductId) others.push(...serials)
    })
    return others
  }, [serialsMap, serialDialogProductId])

  // ──────────────────────────────────────────────
  // Reset (for store change)
  // ──────────────────────────────────────────────
  const resetCart = useCallback(() => {
    setCartMap(new Map())
    setSerialsMap(new Map())
    setAvailableSeriesMap(new Map())
  }, [])

  return {
    cartMap,
    cartItems,
    cartTotal,
    cartCount,
    stockMap,
    setStockMap,
    serialsMap,
    addToCart,
    decrementCart,
    updateCartQty,
    updateCartPrice,
    removeFromCart,
    // Serial dialog
    serialDialogOpen,
    setSerialDialogOpen,
    serialDialogProductId,
    serialDialogLoading,
    handleSerialClick,
    handleSerialSave,
    serialDialogProduct,
    serialDialogAssigned,
    serialDialogAvailable,
    serialDialogOtherSerials,
    // Reset
    resetCart,
  }
}
