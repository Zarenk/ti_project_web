import Link from "next/link"

import { getProducts } from "../products/products.api"
import { Button } from "@/components/ui/button"
import { ProductsTable } from "./products-table"
import type { Products } from "./columns"

export const dynamic = "force-dynamic"

export default async function Page() {
  const products = await getProducts()
  const mappedData: Products[] = products.map((product: any) => ({
    ...product,
    category_name: product.category?.name || "Sin categor\u30f4a",
  }))

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto space-y-4 px-1 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Productos</h1>
          <Button asChild variant="outline">
            <Link href="/dashboard/products/migration">Asistente de migraci\u041d</Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <ProductsTable data={mappedData} />
        </div>
      </div>
    </section>
  )
}
