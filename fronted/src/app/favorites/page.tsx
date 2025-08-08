"use client"
import React, { useEffect, useState } from 'react'
import Navbar from '@/components/navbar'
import MotionProductCard from '@/components/MotionProductCard'
import { isTokenValid } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { getFavorites } from './favorite.api'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      if (!(await isTokenValid())) {
        router.replace('/login')
        return
      }
      try {
        const data = await getFavorites()
        setFavorites(data)
      } catch (err) {
        console.error('Error fetching favorites:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Mis Favoritos</h1>
        {isLoading ? (
          <div className="flex flex-col items-center py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Loader2 className="h-10 w-10 text-primary" />
            </motion.div>
            <motion.p
              className="mt-2 text-sm"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Cargando...
            </motion.p>
          </div>
        ) : favorites.length === 0 ? (
          <p>No tienes productos en favoritos.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <MotionProductCard
                key={fav.id}
                product={{
                  id: fav.product.id,
                  name: fav.product.name,
                  description: fav.product.description || '',
                  price: fav.product.priceSell ?? fav.product.price,
                  brand: fav.product.brand
                    ? {
                        name: fav.product.brand.name,
                        logoSvg: fav.product.brand.logoSvg,
                        logoPng: fav.product.brand.logoPng,
                      }
                    : null,
                  category: fav.product.category?.name || '',
                  images: fav.product.images || [],
                  stock: null,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}