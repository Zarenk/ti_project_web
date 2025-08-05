import React from "react"
import type { CatalogItemProps } from "./catalog-item"
import { CatalogItem } from "./catalog-item"

export interface CatalogTemplateProps {
  title?: string
  items: CatalogItemProps[]
}

export function CatalogTemplate({
  title = "Catalog",
  items,
}: CatalogTemplateProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <script src="https://cdn.tailwindcss.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`body { font-family: 'Inter', sans-serif; }`}</style>
      </head>
      <body className="bg-gray-100 p-6">
        <main className="catalog-grid mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <CatalogItem key={index} {...item} />
          ))}
        </main>
      </body>
    </html>
  )
}

export default CatalogTemplate