"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getProducts } from "../products/products.api"
import { ProductsTable } from "./products-table"
import type { Products } from "./columns"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { fetchCompanyVerticalInfo } from "@/app/dashboard/tenancy/tenancy.api"
import { useDebounce } from "@/app/hooks/useDebounce"
import { resolveImageUrl } from "@/lib/images"
import { Badge } from "@/components/ui/badge"
import { isProductActive } from "./status.utils"

type MigrationFilter = "all" | "legacy" | "migrated"
type CategoryFilter = "all" | string

export function ProductsClient() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationFilter>("all")
  const [rawProducts, setRawProducts] = useState<Products[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verticalName, setVerticalName] = useState<string>("GENERAL")
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const { selection } = useTenantSelection()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const products = await getProducts(
          migrationStatus === "all" ? undefined : { migrationStatus },
        )
        if (cancelled) return
        const mapped = products.map((product: any) => ({
          ...product,
          category_name: product.category?.name || "Sin categoria",
        }))
        setRawProducts(mapped)
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "No se pudieron cargar los productos"
          setError(message)
          setRawProducts([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [migrationStatus])

  useEffect(() => {
    let cancelled = false
    const loadVertical = async () => {
      if (!selection.companyId) {
        if (!cancelled) setVerticalName("GENERAL")
        return
      }
      try {
        const info = await fetchCompanyVerticalInfo(selection.companyId)
        if (!cancelled) {
          setVerticalName(info?.businessVertical ?? "GENERAL")
        }
      } catch {
        if (!cancelled) setVerticalName("GENERAL")
      }
    }
    void loadVertical()
    return () => {
      cancelled = true
    }
  }, [selection.companyId])

  const data = useMemo<Products[]>(() => rawProducts, [rawProducts])
  const isRestaurant = verticalName === "RESTAURANTS"
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

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto space-y-4 px-1 sm:px-6 lg:px-8">
        {isRestaurant ? (
          <div className="space-y-5 px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">Carta digital</p>
                <h1 className="text-2xl font-semibold sm:text-3xl">Platos disponibles</h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona tus platos y precios desde una vista r\u00e1pida.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/products/new">Nuevo plato</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/5 bg-muted/30 p-4 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">Platos activos</p>
                <p className="mt-2 text-2xl font-semibold">{filteredProducts.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-muted/30 p-4 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">Categor\u00edas</p>
                <p className="mt-2 text-2xl font-semibold">{categories.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-muted/30 p-4 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">Precio promedio</p>
                <p className="mt-2 text-2xl font-semibold">S/. {averagePrice.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-muted/30 p-4 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">Disponibles</p>
                <p className="mt-2 text-2xl font-semibold">
                  {filteredProducts.filter((product) => isProductActive(product.status)).length}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-background/40 p-4 shadow-sm lg:flex-row lg:items-center">
              <div className="flex-1">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar plato..."
                  className="h-11 bg-background/70"
                />
              </div>
              <div className="w-full lg:w-[220px]">
                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Categor\u00eda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categor\u00edas</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {loading ? (
              <div className="text-sm text-muted-foreground">Cargando platos...</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                No hay platos registrados con esos filtros.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const images = Array.isArray((product as any).images)
                    ? ((product as any).images as string[]).filter(Boolean)
                    : []
                  const imageUrl = images[0] ? resolveImageUrl(images[0]) : null
                  const price = Number(product.priceSell ?? product.price ?? 0)
                  const isActive = isProductActive(product.status)
                  return (
                    <div
                      key={product.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-muted/20 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="relative h-44 w-full overflow-hidden bg-background/40">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            Sin imagen
                          </div>
                        )}
                        <Badge className="absolute left-3 top-3 bg-background/80 text-foreground">
                          {product.category_name}
                        </Badge>
                        <Badge
                          className={`absolute right-3 top-3 ${
                            isActive ? "bg-emerald-500/80" : "bg-rose-500/80"
                          } text-white`}
                        >
                          {isActive ? "Disponible" : "Inactivo"}
                        </Badge>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold">{product.name}</h3>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {product.description || "Sin descripci\u00f3n"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <span className="text-lg font-semibold text-emerald-400">
                            S/. {Number.isFinite(price) ? price.toFixed(2) : "0.00"}
                          </span>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/products/new?id=${product.id}`}>Editar</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Productos</h1>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={migrationStatus} onValueChange={(value) => setMigrationStatus(value as MigrationFilter)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Migración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="legacy">Legacy</SelectItem>
                    <SelectItem value="migrated">Migrados</SelectItem>
                  </SelectContent>
                </Select>
                <Button asChild variant="outline">
                  <Link href="/dashboard/products/migration">Asistente de migración</Link>
                </Button>
              </div>
            </div>
            {loading ? (
              <div className="px-5 text-sm text-muted-foreground">Cargando productos...</div>
            ) : error ? (
              <div className="px-5 text-sm text-destructive">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <ProductsTable data={data} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
