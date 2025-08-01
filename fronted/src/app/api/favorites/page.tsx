"use client"
import React, { useEffect, useState } from 'react'
import Navbar from '@/components/navbar'
import MotionProductCard from '@/components/MotionProductCard'
import { getFavorites } from './favorites.api'
import { isTokenValid } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([])
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
      }
    }
    load()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Mis Favoritos</h1>
        {favorites.length === 0 ? (
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
                  brand: fav.product.brand || '',
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