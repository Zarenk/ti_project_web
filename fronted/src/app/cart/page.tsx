"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Minus, Plus, X, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Navbar from "@/components/navbar"
import { useCart, type CartItem } from "@/context/cart-context"
import Link from "next/link"
import { getProducts } from "../dashboard/products/products.api"
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

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem("saved-items", JSON.stringify(savedItems))
    } catch {
      // ignore
    }
  }, [savedItems])

  useEffect(() => {
    async function fetchRecommended() {
      try {
        const products = await getProducts()
        setRecommended(
          products.slice(0, 4).map((p: any) => ({
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
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={120}
                          height={120}
                          className="w-24 h-24 sm:w-30 sm:h-30 object-cover rounded-xl"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-grow space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-medium text-gray-900 leading-tight">{item.name}</h3>
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
                ))}

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
                         <div className="flex items-center gap-4">
                           <Image src={item.image || "/placeholder.svg"} alt={item.name} width={60} height={60} className="w-15 h-15 object-cover rounded-lg" />
                           <div>
                             <p className="font-medium">{item.name}</p>
                             <p className="text-sm text-gray-500">S/.{item.price.toFixed(2)}</p>
                           </div>
                         </div>
                         <Button size="sm" onClick={() => moveToCart(item.id)} className="bg-sky-500 hover:bg-sky-600 text-white">Mover al carrito</Button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {recommended.length > 0 && (
                 <div className="bg-white rounded-2xl shadow-sm p-6">
                   <h3 className="text-lg font-medium text-gray-900 mb-4">Te podría interesar</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     {recommended.map((rp:any) => (
                       <div key={rp.id} className="text-center space-y-2">
                         <Image src={rp.images[0] || "/placeholder.svg"} alt={rp.name} width={120} height={120} className="w-full h-24 object-cover rounded-lg" />
                         <p className="text-sm font-medium line-clamp-2">{rp.name}</p>
                         <p className="text-sky-600 font-semibold">S/.{rp.price.toFixed(2)}</p>
                         <Button size="sm" onClick={() => addItem({ id: rp.id, name: rp.name, price: rp.price, image: rp.images[0], quantity: 1 })} className="w-full transition-transform active:scale-95">Agregar</Button>
                       </div>
                     ))}
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
                <Button
                  asChild
                  className="w-full mt-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-8 py-2 font-medium transition-colors duration-200"
                >
                  <Link href="/payment">Realizar el pago</Link>
                </Button>
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/store">Seguir comprando</Link>
                </Button>
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