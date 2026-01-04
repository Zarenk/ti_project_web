'use client'

import { useMemo } from 'react'

import { DataTable } from "./data-table"
import type { Products, ProductTableOptions } from "./columns"
import { useTenantFeatures } from "@/context/tenant-features-context"
import { useProductColumns } from "./columns"

type ProductsTableProps = {
  data: Products[]
}

export function ProductsTable({ data }: ProductsTableProps) {
  const tenantFeatures = useTenantFeatures()
  const options: ProductTableOptions = useMemo(
    () => ({
      verticalName: tenantFeatures.verticalInfo?.businessVertical,
      productSchema: tenantFeatures.productSchema,
    }),
    [tenantFeatures.verticalInfo?.businessVertical, tenantFeatures.productSchema],
  )
  const columns = useProductColumns(options)

  return <DataTable columns={columns} data={data} />
}
