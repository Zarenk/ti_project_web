"use client"

import Image from "next/image"
import { Search, Filter, Package, DollarSign, Tag } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import type { CheckedState } from "@radix-ui/react-checkbox"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/accordion"
import { getProducts } from "../dashboard/products/products.api"

// Tipos
interface Product {
  id: number
  name: string
  description: string
  price: number
  category: string
  image?: string | null
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await getProducts()
        const mapped = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          price: p.priceSell ?? p.price,
          category: p.category?.name || "Sin categoría",
          image: p.image || null,
        })) as Product[]
        setProducts(mapped)
      } catch (error) {
        console.error("Error fetching products:", error)
      }
    }

    fetchProducts()
  }, [])

  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Obtener categorías y marcas únicas
  const categories = [...new Set(products.map((p) => p.category))]
  const brands = [...new Set(products.map((p) => p.brand))]

  // Función para manejar filtros de categoría
  const handleCategoryChange = (category: string, checked: CheckedState) => {
    if (checked === true) {
      setSelectedCategories([...selectedCategories, category])
    } else if (checked === false) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    }
  }

  // Función para manejar filtros de marca
  const handleBrandChange = (brand: string, checked: CheckedState) => {
    if (checked === true) {
      setSelectedBrands([...selectedBrands, brand])
    } else if (checked === false) {
      setSelectedBrands(selectedBrands.filter((b) => b !== brand))
    }
  }

  // Filtrar y ordenar productos
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter((product: Product) => {
      // Filtro por búsqueda
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro por categoría
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category)

      return matchesSearch && matchesCategory
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
        default:
          return 0
      }
    })

    return filtered
  }, [products, searchTerm, sortBy, selectedCategories])

  // Función para limpiar filtros
  const clearFilters = () => {
    setSelectedCategories([])
    setSearchTerm("")
    setSortBy("name")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>
              <p className="text-gray-600">Encuentra los mejores productos tecnológicos</p>
            </div>
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar con filtros */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </h2>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar
                </Button>
              </div>

              <Accordion type="multiple" defaultValue={["categories"]} className="w-full">
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
                    <div className="space-y-3">
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
              </Accordion>
            </div>
          </aside>

          {/* Contenido principal */}
          <main className="flex-1">
            {/* Barra de herramientas */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
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
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Grid de productos */}
            {filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
                <p className="text-gray-600">Intenta ajustar tus filtros o términos de búsqueda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedProducts.map((product) => (
                  <Card key={product.id} className="group hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="p-0">
                      <div className="relative overflow-hidden rounded-t-lg">
                        <Image
                          src={product.image || "/placeholder.svg"}
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
                      <h3 className="font-semibold text-lg mb-1 line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-green-600">${product.price.toFixed(2)}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0">
                      <Button className="w-full">Agregar al Carrito</Button>
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
