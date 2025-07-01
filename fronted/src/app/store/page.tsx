"use client"

import Image from "next/image"
import { Search, Filter, Package, Calendar, TrendingUp, DollarSign, Tag } from "lucide-react"
import { useState, useMemo } from "react"
import type { CheckedState } from "@radix-ui/react-checkbox"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/accordion"

// Tipos
interface Product {
  id: number
  name: string
  description: string
  price: number
  brand: string
  category: string
  stock: number
  date: string
  relevance: number
  image: string
}

interface SortOption {
  value: string
  label: string
  icon: React.ReactNode
}

export default function StorePage() {
  // Datos de ejemplo de productos
  const products: Product[] = [
    {
      id: 1,
      name: "iPhone 15 Pro",
      description: "Smartphone de última generación con chip A17 Pro",
      price: 1199.99,
      brand: "Apple",
      category: "Smartphones",
      stock: 25,
      date: "2024-09-15",
      relevance: 95,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 2,
      name: "MacBook Air M3",
      description: "Laptop ultradelgada con chip M3 de Apple",
      price: 1299.99,
      brand: "Apple",
      category: "Laptops",
      stock: 12,
      date: "2024-03-10",
      relevance: 90,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 3,
      name: "Samsung Galaxy S24",
      description: "Smartphone Android con cámara de 200MP",
      price: 899.99,
      brand: "Samsung",
      category: "Smartphones",
      stock: 18,
      date: "2024-01-20",
      relevance: 88,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 4,
      name: "Dell XPS 13",
      description: "Laptop premium con pantalla InfinityEdge",
      price: 999.99,
      brand: "Dell",
      category: "Laptops",
      stock: 8,
      date: "2023-11-05",
      relevance: 82,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 5,
      name: "AirPods Pro 2",
      description: "Auriculares inalámbricos con cancelación de ruido",
      price: 249.99,
      brand: "Apple",
      category: "Accesorios",
      stock: 45,
      date: "2023-09-12",
      relevance: 85,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 6,
      name: "Sony WH-1000XM5",
      description: "Auriculares over-ear con cancelación de ruido premium",
      price: 399.99,
      brand: "Sony",
      category: "Accesorios",
      stock: 22,
      date: "2023-05-15",
      relevance: 87,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 7,
      name: "iPad Pro 12.9",
      description: "Tablet profesional con chip M2 y pantalla Liquid Retina",
      price: 1099.99,
      brand: "Apple",
      category: "Tablets",
      stock: 15,
      date: "2023-10-18",
      relevance: 89,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 8,
      name: "Surface Pro 9",
      description: "Tablet 2 en 1 con Windows 11 y teclado desmontable",
      price: 1199.99,
      brand: "Microsoft",
      category: "Tablets",
      stock: 10,
      date: "2023-08-22",
      relevance: 80,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 9,
      name: "Gaming Mouse Pro",
      description: "Mouse gaming con sensor óptico de alta precisión",
      price: 79.99,
      brand: "Logitech",
      category: "Accesorios",
      stock: 35,
      date: "2024-02-14",
      relevance: 75,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 10,
      name: "Mechanical Keyboard RGB",
      description: "Teclado mecánico con switches Cherry MX y RGB",
      price: 149.99,
      brand: "Corsair",
      category: "Accesorios",
      stock: 28,
      date: "2024-01-08",
      relevance: 78,
      image: "/placeholder.svg?height=300&width=300",
    },
  ]

  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("relevance")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])

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
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro por categoría
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category)

      // Filtro por marca
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(product.brand)

      return matchesSearch && matchesCategory && matchesBrand
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
        case "date":
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case "stock":
          return b.stock - a.stock
        case "brand":
          return a.brand.localeCompare(b.brand)
        case "relevance":
        default:
          return b.relevance - a.relevance
      }
    })

    return filtered
  }, [products, searchTerm, sortBy, selectedCategories, selectedBrands])

  // Función para limpiar filtros
  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedBrands([])
    setSearchTerm("")
    setSortBy("relevance")
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

              <Accordion type="multiple" defaultValue={["categories", "brands"]} className="w-full">
                {/* Filtro por categorías */}
                <AccordionItem value="categories">
                  <AccordionTrigger className="text-base">Categorías</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
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
                      <SelectItem value="relevance">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Relevancia
                        </div>
                      </SelectItem>
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
                      <SelectItem value="date">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Fecha (Más Reciente)
                        </div>
                      </SelectItem>
                      <SelectItem value="stock">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Stock (Mayor a Menor)
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
                        <Badge
                          variant={product.stock > 20 ? "default" : product.stock > 10 ? "secondary" : "destructive"}
                          className="absolute top-2 right-2"
                        >
                          Stock: {product.stock}
                        </Badge>
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
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span className="font-medium">{product.brand}</span>
                        <span>{new Date(product.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-green-600">${product.price.toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{product.relevance}%</span>
                        </div>
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