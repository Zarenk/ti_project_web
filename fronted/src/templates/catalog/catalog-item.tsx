import React from "react"

export interface CatalogItemProps {
  title: string
  description?: string
  price?: string
  imageUrl?: string
  logos?: string[]
  brand?: string
  logoUrls?: string[]
}

export function CatalogItem({
  title,
  description,
  price,
  imageUrl,
  logos,
  logoUrls,
}: CatalogItemProps) {
  return (
    <div className="catalog-item flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="p-3 space-y-2 text-center">
        <h3 className="text-base font-semibold text-gray-800 leading-tight">{title}</h3>
      </div>
      {imageUrl && (
        <div className="relative w-full pb-[75%] bg-gray-100">
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-3 space-y-1 text-center">
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
        )}
        {price && <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{price}</p>}
      </div>
      {logos && logos.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 p-1 pb-2">
          {logos.map((logo, idx) => (
            <img key={idx} src={logo} alt="logo" className="h-30" />
          ))}
        </div>
      )}
    </div>
  )
}

export type { CatalogItemProps as CatalogItemProperties }