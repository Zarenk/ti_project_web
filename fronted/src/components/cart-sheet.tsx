"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { useCart } from "@/context/cart-context"
import { formatCurrency } from "@/lib/utils"

export default function CartSheet() {
  const { items, removeItem, updateQuantity } = useCart()
  const [isOpen, setIsOpen] = useState(false)

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      {/* Cart Icon Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-105"
      >
        <ShoppingCart className="h-5 w-5" />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-cyan-400 text-blue-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {totalItems}
          </span>
        )}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Cart Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-full">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Tu Carrito</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Tu carrito está vacío</p>
                <p className="text-gray-400 text-sm mt-2">Añade productos para comenzar</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
                >
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                    <p className="text-lg font-semibold text-blue-600 mt-2">
                      {formatCurrency(item.price, "PEN")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 rounded-l-lg"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 rounded-r-lg"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subtotal Section */}
          {items.length > 0 && (
            <div className="border-t border-gray-100 p-6 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, "PEN")}</span>
                </div>
              </div>
              <Button
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                asChild
              >
                <Link href="/cart">Pagar</Link>
              </Button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full mt-3 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200 hover:underline"
              >
                Seguir comprando
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}