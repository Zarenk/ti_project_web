"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "./products.api"
import { fetchCompanyVerticalInfo } from "@/app/dashboard/tenancy/tenancy.api"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { useDebounce } from "@/app/hooks/useDebounce"
import type { Products } from "./columns"

type MigrationFilter = "all" | "legacy" | "migrated"
type CategoryFilter = "all" | string

export function useProductsData() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const { selection } = useTenantSelection()
  const queryClient = useQueryClient()

  // ── Products query ──────────────────────────────────────────────────
  const migrationFilter = migrationStatus === "all" ? undefined : { migrationStatus }

  const {
    data: rawProducts = [],
    isLoading: loading,
    error: productsError,
  } = useQuery<Products[]>({
    queryKey: queryKeys.products.list(selection.orgId, selection.companyId, { migrationStatus }),
    queryFn: async () => {
      const products = await getProducts(migrationFilter)
      return products.map((product: any) => ({
        ...product,
        category_name: product.category?.name || "Sin categoria",
      }))
    },
    enabled: selection.orgId !== null,
  })

  const error = productsError
    ? productsError instanceof Error
      ? productsError.message
      : "No se pudieron cargar los productos"
    : null

  // ── Vertical query ──────────────────────────────────────────────────
  const { data: verticalName = "GENERAL" } = useQuery<string>({
    queryKey: [...queryKeys.vertical.config(selection.orgId, selection.companyId), "products-vertical"],
    queryFn: async () => {
      if (!selection.companyId) return "GENERAL"
      const info = await fetchCompanyVerticalInfo(selection.companyId)
      return info?.businessVertical ?? "GENERAL"
    },
    enabled: selection.companyId !== null,
  })

  const isRestaurant = verticalName === "RESTAURANTS"

  // ── Derived data (same as before) ───────────────────────────────────
  const categories = useMemo(() => {
    const values = new Set<string>()
    rawProducts.forEach((product) => {
      if (product.category_name) {
        values.add(product.category_name)
      }
    })
    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"))
  }, [rawProducts])

  const filteredProducts = useMemo(() => {
    const query = debouncedSearchTerm.trim().toLowerCase()
    return rawProducts.filter((product) => {
      const matchCategory = categoryFilter === "all" || product.category_name === categoryFilter
      if (!matchCategory) return false
      if (!query) return true
      return (
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      )
    })
  }, [rawProducts, debouncedSearchTerm, categoryFilter])

  const averagePrice = useMemo(() => {
    if (filteredProducts.length === 0) return 0
    const total = filteredProducts.reduce((sum, product) => {
      const price = Number(product.priceSell ?? product.price ?? 0)
      return sum + (Number.isFinite(price) ? price : 0)
    }, 0)
    return total / filteredProducts.length
  }, [filteredProducts])

  // ── Invalidation helper (replaces reloadProducts) ───────────────────
  const reloadProducts = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.products.root(selection.orgId, selection.companyId),
    })
  }

  return {
    rawProducts,
    loading,
    error,
    isRestaurant,
    migrationStatus,
    setMigrationStatus,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    categories,
    filteredProducts,
    averagePrice,
    reloadProducts,
  }
}

export type { MigrationFilter, CategoryFilter }
