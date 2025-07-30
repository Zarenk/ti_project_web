"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Shield } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Product {
  id: number
  name: string
  description: string
  price: number
  brand: string
  category: string
  images: string[]
  stock: number | null
  specification?: {
    processor?: string
    ram?: string
    storage?: string
    graphics?: string
    screen?: string
    resolution?: string
    refreshRate?: string
    connectivity?: string
  }
}

export default function HeroSlideshow({ products }: { products: Product[] }) {
  const [index, setIndex] = useState(0)

  // Start from a random product when the list changes
  useEffect(() => {
    if (products.length > 0) {
      const random = Math.floor(Math.random() * products.length)
      setIndex(random)
    }
  }, [products])

  const next = () =>
    setIndex((i) => (products.length > 0 ? (i + 1) % products.length : i))
  const prev = () =>
    setIndex((i) =>
      products.length > 0 ? (i - 1 + products.length) % products.length : i,
    )

  const product = products[index]

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={product?.images?.[0] || "placeholder"}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: "tween" }}
          className="relative"
        >
          <Image
            src={
              product?.images[0] ||
              "/placeholder.svg?height=500&width=600&text=Hero+Banner"
            }
            alt={product?.name || "Producto"}
            width={600}
            height={500}
            className="rounded-2xl shadow-2xl"
          />
          {product && (
            <div className="absolute -top-6 -left-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {product.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {formatCurrency(product.price, "PEN")}
              </p>
            </div>
          )}
          <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">Garantía extendida</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Hasta 3 años</p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      {products.length > 1 && (
        <>
          <button
            aria-label="Anterior"
            onClick={prev}
            className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            aria-label="Siguiente"
            onClick={next}
            className="absolute top-1/2 right-0 translate-x-full -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  )
}