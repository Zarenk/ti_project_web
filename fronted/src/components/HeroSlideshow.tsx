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
  const autoDuration = 4;      // tiempo visible entre cambios
  const fadeDuration = 0.6;    // duración del difuminado

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
    setIndex((i) => (products.length > 0 ? (i - 1 + products.length) % products.length : i))
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
  enter:  { opacity: 0 },
  center: { opacity: 1 },
  exit:   { opacity: 0 },
};

  const manualVariants = {
    enter: { opacity: 1 },
    center: { opacity: 1 },
    exit: { opacity: 1 },
  }

  return (
    <div className="relative">
      <div className="relative w-full aspect-[6/5] overflo  w-hidden rounded-2xl shadow-2xl blue-scan-border">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={product?.id ?? "placeholder"}
            variants={isManual ? manualVariants : autoVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={ isManual ? { duration: 0 } : { duration: fadeDuration, ease: "easeInOut" } }
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
        <div className="absolute -top-6 -left-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg hidden sm:block blue-scan-border">
          <p className="text-gray-800 dark:text-gray-100 font-bold">{product.name}</p>
          <motion.div
            className="flex justify-center items-baseline gap-2 mt-1"
            animate={{ x: [0, 6, 0], scale: [1, 1.06, 1], opacity: [1, 0.98, 1] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.span
              aria-label="Precio"
              className="inline-block origin-left text-lg sm:text-xl font-semibold text-sky-600"
              animate={{
                color: ["#0369a1", "#0ea5e9", "#0369a1"],
                textShadow: [
                  "0 0 0 rgba(14,165,233,0)",
                  "0 0 10px rgba(14,165,233,0.85), 0 0 20px rgba(14,165,233,0.5)",
                  "0 0 0 rgba(14,165,233,0)",
                ],
              }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            >
              {formatCurrency(product.price, "PEN")}
            </motion.span>
            <motion.span
              aria-label="Oferta"
              className="inline-block origin-left text-base sm:text-lg font-extrabold text-red-600 tracking-wide"
              animate={{
                color: ["#991b1b", "#ef4444", "#991b1b"],
                textShadow: [
                  "0 0 0 rgba(239,68,68,0)",
                  "0 0 10px rgba(239,68,68,0.85), 0 0 20px rgba(239,68,68,0.5)",
                  "0 0 0 rgba(239,68,68,0)",
                ],
              }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            >
              ¡OFERTA!
            </motion.span>
          </motion.div>
        </div>
      )}

      <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg hidden sm:block blue-scan-border">
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

      {/* Mobile overlays pinned to top and bottom, centered */}
      {product && (
        <div className="absolute top-3 left-0 right-0 flex justify-center sm:hidden px-4">
          <div className="relative overflow-hidden w-full max-w-xs bg-white/90 dark:bg-gray-800/90 p-3 rounded-xl shadow-lg text-center blue-scan-border">
            <p className="text-gray-900 dark:text-gray-100 font-bold">{product.name}</p>
            <motion.div
              className="mt-1 flex justify-center items-baseline gap-2"
              animate={{ x: [0, 6, 0], scale: [1, 1.06, 1], opacity: [1, 0.98, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.span
                aria-label="Oferta"
                className="inline-block origin-left text-sm font-extrabold text-red-600 tracking-wide"
                animate={{
                  color: ["#991b1b", "#ef4444", "#991b1b"],
                  textShadow: [
                    "0 0 0 rgba(239,68,68,0)",
                    "0 0 10px rgba(239,68,68,0.85), 0 0 20px rgba(239,68,68,0.5)",
                    "0 0 0 rgba(239,68,68,0)",
                  ],
                }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              >
                ¡OFERTA!
              </motion.span> 
              <motion.span
                aria-label="Precio"
                className="inline-block origin-left text-lg font-semibold text-sky-600"
                animate={{
                  color: ["#0369a1", "#0ea5e9", "#0369a1"],
                  textShadow: [
                    "0 0 0 rgba(14,165,233,0)",
                    "0 0 10px rgba(14,165,233,0.85), 0 0 20px rgba(14,165,233,0.5)",
                    "0 0 0 rgba(14,165,233,0)",
                  ],
                }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              >
                {formatCurrency(product.price, "PEN")}
              </motion.span>
            </motion.div>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center sm:hidden px-4">
        <div className="relative overflow-hidden w-full max-w-xs bg-white/90 dark:bg-gray-800/90 p-3 rounded-xl shadow-lg blue-scan-border">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">Garantía extendida</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Hasta 3 años</p>
            </div>
          </div>
        </div>
      </div>

      {products.length > 1 && (
        <>
          <button
            aria-label="Anterior"
            onClick={() => prev(true)}
            className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full shadow"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            aria-label="Siguiente"
            onClick={() => next(true)}
            className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full shadow"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  )
}
