"use client"

import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import { getProducts } from "../dashboard/products/products.api"
import MotionProductCard from "@/components/MotionProductCard"

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

export default function MotionDemoPage() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await getProducts()
        setProducts(data)
      } catch (err) {
        console.error("Error fetching products", err)
      }
    }
    fetchProducts()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <MotionProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}