"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
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

type MigrationFilter = "all" | "legacy" | "migrated"

export function ProductsClient() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationFilter>("all")
  const [rawProducts, setRawProducts] = useState<Products[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const data = useMemo<Products[]>(() => rawProducts, [rawProducts])

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto space-y-4 px-1 sm:px-6 lg:px-8">
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
      </div>
    </section>
  )
}
