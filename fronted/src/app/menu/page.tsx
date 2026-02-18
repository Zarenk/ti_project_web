"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BACKEND_URL } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type MenuItem = {
  id: number
  name: string
  description: string | null
  price: number
  image: string | null
  images: string[]
  available: boolean
  prepTime: number | null
  kitchenStation: string | null
}

type MenuCategory = {
  categoryId: number
  categoryName: string
  items: MenuItem[]
}

type MenuResponse = {
  categories: MenuCategory[]
  total: number
}

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const loadMenu = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/public/menu`, {
        cache: "no-store",
        headers: { "x-tenant-id": "1" },
      })
      if (!res.ok) throw new Error("No se pudo cargar el menu")
      const data: MenuResponse = await res.json()
      setMenu(data.categories)
      if (data.categories.length > 0 && !activeCategory) {
        setActiveCategory(data.categories[0].categoryName)
      }
    } catch {
      setMenu([])
    } finally {
      setLoading(false)
    }
  }, [activeCategory])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return menu
    const q = search.toLowerCase()
    return menu
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [menu, search])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        <div className="animate-pulse text-lg">Cargando carta...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Hero header */}
      <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Nuestra Carta
          </h1>
          <p className="mt-3 text-base text-neutral-400 sm:text-lg">
            Descubre nuestros platos preparados con los mejores ingredientes
          </p>
          <div className="mx-auto mt-6 max-w-md">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar plato..."
              className="border-white/20 bg-white/5 text-white placeholder:text-neutral-500"
            />
          </div>
        </div>
      </header>

      {/* Category nav pills */}
      {menu.length > 1 && (
        <nav className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
            {menu.map((cat) => (
              <button
                key={cat.categoryId}
                onClick={() => {
                  setActiveCategory(cat.categoryName)
                  document
                    .getElementById(`cat-${cat.categoryId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat.categoryName
                    ? "bg-white text-neutral-950"
                    : "bg-white/10 text-neutral-300 hover:bg-white/20"
                }`}
              >
                {cat.categoryName}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Menu content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {filteredMenu.length === 0 ? (
          <p className="py-12 text-center text-neutral-500">
            {search ? "No se encontraron platos." : "No hay platos disponibles."}
          </p>
        ) : (
          <div className="space-y-12">
            {filteredMenu.map((cat) => (
              <section key={cat.categoryId} id={`cat-${cat.categoryId}`}>
                <h2 className="mb-6 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {cat.categoryName}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {cat.items.map((item) => {
                    const imgSrc = resolveImageUrl(
                      item.image || item.images?.[0] || undefined
                    )
                    return (
                      <div
                        key={item.id}
                        className={`group flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10 ${
                          !item.available ? "opacity-50" : ""
                        }`}
                      >
                        {imgSrc ? (
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl">
                            <img
                              src={imgSrc}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">
                            🍽
                          </div>
                        )}
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold leading-tight">
                                {item.name}
                              </h3>
                              <span className="whitespace-nowrap text-base font-bold text-emerald-400">
                                S/. {item.price.toFixed(2)}
                              </span>
                            </div>
                            {item.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-neutral-400">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {item.prepTime != null && (
                              <Badge
                                variant="outline"
                                className="border-white/20 text-[10px] text-neutral-400"
                              >
                                ~{item.prepTime} min
                              </Badge>
                            )}
                            {!item.available && (
                              <Badge variant="destructive" className="text-[10px]">
                                Agotado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-neutral-500">
        Carta digital generada automaticamente
      </footer>
    </div>
  )
}
