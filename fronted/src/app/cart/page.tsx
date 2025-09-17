"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { resolveImageUrl } from "@/lib/images"
import { Minus, Plus, X, Heart, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Navbar from "@/components/navbar"
import { useCart, type CartItem } from "@/context/cart-context"
import Link from "next/link"
import { getProducts } from "../dashboard/products/products.api"
import { getStoresWithProduct } from "../dashboard/inventory/inventory.api"
import CheckoutSteps from "@/components/checkout-steps"
import { getFavorites, toggleFavorite } from "@/app/favorites/favorite.api"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { getAuthToken } from "@/utils/auth-token"
import { isTokenValid } from "@/lib/auth"
import { jwtDecode } from "jwt-decode"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Product {
  id: number
  name: string
  price: number
  description: string
  images: string[]
}

export default function ShoppingCart() {
  const { items: cartItems, removeItem, updateQuantity, addItem } = useCart()
  const [couponCode, setCouponCode] = useState("")
  const [discount, setDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState("")
  const [savedItems, setSavedItems] = useState<CartItem[]>([])
  const [savedKey, setSavedKey] = useState<string>("saved-items-guest")
  const [isSavedHydrated, setIsSavedHydrated] = useState<boolean>(false)
  const prevSavedKeyRef = useRef<string>("saved-items-guest")
  const [stockMap, setStockMap] = useState<Record<number, number | null>>({})
  const [favDialogOpen, setFavDialogOpen] = useState(false)
  const [pendingFavItem, setPendingFavItem] = useState<CartItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setIsSavedHydrated(false)
    const computeKey = async () => {
      const token = await getAuthToken()
      if (!token) return "saved-items-guest"
      try {
        const decoded: { userId?: number } = jwtDecode(token)
        const valid = await isTokenValid()
        if (!valid || !decoded.userId) return "saved-items-guest"
        return `saved-items-${decoded.userId}`
      } catch {
        return "saved-items-guest"
      }
    }
    computeKey().then((key) => {
      setSavedKey(key)
      try {
        const guestKey = "saved-items-guest"
        const legacyKey = "saved-items" // compatibilidad con clave anterior
        const tryLegacy = (k: string) => localStorage.getItem(k)
        const guestRaw = localStorage.getItem(guestKey) ?? tryLegacy(legacyKey)
        const guestList: CartItem[] = guestRaw ? JSON.parse(guestRaw) : []
        if (key !== guestKey && guestList.length > 0) {
          const userRaw = localStorage.getItem(key)
          const userList: CartItem[] = userRaw ? JSON.parse(userRaw) : []
          const mergedMap = new Map<number, CartItem>()
          ;[...userList, ...guestList].forEach((it) => {
            const existing = mergedMap.get(it.id)
            if (existing) {
              mergedMap.set(it.id, { ...existing, quantity: existing.quantity + it.quantity })
            } else {
              mergedMap.set(it.id, { ...it })
            }
          })
          const merged = Array.from(mergedMap.values())
          setSavedItems(merged)
          localStorage.setItem(key, JSON.stringify(merged))
          localStorage.removeItem(guestKey)
          localStorage.removeItem(legacyKey)
        } else {
          const stored = localStorage.getItem(key) ?? localStorage.getItem(legacyKey)
          setSavedItems(stored ? (JSON.parse(stored) as CartItem[]) : [])
        }
      } catch {
        setSavedItems([])
      }
      prevSavedKeyRef.current = key
      setIsSavedHydrated(true)
    })
    const handleAuth = () => {
      setIsSavedHydrated(false)
      computeKey().then((newKey) => {
        try {
          const prevKey = prevSavedKeyRef.current
          if (prevKey === "saved-items-guest" && newKey !== "saved-items-guest") {
            const guestRaw = localStorage.getItem("saved-items-guest")
            const guestList: CartItem[] = guestRaw ? JSON.parse(guestRaw) : []
            const userRaw = localStorage.getItem(newKey)
            const userList: CartItem[] = userRaw ? JSON.parse(userRaw) : []
            const mergedMap = new Map<number, CartItem>()
            ;[...userList, ...guestList].forEach((it) => {
              const existing = mergedMap.get(it.id)
              if (existing) {
                mergedMap.set(it.id, { ...existing, quantity: existing.quantity + it.quantity })
              } else {
                mergedMap.set(it.id, { ...it })
              }
            })
            const merged = Array.from(mergedMap.values())
            setSavedKey(newKey)
            setSavedItems(merged)
            localStorage.setItem(newKey, JSON.stringify(merged))
            localStorage.removeItem("saved-items-guest")
          } else {
            setSavedKey(newKey)
            const stored = localStorage.getItem(newKey)
            setSavedItems(stored ? (JSON.parse(stored) as CartItem[]) : [])
          }
          prevSavedKeyRef.current = newKey
        } catch {
          setSavedKey(newKey)
          const stored = localStorage.getItem(newKey)
          setSavedItems(stored ? (JSON.parse(stored) as CartItem[]) : [])
          prevSavedKeyRef.current = newKey
        }
        setIsSavedHydrated(true)
      })
    }
    window.addEventListener("authchange", handleAuth)
    return () => {
      window.removeEventListener("authchange", handleAuth)
    }
  }, [])
  const [recommended, setRecommended] = useState<Product[]>([])
  const [recommendedLoading, setRecommendedLoading] = useState(true)
  const [visibleStart, setVisibleStart] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isSavedHydrated) return
    try {
      localStorage.setItem(savedKey, JSON.stringify(savedItems))
    } catch {
      // ignore
    }
  }, [savedItems, savedKey, isSavedHydrated])

  useEffect(() => {
    async function fetchStocks() {
      const entries = await Promise.all(
        cartItems.map(async (item) => {
          try {
            const stores = await getStoresWithProduct(item.id)
            const total = stores.reduce(
              (sum: number, s: any) => sum + (s.stock ?? 0),
              0,
            )
            return [item.id, total] as [number, number]
          } catch (err) {
            console.error("Error fetching stock:", err)
            return [item.id, null] as [number, null]
          }
        }),
      )
      const map: Record<number, number | null> = {}
      entries.forEach(([id, stock]) => {
        map[id] = stock
      })
      setStockMap(map)
    }
    if (cartItems.length > 0) {
      fetchStocks()
    } else {
      setStockMap({})
    }
  }, [cartItems])

  useEffect(() => {
    async function fetchRecommended() {
      try {
        const products = await getProducts()
        setRecommended(
          products.slice(0, 12).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.priceSell ?? p.price,
            description: p.description || "",
            images: p.images || [],
          }))
        )
      } catch (error) {
        console.error("Error fetching recommended", error)
      }
      setRecommendedLoading(false)
    }
    fetchRecommended()
  }, [])

  const saveForLater = async (item: CartItem) => {
    try {
      // Evitar duplicados en favoritos
      const current = await getFavorites().catch(() => [])
      const alreadyFav = Array.isArray(current) && current.some((f: any) => f.product?.id === item.id || f.productId === item.id)
      if (alreadyFav) {
        toast.info('Este producto ya está en tus Favoritos')
      } else {
        await toggleFavorite(item.id)
        toast.success('Producto guardado en Favoritos')
      }
    } catch (err: any) {
      const message = (err?.message || '').toLowerCase().includes('unauthorized')
        ? 'Debes iniciar sesión para guardar en Favoritos'
        : 'No se pudo guardar en Favoritos'
      toast.error(message)
    }

    // Mantener la funcionalidad existente de "guardar para después"
    removeItem(item.id)
    setSavedItems((prev) => [...prev, item])
  }

  const openFavDialog = (item: CartItem) => {
    setPendingFavItem(item)
    setFavDialogOpen(true)
  }

  const confirmFav = async () => {
    if (!pendingFavItem) return
    await saveForLater(pendingFavItem)
    setFavDialogOpen(false)
    setPendingFavItem(null)
  }

  const openDeleteDialog = (id: number) => {
    setPendingDeleteId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (pendingDeleteId == null) return
    removeItem(pendingDeleteId)
    setDeleteDialogOpen(false)
    setPendingDeleteId(null)
  }

  const moveToCart = (id: number) => {
    const item = savedItems.find((s) => s.id === id)
    if (item) {
      addItem({ id: item.id, name: item.name, price: item.price, image: item.image, quantity: item.quantity })
    }
    setSavedItems((prev) => prev.filter((s) => s.id !== id))
  }

  const showPrev = () => {
    setVisibleStart((prev) => Math.max(prev - 4, 0))
  }

  const showNext = () => {
    setVisibleStart((prev) =>
      Math.min(prev + 4, Math.max(recommended.length - 4, 0))
    )
  }

  const addRecommendedToFavorites = async (productId: number) => {
    try {
      const current = await getFavorites().catch(() => [])
      const alreadyFav = Array.isArray(current) && current.some((f: any) => f.product?.id === productId || f.productId === productId)
      if (alreadyFav) {
        toast.info('Este producto ya está en tus Favoritos')
        return
      }
      await toggleFavorite(productId)
      toast.success('Producto guardado en Favoritos')
    } catch (err: any) {
      const message = (err?.message || '').toLowerCase().includes('unauthorized')
        ? 'Debes iniciar sesión para guardar en Favoritos'
        : 'No se pudo guardar en Favoritos'
      toast.error(message)
    }
  }

  const applyCoupon = () => {
    if (couponCode.toLowerCase() === "save10") {
      setDiscount(0.1) // 10% discount
      setCouponApplied("SAVE10 - 10% off")
    } else if (couponCode.toLowerCase() === "welcome20") {
      setDiscount(0.2) // 20% discount
      setCouponApplied("WELCOME20 - 20% off")
    } else {
      setDiscount(0)
      setCouponApplied("")
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountAmount = subtotal * discount
  const shippingEstimate = cartItems.length === 0 ? 0 : 15
  const total = subtotal - discountAmount + shippingEstimate
  const hasOutOfStock = cartItems.some(
    (item) =>
      stockMap[item.id] !== undefined && (stockMap[item.id] ?? 0) <= 0,
  )
  const canCheckout = cartItems.length > 0 && !hasOutOfStock

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <TooltipProvider delayDuration={150}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CheckoutSteps step={1} />
        <h1 className="text-3xl font-light text-foreground mb-8 text-center">Verifique su pedido</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Section - Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cartItems.length === 0 ? (
              <div className="bg-card rounded-2xl shadow-sm p-8 text-center">
                <p className="text-muted-foreground text-lg">El Carrito esta vacio</p>
              </div>
            ) : (
              <>
                {cartItems.map((item) => {
                  const stock = stockMap[item.id]
                  const outOfStock = stock !== undefined && (stock ?? 0) <= 0
                  return (
                  <div
                    key={item.id}
                    className={`bg-card rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200 ${outOfStock ? 'opacity-50' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Product Image */}
                      <Link href={`/store/${item.id}`} className="flex-shrink-0">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={120}
                          height={120}
                          className="w-24 h-24 sm:w-30 sm:h-30 object-cover rounded-xl"
                        />
                      </Link>

                      {/* Product Details */}
                      <div className="flex-grow space-y-3">
                        <div className="flex justify-between items-start">
                          <Link href={`/store/${item.id}`}
                            className="text-lg font-medium text-foreground leading-tight hover:underline">
                            {item.name}
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(item.id)}
                            className="rounded-full w-8 h-8 p-0 hover:bg-sky-50 hover:text-sky-600 transition-transform active:scale-95"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <p className="text-sky-600 font-semibold text-lg">S/.{item.price.toFixed(2)}</p>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          {/* Quantity Selector */}
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-muted-foreground font-medium">Cantidad:</span>
                            <div className="flex items-center border border-border rounded-full">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="rounded-full w-8 h-8 p-0 hover:bg-sky-50 hover:text-sky-600 transition-transform active:scale-95"
                                disabled={outOfStock || item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="px-4 py-1 text-sm font-medium min-w-[3rem] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="rounded-full w-8 h-8 p-0 hover:bg-sky-50 hover:text-sky-600"
                                disabled={outOfStock || (stock !== undefined && stock !== null && item.quantity >= stock)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Subtotal */}
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Subtotal</p>
                            <p className="text-xl font-semibold text-foreground">
                              S/.{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {outOfStock && (
                          <p className="text-red-600 text-sm font-medium">No hay stock disponible</p>
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => openFavDialog(item)}
                          className="text-muted-foreground hover:text-sky-600 transition-colors flex items-center gap-1 active:scale-95"
                        >
                          <Heart className="w-4 h-4" /> Guardar para después
                        </Button>
                      </div>
                    </div>
                  </div>
                )})}

                {/* Coupon Section */}
                <div className="bg-card rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-medium text-foreground mb-4">Cupon de Descuento</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="text"
                      placeholder="Ingrese el cupon de descuento"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-grow rounded-xl border-border focus:border-sky-400 focus:ring-sky-400"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={applyCoupon}
                          className="cursor-pointer bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-8 py-2 font-medium transition-colors duration-200"
                        >
                          Aplicar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Aplicar cupón de descuento</TooltipContent>
                    </Tooltip>
                  </div>
                  {couponApplied && <p className="text-green-600 text-sm mt-2 font-medium">✓ {couponApplied}</p>}
                <p className="text-xs text-muted-foreground mt-2">Ingresa tus cupones de descuento aqui</p>
              </div>

               {savedItems.length > 0 && (
                 <div className="bg-card rounded-2xl shadow-sm p-6">
                   <h3 className="text-lg font-medium text-foreground mb-4">Guardado para más tarde</h3>
                   <div className="space-y-4">
                     {savedItems.map((item) => (
                       <div key={item.id} className="flex items-center justify-between">
                         <Link href={`/store/${item.id}`} className="flex items-center gap-4">
                           <Image src={item.image || "/placeholder.svg"} alt={item.name} width={60} height={60} className="w-15 h-15 object-cover rounded-lg" />
                           <div>
                             <p className="font-medium hover:underline">{item.name}</p>
                             <p className="text-sm text-muted-foreground">S/.{item.price.toFixed(2)}</p>
                           </div>
                         </Link>
                         <Button size="sm" onClick={() => moveToCart(item.id)} className="bg-sky-500 hover:bg-sky-600 text-white">Mover al carrito</Button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {(recommendedLoading || recommended.length > 0) && (
                  <div className="bg-card rounded-2xl shadow-sm p-6">
                    <h3 className="text-lg font-medium text-foreground mb-4">Te podría interesar</h3>
                    <div className="relative px-2 sm:px-10">
                      {/* Mobile chevrons */}
                      {!recommendedLoading && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const el = document.getElementById("mobile-reco-row")
                              el?.scrollBy({ left: -240, behavior: "smooth" })
                            }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex sm:hidden"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const el = document.getElementById("mobile-reco-row")
                              el?.scrollBy({ left: 240, behavior: "smooth" })
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex sm:hidden"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {/* Mobile: one-line horizontal scroll */}
                      <div id="mobile-reco-row" className="sm:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-6">
                        {recommendedLoading
                          ? Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="min-w-[220px] snap-start space-y-2">
                                <Skeleton className="h-24 w-full rounded-lg" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-5 w-1/2" />
                                <Skeleton className="h-8 w-full" />
                              </div>
                            ))
                          : recommended.map((rp: any) => (
                              <Card key={rp.id} className="group p-2 overflow-hidden min-w-[220px] snap-start">
                                <Link href={`/store/${rp.id}`} className="block">
                                  <Image
                                    src={resolveImageUrl(rp.images[0]) || "/placeholder.svg"}
                                    alt={rp.name}
                                    width={160}
                                    height={120}
                                    className="w-full h-28 object-cover rounded-lg group-hover:scale-105 transition-transform"
                                  />
                                  <div className="mt-2 space-y-1">
                                    <p className="text-sm font-medium line-clamp-2">{rp.name}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{rp.description}</p>
                                    <p className="text-sky-600 font-semibold">S/.{rp.price.toFixed(2)}</p>
                                  </div>
                                </Link>
                                <div className="mt-2">
                                  <div className="flex gap-2">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="cursor-pointer"
                                      onClick={() => addRecommendedToFavorites(rp.id)}
                                      aria-label="Agregar a favoritos"
                                    >
                                      <Heart className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="flex-1 cursor-pointer"
                                      onClick={() =>
                                        addItem({
                                          id: rp.id,
                                          name: rp.name,
                                          price: rp.price,
                                          image: resolveImageUrl(rp.images[0]),
                                          quantity: 1,
                                        })
                                      }
                                      aria-label="Agregar al carrito"
                                    >
                                      Agregar
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                      </div>

                      {/* Desktop: grid with chevrons */}
                      {!recommendedLoading && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={showPrev}
                          disabled={visibleStart === 0}
                          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      )}
                      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {recommendedLoading
                          ? Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="space-y-2">
                                <Skeleton className="h-24 w-full rounded-lg" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-5 w-1/2" />
                                <Skeleton className="h-8 w-full" />
                              </div>
                            ))
                          : recommended.slice(visibleStart, visibleStart + 4).map((rp: any) => (
                              <Card key={rp.id} className="group p-2 overflow-hidden">
                                <Link href={`/store/${rp.id}`} className="block">
                                  <Image
                                    src={resolveImageUrl(rp.images[0]) || "/placeholder.svg"}
                                    alt={rp.name}
                                    width={120}
                                    height={120}
                                    className="w-full h-24 object-cover rounded-lg group-hover:scale-105 transition-transform"
                                  />
                                  <div className="mt-2 space-y-1">
                                    <p className="text-sm font-medium line-clamp-2">{rp.name}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{rp.description}</p>
                                    <p className="text-sky-600 font-semibold">S/.{rp.price.toFixed(2)}</p>
                                  </div>
                                </Link>
                                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex gap-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="secondary"
                                          className="cursor-pointer"
                                          onClick={() => addRecommendedToFavorites(rp.id)}
                                          aria-label="Agregar a favoritos"
                                        >
                                          <Heart className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Agregar a Favoritos</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          className="flex-1 cursor-pointer"
                                          onClick={() =>
                                            addItem({
                                              id: rp.id,
                                              name: rp.name,
                                              price: rp.price,
                                              image: rp.images[0],
                                              quantity: 1,
                                            })
                                          }
                                          aria-label="Agregar al carrito"
                                        >
                                          Agregar
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Agregar al carrito</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </Card>
                            ))}
                      </div>
                      {!recommendedLoading && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={showNext}
                          disabled={visibleStart + 4 >= recommended.length}
                          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Section - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-foreground mb-6">Resumen de Pedido</h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">S/.{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Envío estimado</span>
                  <span className="font-medium text-foreground">S/.{shippingEstimate.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-green-600">Descuento ({(discount * 100).toFixed(0)}%)</span>
                    <span className="font-medium text-green-600">-S/.{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-sky-600">S/.{total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {canCheckout ? (
                    <Button
                      asChild
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-8 py-2 font-medium transition-colors duration-200"
                    >
                      <Link href="/payment">Realizar el pago</Link>
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-sky-500 text-white rounded-xl px-8 py-2 font-medium"
                      disabled
                    >
                      Realizar el pago
                    </Button>
                  )}
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/store">Seguir comprando</Link>
                  </Button>
                  {hasOutOfStock && (
                    <p className="text-red-600 text-sm text-center">
                      No puedes proceder con la compra porque hay productos sin stock
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">Revisa tus productos y aplica los códigos de descuento disponibles arriba</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </TooltipProvider>
      <FavoritesConfirmDialog
        open={favDialogOpen}
        onOpenChange={setFavDialogOpen}
        onConfirm={confirmFav}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

// Dialogo de confirmación para guardar en Favoritos
// Colocado al final para mantener la estructura del JSX clara
function FavoritesConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Guardar en Favoritos</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Deseas guardar este producto en tu lista de Favoritos?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Guardar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Deseas eliminar este producto del carrito?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

