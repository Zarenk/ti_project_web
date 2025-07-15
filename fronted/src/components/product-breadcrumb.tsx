"use client"

import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

interface ProductBreadcrumbProps {
  category?: string | null
  brand?: string | null
  productName: string
}

export default function ProductBreadcrumb({ category, brand, productName }: ProductBreadcrumbProps) {
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList className="text-xs antialiased">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Inicio</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {category && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/store?category=${encodeURIComponent(category)}`}>{category}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {brand && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/store?brand=${encodeURIComponent(brand)}`}>{brand}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{productName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}