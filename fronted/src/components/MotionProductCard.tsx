"use client"

import Image from "next/image"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { toast } from "sonner"

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

export default function MotionProductCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false)
  const { addItem } = useCart()

  return (
    <motion.div layout onClick={() => setOpen(!open)} className="cursor-pointer">
      <Card className="group relative overflow-hidden hover:shadow-lg transition-shadow duration-200 card-stripes border-transparent hover:border-border">
        <CardHeader className="p-0">
          <div className="relative overflow-hidden rounded-t-lg">
            <Image
              src={product.images[0] || "/placeholder.svg"}
              alt={product.name}
              width={300}
              height={300}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-2">
            <Badge variant="outline" className="text-xs">
              {product.category}
            </Badge>
          </div>
          <h3 className="font-semibold text-base sm:text-lg mb-1 break-words whitespace-normal">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {product.description}
          </p>
          <span className="text-sm text-muted-foreground mb-2 block">
            {product.brand}
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-green-600">
              S/.{product.price.toFixed(2)}
            </span>
          </div>
          <p
            className={`text-xs mt-1 flex items-center gap-1 ${
              product.stock !== null && product.stock > 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {product.stock !== null && product.stock > 0 ? "Stock:" : "Sin stock"}
            {product.stock !== null && product.stock > 0 && ` ${product.stock}`}
          </p>
          {product.stock !== null && product.stock > 0 && (
            <Button
              className="w-full mt-2 hidden group-hover:block"
              onClick={(e) => {
                e.stopPropagation()
                addItem({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.images[0],
                })
                toast.success("Producto agregado al carrito")
              }}
            >
              Agregar al Carrito
            </Button>
          )}
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="details"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, type: "tween" }}
                className="mt-2 space-y-1 text-xs text-muted-foreground overflow-hidden"
              >
                {product.specification?.processor && (
                  <p>Procesador: {product.specification.processor}</p>
                )}
                {product.specification?.ram && (
                  <p>RAM: {product.specification.ram}</p>
                )}
                {product.specification?.storage && (
                  <p>Almacenamiento: {product.specification.storage}</p>
                )}
                {product.specification?.graphics && (
                  <p>Gráficos: {product.specification.graphics}</p>
                )}
                {product.specification?.screen && (
                  <p>Pantalla: {product.specification.screen}</p>
                )}
                {product.specification?.resolution && (
                  <p>Resolución: {product.specification.resolution}</p>
                )}
                {product.specification?.refreshRate && (
                  <p>Tasa de refresco: {product.specification.refreshRate}</p>
                )}
                {product.specification?.connectivity && (
                  <p>Conectividad: {product.specification.connectivity}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}