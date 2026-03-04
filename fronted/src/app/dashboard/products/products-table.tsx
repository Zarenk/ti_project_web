'use client'

import { useMemo } from 'react'

import { DataTable } from "./data-table"
import type { Products, ProductTableOptions } from "./columns"
import { useTenantFeatures } from "@/context/tenant-features-context"
import { useProductColumns } from "./columns"

type ProductsTableProps = {
  data: Products[]
  onViewProduct?: (product: Products) => void
}

export function ProductsTable({ data, onViewProduct }: ProductsTableProps) {
  const tenantFeatures = useTenantFeatures()
  const options: ProductTableOptions = useMemo(
    () => ({
      verticalName: tenantFeatures.verticalInfo?.businessVertical,
      productSchema: tenantFeatures.productSchema,
      onViewProduct,
    }),
    [tenantFeatures.verticalInfo?.businessVertical, tenantFeatures.productSchema, onViewProduct],
  )
  const columns = useProductColumns(options)

  return <DataTable columns={columns} data={data} />
}
