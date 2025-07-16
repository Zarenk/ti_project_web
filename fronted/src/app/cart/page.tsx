"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
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
  const [stockMap, setStockMap] = useState<Record<number, number | null>>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem("saved-items")
      setSavedItems(stored ? (JSON.parse(stored) as CartItem[]) : [])
    } catch {
      setSavedItems([])
    }
  }, [])
  const [recommended, setRecommended] = useState<Product[]>([])
  const [visibleStart, setVisibleStart] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem("saved-items", JSON.stringify(savedItems))
    } catch {
      // ignore
    }
  }, [savedItems])

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
    }
    fetchRecommended()
  }, [])

  const saveForLater = (item: CartItem) => {
    removeItem(item.id)
    setSavedItems((prev) => [...prev, item])
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
  const shippingEstimate = 15
  const total = subtotal - discountAmount + shippingEstimate
  const hasOutOfStock = cartItems.some(
    (item) =>
      stockMap[item.id] !== undefined && (stockMap[item.id] ?? 0) <= 0,
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CheckoutSteps step={1} />
        <h1 className="text-3xl font-light text-gray-900 mb-8 text-center">Verifique su pedido</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Section - Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cartItems.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-gray-500 text-lg">El Carrito esta vacio</p>
              </div>
            ) : (
              <>
                {cartItems.map((item) => {
                  const stock = stockMap[item.id]
                  const outOfStock = stock !== undefined && (stock ?? 0) <= 0
                  return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200 ${outOfStock ? 'opacity-50' : ''}`}
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
                            className="text-lg font-medium text-gray-900 leading-tight hover:underline">
                            {item.name}
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="rounded-full w-8 h-8 p-0 hover:bg-sky-50 hover:text-sky-600 transition-transform active:scale-95"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <p className="text-sky-600 font-semibold text-lg">S/.{item.price.toFixed(2)}</p>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          {/* Quantity Selector */}
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600 font-medium">Cantidad:</span>
                            <div className="flex items-center border border-gray-200 rounded-full">
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
                            <p className="text-sm text-gray-600">Subtotal</p>
                            <p className="text-xl font-semibold text-gray-900">
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
                          onClick={() => saveForLater(item)}
                          className="text-gray-500 hover:text-sky-600 transition-colors flex items-center gap-1 active:scale-95"
                        >
                          <Heart className="w-4 h-4" /> Guardar para después
                        </Button>
                      </div>
                    </div>
                  </div>
                )})}

                {/* Coupon Section */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Cupon de Descuento</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="text"
                      placeholder="Ingrese el cupon de descuento"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-grow rounded-xl border-gray-200 focus:border-sky-400 focus:ring-sky-400"
                    />
                    <Button
                      onClick={applyCoupon}
                      className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-8 py-2 font-medium transition-colors duration-200"
                    >
                      Aplicar
                    </Button>
                  </div>
                  {couponApplied && <p className="text-green-600 text-sm mt-2 font-medium">✓ {couponApplied}</p>}
                <p className="text-xs text-gray-500 mt-2">Ingresa tus cupones de descuento aqui</p>
              </div>

               {savedItems.length > 0 && (
                 <div className="bg-white rounded-2xl shadow-sm p-6">
                   <h3 className="text-lg font-medium text-gray-900 mb-4">Guardado para más tarde</h3>
                   <div className="space-y-4">
                     {savedItems.map((item) => (
                       <div key={item.id} className="flex items-center justify-between">
                         <Link href={`/store/${item.id}`} className="flex items-center gap-4">
                           <Image src={item.image || "/placeholder.svg"} alt={item.name} width={60} height={60} className="w-15 h-15 object-cover rounded-lg" />
                           <div>
                             <p className="font-medium hover:underline">{item.name}</p>
                             <p className="text-sm text-gray-500">S/.{item.price.toFixed(2)}</p>
                           </div>
                         </Link>
                         <Button size="sm" onClick={() => moveToCart(item.id)} className="bg-sky-500 hover:bg-sky-600 text-white">Mover al carrito</Button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {recommended.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Te podría interesar</h3>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={showPrev}
                        disabled={visibleStart === 0}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {recommended.slice(visibleStart, visibleStart + 4).map((rp: any) => (
                          <Card key={rp.id} className="group p-2 overflow-hidden">
                            <Image
                              src={rp.images[0] || "/placeholder.svg"}
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
                            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() =>
                                  addItem({
                                    id: rp.id,
                                    name: rp.name,
                                    price: rp.price,
                                    image: rp.images[0],
                                    quantity: 1,
                                  })
                                }
                              >
                                Agregar
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={showNext}
                        disabled={visibleStart + 4 >= recommended.length}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Section - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Resumen de Pedido</h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">S/.{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Envío estimado</span>
                  <span className="font-medium text-gray-900">S/.{shippingEstimate.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-green-600">Descuento ({(discount * 100).toFixed(0)}%)</span>
                    <span className="font-medium text-green-600">-S/.{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-sky-600">S/.{total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {hasOutOfStock ? (
                    <Button
                      className="w-full bg-sky-500 text-white rounded-xl px-8 py-2 font-medium"
                      disabled
                    >
                      Realizar el pago
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-8 py-2 font-medium transition-colors duration-200"
                    >
                      <Link href="/payment">Realizar el pago</Link>
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
                <p className="text-sm text-gray-500">Revisa tus productos y aplica los códigos de descuento disponibles arriba</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}