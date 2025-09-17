import React from "react"
import { BrandLogo } from "@/components/BrandLogo"
import { resolveImageUrl } from "@/lib/images"

export interface CatalogItemProps {
  title: string
  description?: string
  price?: string
  imageUrl?: string
  logos?: string[]
  brand?: string
  logoUrls?: string[]
  details?: { label: string; value: string }[]
}

export function CatalogItem({
  title,
  description,
  price,
  imageUrl,
  logos,
  logoUrls,
  details,
}: CatalogItemProps) {
  const displayLogos = logos ?? logoUrls

  return (
    <div className="catalog-item flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="space-y-2 p-3 text-center">
        <h3 className="text-base font-semibold text-gray-800 leading-tight">{title}</h3>
      </div>
      {imageUrl && (
        <div className="relative w-full pb-[75%] bg-gray-100">
          <BrandLogo
            src={resolveImageUrl(imageUrl)}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}
      <div className="space-y-3 p-3">
        {description && (
          <p className="text-center text-sm text-gray-600 line-clamp-2">{description}</p>
        )}
        {details && details.length > 0 && (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-left text-sm text-gray-600">
            {details.map((detail, idx) => (
              <li key={idx} className="leading-snug">
                <span className="font-semibold text-gray-700">{detail.label}:</span>{" "}
                <span>{detail.value}</span>
              </li>
            ))}
          </ul>
        )}
        {price && (
          <p className="text-center text-lg font-bold text-gray-900 dark:text-gray-900">{price}</p>
        )}
      </div>
      {displayLogos && displayLogos.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 p-1 pb-2">
          {displayLogos.map((logo, idx) => (
            <BrandLogo
              key={idx}
              src={logo}
              alt="logo"
              className="h-12 w-12 object-contain"
            />
          ))}
        </div>
      )}
    </div>
  )
}

export type { CatalogItemProps as CatalogItemProperties }

