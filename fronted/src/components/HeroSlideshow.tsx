"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion, useMotionValue } from "framer-motion"
import { ChevronLeft, ChevronRight, Shield } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"

interface Brand {
  name: string
  logoSvg?: string
  logoPng?: string
}

interface Product {
  id: number
  name: string
  description: string
  price: number
  brand: Brand | null
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
  const [isPaused, setIsPaused] = useState(false)
  const [isManual, setIsManual] = useState(false)
  const autoDuration = 4

  // Start from a random product when the list changes
  useEffect(() => {
    if (products.length > 0) {
      const random = Math.floor(Math.random() * products.length)
      setIndex(random)
    }
  }, [products])

  const next = (manualTrigger = false) => {
    if (manualTrigger) setIsManual(true)
    setIndex((i) => (products.length > 0 ? (i + 1) % products.length : i))

  }
  const prev = (manualTrigger = false) => {
    if (manualTrigger) setIsManual(true)
    setIndex((i) =>
      products.length > 0 ? (i - 1 + products.length) % products.length : i,
    )
  }

  useEffect(() => {
    if (isPaused || isManual || products.length <= 1) return
    const timer = setTimeout(() => next(), autoDuration * 1000)
    return () => clearTimeout(timer)
  }, [index, isPaused, isManual, products.length])

  const product = products[index]

  const offsetX = useMotionValue(0)
  const offsetY = useMotionValue(0)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPaused) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20
    offsetX.set(x)
    offsetY.set(y)
  }

  const resetMove = () => {
    offsetX.set(0)
    offsetY.set(0)
  }

  const autoVariants = {
    enter: { x: 300, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 },
  }

  const manualVariants = {
    enter: { opacity: 1 },
    center: { opacity: 1 },
    exit: { opacity: 1 },
  }
  return (
    <div className="relative">
      <div className="relative w-full aspect-[6/5] overflow-hidden rounded-2xl shadow-2xl">
        <AnimatePresence>
          <motion.div
            key={product?.id ?? "placeholder"}
            variants={isManual ? manualVariants : autoVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              isManual
                ? { duration: 0 }
                : { duration: autoDuration, ease: "linear" }
            }
            onAnimationComplete={() => {
              if (isManual) setIsManual(false)
            }}
            className="absolute inset-0"
          >
            <motion.div
              onMouseMove={handleMove}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => {
                resetMove()
                setIsPaused(false)
              }}
              style={{ x: offsetX, y: offsetY }}
              className="h-full w-full cursor-pointer"
            >
              {product ? (
                <Link href={`/store/${product.id}`}>
                  <Image
                    src={
                      product.images[0]
                        ? resolveImageUrl(product.images[0])
                        : "/placeholder.svg?height=500&width=600&text=Hero+Banner"
                    }
                    alt={product.name}
                    width={600}
                    height={500}
                    className="h-full w-full object-cover object-center"
                    priority
                  />
                </Link>
              ) : (
                <Image
                  src="/placeholder.svg?height=500&width=600&text=Hero+Banner"
                  alt="Producto"
                  width={600}
                  height={500}         
                  className="h-full w-full object-cover object-center"
                  priority
                />
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {product && (
        <div className="absolute -top-6 -left-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
          <p className="text-gray-800 dark:text-gray-100 font-bold">
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

      {products.length > 1 && (
        <>
          <button
            aria-label="Anterior"
            onClick={() => prev(true)}
            className="absolute top-1/2 left-0 -translate-x-[150%] -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            aria-label="Siguiente"
            onClick={() => next(true)}
            className="absolute top-1/2 right-0 translate-x-[150%] -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  )
}
