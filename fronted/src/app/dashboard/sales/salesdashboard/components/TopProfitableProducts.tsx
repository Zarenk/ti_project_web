"use client"

import { useState, useMemo, useRef, useCallback, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductProfitSummary } from "../../sales.api"
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react"

interface TopProfitableProductsProps {
  products: ProductProfitSummary[]
}

const ITEMS_PER_PAGE = 10
const TOTAL_PAGES = 5

export function TopProfitableProducts({ products }: TopProfitableProductsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPending, startTransition] = useTransition()
  const cardRef = useRef<HTMLDivElement>(null)

  const getMedalEmoji = useCallback((index: number) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `#${index + 1}`
    }
  }, [])

  const getMarginPercentage = useCallback((product: ProductProfitSummary) => {
    if (product.avgPurchasePrice === 0) return 0
    return ((product.profit / product.revenue) * 100).toFixed(1)
  }, [])

  const getRotation = useCallback((product: ProductProfitSummary) => {
    return (product.unitsSold / 30).toFixed(1)
  }, [])

  // Productos a mostrar según el estado
  const displayedProducts = useMemo(() => {
    if (!products || products.length === 0) return []

    if (!isExpanded) {
      return products.slice(0, ITEMS_PER_PAGE)
    } else {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      return products.slice(startIndex, endIndex)
    }
  }, [products, isExpanded, currentPage])

  const actualTotalPages = useMemo(() =>
    Math.min(Math.ceil((products?.length || 0) / ITEMS_PER_PAGE), TOTAL_PAGES),
    [products?.length]
  )

  const handleExpand = useCallback(() => {
    startTransition(() => {
      setIsExpanded(true)
      setCurrentPage(1)
    })
    setTimeout(() => {
      cardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }, 100)
  }, [])

  const handleCollapse = useCallback(() => {
    startTransition(() => {
      setIsExpanded(false)
      setCurrentPage(1)
    })
  }, [])

  const handlePageChange = useCallback((page: number) => {
    startTransition(() => {
      setCurrentPage(page)
    })
  }, [])

  return (
    <Card ref={cardRef} className="border shadow-md w-full min-w-0 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span className="truncate">Top {isExpanded ? '50' : '10'} Productos Más Rentables</span>
            </CardTitle>
            <CardDescription className="truncate text-xs sm:text-sm">Productos con mejores utilidades</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden">
        {!products || products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay datos suficientes para mostrar
          </div>
        ) : (
          <div className="space-y-3">
            {/* Lista de productos con transición CSS */}
            <div
              className={`space-y-3 transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}
              key={currentPage}
            >
              {displayedProducts.map((product, index) => {
                const globalIndex = isExpanded
                  ? (currentPage - 1) * ITEMS_PER_PAGE + index
                  : index

                return (
                  <div
                    key={product.productId}
                    className="flex flex-col gap-2 p-2 sm:p-3 rounded-lg border bg-card hover:bg-muted/50 transition-all duration-200 hover:shadow-md animate-in fade-in slide-in-from-left-4 w-full min-w-0 overflow-hidden"
                    style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                  >
                    {/* Fila 1: Ranking + Nombre */}
                    <div className="flex items-start gap-2 w-full min-w-0">
                      <div className="text-lg sm:text-2xl font-bold w-8 sm:w-12 text-center flex-shrink-0">
                        {getMedalEmoji(globalIndex)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base break-words">{product.name}</p>
                        {product.sku && (
                          <Badge variant="outline" className="text-xs mt-1 inline-block">
                            {product.sku}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Fila 2: Stats */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground pl-10 sm:pl-14">
                      <span className="whitespace-nowrap">{product.unitsSold} vendidas</span>
                      <span className="whitespace-nowrap">{getRotation(product)} un/día</span>
                      <span className="text-green-600 font-medium whitespace-nowrap">
                        {getMarginPercentage(product)}% margen
                      </span>
                    </div>

                    {/* Fila 3: Utilidad */}
                    <div className="flex justify-between items-center pl-10 sm:pl-14 pt-1 border-t">
                      <p className="text-xs text-muted-foreground">Utilidad</p>
                      <p className="text-base sm:text-lg font-bold text-green-600 whitespace-nowrap">
                        S/ {product.profit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Botón "Ver más" o Paginación */}
            {!isExpanded ? (
              <div className="mt-4 flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button
                  onClick={handleExpand}
                  className="group relative overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Ver más productos
                    <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Pills de paginación */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {Array.from({ length: actualTotalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isPending}
                      className={`w-10 h-10 rounded-full font-semibold transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 ${
                        currentPage === page
                          ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg scale-110'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* Botón colapsar */}
                <div className="flex justify-center">
                  <button
                    onClick={handleCollapse}
                    disabled={isPending}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <ChevronUp className="w-4 h-4" />
                    Ver menos
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
