"use client"

import { useState, useMemo } from "react"
import { Search, SlidersHorizontal, X, ChevronDown, ShoppingCart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import type { StoreLayoutProps } from "../types"

export default function BoldStoreLayout({ products }: StoreLayoutProps) {
  const { addItem } = useCart()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("default")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => { if (p.category) cats.add(p.category) })
    return Array.from(cats).sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    let result = [...products]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.brand?.name.toLowerCase().includes(q))
    }
    if (selectedCategory !== "all") result = result.filter((p) => p.category === selectedCategory)
    if (sortBy === "price-asc") result.sort((a, b) => a.price - b.price)
    else if (sortBy === "price-desc") result.sort((a, b) => b.price - a.price)
    else if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [products, searchQuery, selectedCategory, sortBy])

  const activeFilterCount = (searchQuery.trim() ? 1 : 0) + (selectedCategory !== "all" ? 1 : 0) + (sortBy !== "default" ? 1 : 0)

  const handleAddToCart = (e: React.MouseEvent, product: StoreLayoutProps["products"][0]) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || "", quantity: 1 })
  }

  const resetFilters = () => { setSearchQuery(""); setSelectedCategory("all"); setSortBy("default"); setMobileFiltersOpen(false) }

  return (
    <div className="bg-slate-950 text-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Tienda</span>
          </h1>
          <p className="mt-2 text-sm text-white/40">Explora nuestra colección completa</p>
        </div>

        {/* Mobile filters */}
        <div className="flex gap-2 sm:hidden w-full min-w-0 mb-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input
              placeholder="Buscar…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <Button
            variant={mobileFiltersOpen ? "secondary" : "outline"}
            size="sm"
            className="h-9 gap-1.5 cursor-pointer flex-shrink-0 relative rounded-xl border-white/10 text-white/60"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="text-xs">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${mobileFiltersOpen ? "rotate-180" : ""}`} />
          </Button>
        </div>

        <div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileFiltersOpen ? "max-h-[500px] opacity-100 mb-4" : "max-h-0 opacity-0"}`}>
          <div className="space-y-3 pt-1 pb-0.5">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedCategory("all")} className={`px-3 py-1.5 text-xs rounded-xl border transition-all duration-200 cursor-pointer ${selectedCategory === "all" ? "border-primary bg-primary/20 text-primary" : "border-white/10 text-white/40 hover:text-white"}`}>Todos</button>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 text-xs rounded-xl border transition-all duration-200 cursor-pointer ${selectedCategory === cat ? "border-primary bg-primary/20 text-primary" : "border-white/10 text-white/40 hover:text-white"}`}>{cat}</button>
              ))}
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full h-9 px-3 text-xs rounded-xl border border-white/10 bg-white/5 text-white cursor-pointer">
              <option value="default">Ordenar por</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name">Nombre A-Z</option>
            </select>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 w-full text-xs text-white/40 cursor-pointer">
                <X className="h-3 w-3 mr-1" /> Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Desktop filters */}
        <div className="hidden sm:flex items-center gap-4 mb-8">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input placeholder="Buscar…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 pl-9 text-sm rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            <button onClick={() => setSelectedCategory("all")} className={`px-4 py-1.5 text-xs font-medium rounded-xl border transition-all duration-200 cursor-pointer ${selectedCategory === "all" ? "border-primary bg-primary/20 text-primary" : "border-white/10 text-white/40 hover:border-white/30 hover:text-white"}`}>Todos</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 text-xs font-medium rounded-xl border transition-all duration-200 cursor-pointer ${selectedCategory === cat ? "border-primary bg-primary/20 text-primary" : "border-white/10 text-white/40 hover:border-white/30 hover:text-white"}`}>{cat}</button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-9 px-4 text-xs rounded-xl border border-white/10 bg-white/5 text-white cursor-pointer">
            <option value="default">Ordenar por</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="name">Nombre A-Z</option>
          </select>
        </div>

        <p className="mb-6 text-xs text-white/20">{filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}</p>

        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-white/30">No se encontraron productos.</p>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-4 text-white/40 cursor-pointer">Limpiar filtros</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const image = product.images?.[0] ? resolveImageUrl(product.images[0]) : "/placeholder.png"
              return (
                <Link key={product.id} href={`/store/${product.id}`} className="group rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.1)]">
                  <div className="relative aspect-square overflow-hidden">
                    <Image src={image} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                    <button onClick={(e) => handleAddToCart(e, product)} className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/80 text-white backdrop-blur-sm opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-primary hover:scale-110 cursor-pointer" aria-label="Agregar al carrito">
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-3">
                    {product.brand && <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">{product.brand.name}</p>}
                    <h3 className="text-sm font-medium text-white line-clamp-2 mt-0.5 transition-colors duration-200 group-hover:text-primary">{product.name}</h3>
                    <p className="mt-1.5 text-sm font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">{formatCurrency(product.price)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
