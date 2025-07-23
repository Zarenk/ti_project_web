"use client"

import Image from "next/image"
import { Search, Filter, Package, PackageOpen, DollarSign, Tag } from "lucide-react"
import Navbar from "@/components/navbar"
import { useState, useMemo, useEffect } from "react"
import { useDebounce } from "@/app/hooks/useDebounce"
import { useSearchParams } from "next/navigation"
import type { CheckedState } from "@radix-ui/react-checkbox"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/accordion"
import { getProducts } from "../dashboard/products/products.api"
import { getStoresWithProduct } from "../dashboard/inventory/inventory.api"
import Link from "next/link"
import { toast } from "sonner"
import { useCart } from "@/context/cart-context"

// Tipos
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

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const { addItem } = useCart()

  useEffect(() => {
    async function fetchProducts() {
      try {
        const fetchedProducts = await getProducts()
        const mapped = await Promise.all(
          fetchedProducts.map(async (p: any) => {
            let stock: number | null = null
            try {
              const stores = await getStoresWithProduct(p.id)
              stock = stores.reduce(
                (sum: number, item: any) => sum + (item.stock ?? 0),
                0
              )
            } catch (error) {
              console.error('Error fetching stock:', error)
            }
            return {
              id: p.id,
              name: p.name,
              description: p.description || '',
              price: p.priceSell ?? p.price,
              brand: p.brand || 'Sin marca',
              category: p.category?.name || 'Sin categoría',
              images: p.images || [],
              stock,
              specification: p.specification ?? undefined,
            }
          })
        ) as Product[]
        setProducts(mapped)
      } catch (error) {
        console.error("Error fetching products:", error)
      }
    }

    fetchProducts()
  }, [])

  const [searchTerm, setSearchTerm] = useState("")

  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [sortBy, setSortBy] = useState("name")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([])

  const searchParams = useSearchParams()

  useEffect(() => {
    const paramCategory = searchParams.get('category')
    const paramBrand = searchParams.get('brand')
    if (paramCategory) {
      setSelectedCategories([paramCategory])
    }
    if (paramBrand) {
      setSelectedBrands([paramBrand])
    }
  }, [searchParams])

  // Obtener categorías y marcas únicas ordenadas alfanuméricamente
  const categories = [...new Set(products.map((p) => p.category))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

  const brands = [...new Set(products.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

  // Función para manejar filtros de categoría
  const handleCategoryChange = (category: string, checked: CheckedState) => {
    if (checked === true) {
      setSelectedCategories([...selectedCategories, category])
    } else if (checked === false) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    }
  }

  const handleBrandChange = (brand: string, checked: CheckedState) => {
    if (checked === true) {
      setSelectedBrands([...selectedBrands, brand])
    } else if (checked === false) {
      setSelectedBrands(selectedBrands.filter((b) => b !== brand))
    }
  }

  const handleAvailabilityChange = (option: string, checked: CheckedState) => {
    if (checked === true) {
      setSelectedAvailability([...selectedAvailability, option])
    } else if (checked === false) {
      setSelectedAvailability(
        selectedAvailability.filter((o) => o !== option)
      )
    }
  }

  // Filtrar y ordenar productos
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter((product: Product) => {
      // Filtro por búsqueda
      const matchesSearch =
        product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(debouncedSearchTerm.toLowerCase())

      // Filtro por categoría
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category)
      const matchesBrand =
        selectedBrands.length === 0 || selectedBrands.includes(product.brand)

      const matchesAvailability =
        selectedAvailability.length === 0 ||
        (selectedAvailability.includes('stock') &&
          product.stock !== null &&
          product.stock > 0) ||
        (selectedAvailability.includes('noStock') &&
          (product.stock === null || product.stock <= 0))

      return (
        matchesSearch &&
        matchesCategory &&
        matchesBrand &&
        matchesAvailability
      )
    })

    // Ordenar productos
    filtered.sort((a: Product, b: Product) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "price-low":
          return a.price - b.price
        case "price-high":
          return b.price - a.price
        case "brand":
          return a.brand.localeCompare(b.brand)
        default:
          return 0
      }
    })

    return filtered
  }, [
    products,
    debouncedSearchTerm,
    sortBy,
    selectedCategories,
    selectedBrands,
    selectedAvailability,
  ])

  // Función para limpiar filtros
  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedBrands([])
    setSelectedAvailability([])
    setSearchTerm("")
    setSortBy("name")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Catálogo de Productos</h1>
                <p className="text-muted-foreground">Encuentra los mejores productos tecnológicos</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar con filtros */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-lg shadow-sm border p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </h2>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar
                </Button>
              </div>

              <Accordion
                type="multiple"
                defaultValue={["categories", "brands", "availability"]}
                className="w-full"
              >
                {/* Filtro por categorías */}
                <AccordionItem value="categories">
                  <AccordionTrigger className="text-base">Categorías</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={(checked) => handleCategoryChange(category, checked as CheckedState)}
                          />
                          <Label htmlFor={`category-${category}`} className="text-sm font-normal">
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Filtro por marcas */}
                <AccordionItem value="brands">
                  <AccordionTrigger className="text-base">Marcas</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {brands.map((brand) => (
                        <div key={brand} className="flex items-center space-x-2">
                          <Checkbox
                            id={`brand-${brand}`}
                            checked={selectedBrands.includes(brand)}
                            onCheckedChange={(checked) => handleBrandChange(brand, checked as CheckedState)}
                          />
                          <Label htmlFor={`brand-${brand}`} className="text-sm font-normal">
                            {brand}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Filtro por disponibilidad */}
                <AccordionItem value="availability">
                  <AccordionTrigger className="text-base">
                    Disponibilidad
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="availability-stock"
                          checked={selectedAvailability.includes('stock')}
                          onCheckedChange={(checked) =>
                            handleAvailabilityChange('stock', checked as CheckedState)
                          }
                        />
                        <Label
                          htmlFor="availability-stock"
                          className="text-sm font-normal"
                        >
                          Stock
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="availability-noStock"
                          checked={selectedAvailability.includes('noStock')}
                          onCheckedChange={(checked) =>
                            handleAvailabilityChange('noStock', checked as CheckedState)
                          }
                        />
                        <Label
                          htmlFor="availability-noStock"
                          className="text-sm font-normal"
                        >
                          Sin stock
                        </Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
              </Accordion>
            </div>
          </aside>

          {/* Contenido principal */}
          <main className="flex-1">
            {/* Barra de herramientas */}
            <div className="bg-card rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  {filteredAndSortedProducts.length} productos encontrados
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="sort" className="text-sm font-medium">
                    Ordenar por:
                  </Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Nombre (A-Z)
                        </div>
                      </SelectItem>
                      <SelectItem value="price-low">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Precio (Menor a Mayor)
                        </div>
                      </SelectItem>
                      <SelectItem value="price-high">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Precio (Mayor a Menor)
                        </div>
                      </SelectItem>
                      <SelectItem value="brand">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Marca (A-Z)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Grid de productos */}
            {filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron productos</h3>
                <p className="text-muted-foreground">Intenta ajustar tus filtros o términos de búsqueda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAndSortedProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="group relative overflow-hidden hover:shadow-lg transition-shadow duration-200 card-stripes border-transparent hover:border-border"
                  >
                    <Link href={`/store/${product.id}`}
                      className="block">
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
                        <h3 className="font-semibold text-base sm:text-lg mb-1 break-words whitespace-normal">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                        <span className="text-sm text-muted-foreground mb-2 block">{product.brand}</span>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-green-600">S/.{product.price.toFixed(2)}</span>
                        </div>
                        <p
                          className={`text-xs mt-1 flex items-center gap-1 ${
                            product.stock !== null && product.stock > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {product.stock !== null && product.stock > 0 ? (
                            <PackageOpen className="w-4 h-4" />
                          ) : (
                            <Package className="w-4 h-4" />
                          )}
                          {product.stock !== null && product.stock > 0
                            ? `Stock: ${product.stock}`
                            : 'Sin stock'}
                        </p>
                        <div className="hidden group-hover:block mt-2 space-y-1 text-xs text-muted-foreground">
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
                        </div>
                      </CardContent>
                    </Link>

                    <CardFooter
                      className="p-4 pt-0 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all"
                    >
                      <Button
                        className="w-full"
                        onClick={() => {
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
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}