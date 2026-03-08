"use client"

import { useState, useMemo } from "react"
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { ShoppingCart } from "lucide-react"
import type { StoreLayoutProps } from "../types"

export default function EleganceStoreLayout({ products }: StoreLayoutProps) {
  const { addItem } = useCart()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("default")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats).sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.brand?.name.toLowerCase().includes(q),
      )
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory)
    }

    if (sortBy === "price-asc") result.sort((a, b) => a.price - b.price)
    else if (sortBy === "price-desc") result.sort((a, b) => b.price - a.price)
    else if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name))

    return result
  }, [products, searchQuery, selectedCategory, sortBy])

  const activeFilterCount = (searchQuery.trim() ? 1 : 0) + (selectedCategory !== "all" ? 1 : 0) + (sortBy !== "default" ? 1 : 0)

  const handleAddToCart = (e: React.MouseEvent, product: StoreLayoutProps["products"][0]) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || "",
      quantity: 1,
    })
  }

  const resetFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSortBy("default")
    setMobileFiltersOpen(false)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      {/* Header */}
      <div className="mb-8 md:mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70 mb-2">
          Nuestra colección
        </p>
        <h1 className="text-2xl font-extralight tracking-tight text-foreground sm:text-3xl">
          Tienda
        </h1>
      </div>

      {/* Mobile: compact search + filter toggle */}
      <div className="flex gap-2 sm:hidden w-full min-w-0 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar productos…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm rounded-full border-border/30"
          />
        </div>
        <Button
          variant={mobileFiltersOpen ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-1.5 cursor-pointer flex-shrink-0 relative rounded-full"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-xs">Filtros</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${mobileFiltersOpen ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* Mobile: collapsible filter panel */}
      <div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileFiltersOpen ? "max-h-[500px] opacity-100 mb-4" : "max-h-0 opacity-0"}`}>
        <div className="space-y-3 pt-1 pb-0.5">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-300 cursor-pointer ${
                selectedCategory === "all"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/30 text-muted-foreground hover:border-foreground"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-300 cursor-pointer ${
                  selectedCategory === cat
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/30 text-muted-foreground hover:border-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full h-9 px-3 text-xs rounded-full border border-border/30 bg-background cursor-pointer"
          >
            <option value="default">Ordenar por</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="name">Nombre A-Z</option>
          </select>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 w-full text-xs text-muted-foreground cursor-pointer">
              <X className="h-3 w-3 mr-1" /> Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Desktop: horizontal filters */}
      <div className="hidden sm:flex items-center gap-4 mb-8">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar productos…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm rounded-full border-border/30"
          />
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-1.5 text-xs font-medium uppercase tracking-[0.08em] rounded-full border transition-all duration-300 cursor-pointer ${
              selectedCategory === "all"
                ? "border-foreground bg-foreground text-background"
                : "border-border/30 text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 text-xs font-medium uppercase tracking-[0.08em] rounded-full border transition-all duration-300 cursor-pointer ${
                selectedCategory === cat
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/30 text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-9 px-4 text-xs rounded-full border border-border/30 bg-background cursor-pointer"
        >
          <option value="default">Ordenar por</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="name">Nombre A-Z</option>
        </select>
      </div>

      {/* Results count */}
      <p className="mb-6 text-xs text-muted-foreground/60 tracking-wider">
        {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
      </p>

      {/* Product grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">No se encontraron productos.</p>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-4 cursor-pointer">
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => {
            const image = product.images?.[0]
              ? resolveImageUrl(product.images[0])
              : "/placeholder.png"
            return (
              <Link
                key={product.id}
                href={`/store/${product.id}`}
                className="group flex flex-col"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted/30">
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 opacity-0 translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm shadow-lg transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:scale-110 cursor-pointer"
                      aria-label="Agregar al carrito"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 px-1">
                  {product.brand && (
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
                      {product.brand.name}
                    </p>
                  )}
                  <h3 className="text-sm font-normal leading-snug text-foreground line-clamp-2 mt-1 transition-colors duration-300 group-hover:text-primary">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm font-light tracking-wide text-foreground/80">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
