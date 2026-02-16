"use client"

import { useTenantSelection } from "@/context/tenant-selection-context"
import { useCallback, useEffect, useMemo, useState } from "react"

import { getLegacyProducts } from "../products.api"

export type LegacyProduct = {
  id: number
  name: string
  status?: string | null
  stock?: number | null
  quantity?: number | null
  availableStock?: number | null
  extraAttributes: Record<string, unknown> | null
  isVerticalMigrated: boolean
  category?: { name?: string | null } | null
  brand?: { name?: string | null } | null
  updatedAt?: string
}

export type LegacyProductFilters = {
  query: string
  category: string
  brand: string
  inStockOnly: boolean
}

const DEFAULT_FILTERS: LegacyProductFilters = {
  query: "",
  category: "all",
  brand: "all",
  inStockOnly: false,
}

export type LegacyPaginationState = {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
}

export const LEGACY_PAGE_SIZE_OPTIONS = [10, 20, 50]

export function resolveLegacyStock(product: LegacyProduct) {
  if (typeof product.availableStock === "number") return product.availableStock
  if (typeof product.stock === "number") return product.stock
  if (typeof product.quantity === "number") return product.quantity
  return null
}

export function useLegacyProducts(initialPageSize = 20) {
  const { selection } = useTenantSelection()
  const companyId = selection.companyId ?? null

  const [rawProducts, setRawProducts] = useState<LegacyProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFilters] = useState<LegacyProductFilters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const refresh = useCallback(async () => {
    if (!companyId) {
      setRawProducts([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await getLegacyProducts()
      setRawProducts(Array.isArray(list) ? list : [])
    } catch (err) {
      const normalizedError =
        err instanceof Error ? err : new Error("No se pudieron cargar los productos legacy.")
      setError(normalizedError)
      setRawProducts([])
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    setFilters(DEFAULT_FILTERS)
    setPage(0)
    void refresh()
  }, [refresh])

  useEffect(() => {
    setPage(0)
  }, [filters, pageSize])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase()
    const category = filters.category.toLowerCase()
    const brand = filters.brand.toLowerCase()

    return rawProducts.filter((product) => {
      if (filters.inStockOnly) {
        const stock = resolveLegacyStock(product)
        if (stock == null || stock <= 0) {
          return false
        }
      }

      if (category !== "all") {
        const productCategory = (product.category?.name ?? "").toLowerCase()
        if (productCategory !== category) {
          return false
        }
      }

      if (brand !== "all") {
        const productBrand = (product.brand?.name ?? "").toLowerCase()
        if (productBrand !== brand) {
          return false
        }
      }

      if (normalizedQuery) {
        const haystack = `${product.name ?? ""} ${product.category?.name ?? ""} ${product.brand?.name ?? ""}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) {
          return false
        }
      }

      return true
    })
  }, [rawProducts, filters])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize) || 1)
  const currentPage = Math.min(page, totalPages - 1)

  const paginatedProducts = useMemo(() => {
    const start = currentPage * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, currentPage, pageSize])

  const availableCategories = useMemo(() => {
    const values = new Set<string>()
    rawProducts.forEach((product) => {
      const name = product.category?.name
      if (name) values.add(name)
    })
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [rawProducts])

  const availableBrands = useMemo(() => {
    const values = new Set<string>()
    rawProducts.forEach((product) => {
      const name = product.brand?.name
      if (name) values.add(name)
    })
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [rawProducts])

  const updateFilters = useCallback((patch: Partial<LegacyProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleSetPage = useCallback(
    (nextPage: number) => {
      setPage((prev) => {
        const target = Number.isFinite(nextPage) ? nextPage : prev
        return Math.max(0, Math.min(target, totalPages - 1))
      })
    },
    [totalPages],
  )

  const handleSetPageSize = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize)
    setPage(0)
  }, [])

  const pagination: LegacyPaginationState = {
    page: currentPage,
    pageSize,
    totalPages,
    totalItems: filteredProducts.length,
  }

  return {
    companyId,
    loading,
    error,
    filters,
    setFilters: updateFilters,
    pagination,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    products: paginatedProducts,
    filteredProducts,
    availableCategories,
    availableBrands,
    refresh,
  }
}
