import React from "react"

export interface CatalogItemProps {
  title: string
  description?: string
  price?: string
  imageUrl?: string
  logos?: string[]
}

export function CatalogItem({
  title,
  description,
  price,
  imageUrl,
  logos,
}: CatalogItemProps) {
  return (
    <div className="catalog-item flex flex-col overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg">
      {imageUrl && (
        <div className="relative w-full pt-[75%] bg-gray-100">
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-2 text-center">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
        {price && <p className="text-sm font-bold text-gray-900">{price}</p>}
        {logos && logos.length > 0 && (
          <div className="flex justify-center gap-2">
            {logos.map((logo, idx) => (
              <img key={idx} src={logo} alt="logo" className="h-6" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export type { CatalogItemProps as CatalogItemProperties }