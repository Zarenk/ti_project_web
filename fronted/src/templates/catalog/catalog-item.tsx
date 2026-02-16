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
  details?: { label: string; value: string; iconKey?: string }[]
  layout?: 'grid' | 'list'
  priceEditor?: React.ReactNode
}

function renderSpecIcon(key?: string) {
  if (!key) return null
  const common = "h-4 w-4 text-slate-600"
  switch (key) {
    case "processor":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <rect x="9" y="9" width="6" height="6" fill="currentColor" />
        </svg>
      )
    case "ram":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <rect x="4" y="8" width="16" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <rect x="6" y="10" width="2" height="4" fill="currentColor" />
          <rect x="10" y="10" width="2" height="4" fill="currentColor" />
          <rect x="14" y="10" width="2" height="4" fill="currentColor" />
          <rect x="18" y="7" width="2" height="10" fill="currentColor" />
        </svg>
      )
    case "storage":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M6 7c0-1.1 2.2-2 6-2s6 .9 6 2v10c0 1.1-2.2 2-6 2s-6-.9-6-2V7z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M6 11c0 1.1 2.2 2 6 2s6-.9 6-2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )
    case "graphics":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <rect x="4" y="6" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M8 16v2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M16 16v2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 12l2-3 2 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )
    case "screen":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <rect x="4" y="5" width="16" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M10 19h4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 15v4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case "resolution":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M12 8v8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case "refreshRate":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M6 9a6 6 0 0 1 10-3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M18 15a6 6 0 0 1-10 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M14 3h4v4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M10 21H6v-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )
    case "connectivity":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M4 9c2.5-2.5 13.5-2.5 16 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M7 12c1.8-1.8 8.2-1.8 10 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M10 15c.9-.9 3.1-.9 4 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M12 18h.01" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    default:
      return null
  }
}

export function CatalogItem({
  title,
  description,
  price,
  imageUrl,
  logos,
  logoUrls,
  details,
  layout = 'grid',
  priceEditor,
}: CatalogItemProps) {
  const displayLogos = logos ?? logoUrls

  const detailList =
    details && details.length > 0 ? (
      layout === 'list' ? (
        <ul className="mt-2 grid gap-2 text-left text-sm text-gray-600 sm:grid-cols-2">
          {details.map((detail, idx) => {
            const icon = renderSpecIcon(detail.iconKey)
            return (
              <li key={idx} className="flex items-start gap-2 leading-snug">
                {icon && <span className="mt-0.5 text-slate-600">{icon}</span>}
                <span>
                  <span className="font-semibold text-gray-700">{detail.label}:</span>{' '}
                  <span>{detail.value}</span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="mt-1 space-y-1 text-left text-sm text-gray-600">
          {details.map((detail, idx) => {
            const icon = renderSpecIcon(detail.iconKey)
            return (
              <li key={idx} className="flex items-start gap-2 leading-snug">
                {icon && <span className="mt-0.5 text-slate-600">{icon}</span>}
                <span>
                  <span className="font-semibold text-gray-700">{detail.label}:</span>{' '}
                  <span>{detail.value}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )
    ) : null

  if (layout === 'list') {
    return (
      <div className="catalog-item flex flex-col overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md sm:flex-row">
        <div className="flex w-full items-center justify-center overflow-hidden rounded-lg bg-gray-50 sm:w-1/3">
          {imageUrl ? (
            <BrandLogo
              src={resolveImageUrl(imageUrl)}
              alt={title}
              className="max-h-48 w-full object-contain p-4"
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-gray-500">
              Imagen no disponible
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-1 flex-col gap-3 sm:mt-0 sm:pl-4">
          <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">{title}</h3>
              {description && (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              )}
            </div>
          </div>
          {detailList}
          <div className="mt-auto flex items-end justify-between gap-3 pt-2">
            {displayLogos && displayLogos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {displayLogos.map((logo, idx) => (
                  <BrandLogo
                    key={idx}
                    src={logo}
                    alt="logo"
                    className="h-10 w-10 object-contain"
                  />
                ))}
              </div>
            )}
            {(priceEditor || price) && (
              <div className="ml-auto">
                {priceEditor ?? (
                  <p className="whitespace-nowrap text-base font-bold text-gray-900 lg:text-right">
                    {price}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="catalog-item group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="space-y-2 p-3 text-center">
        <h3 className="text-base font-semibold leading-tight text-gray-800">{title}</h3>
      </div>
      {imageUrl ? (
        <div className="relative w-full overflow-hidden bg-gray-100">
          <div className="pb-[75%]" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <BrandLogo
              src={resolveImageUrl(imageUrl)}
              alt={title}
              className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
            />
          </div>
        </div>
      ) : (
        <div className="flex h-52 items-center justify-center bg-gray-100 text-sm text-gray-500">
          Imagen no disponible
        </div>
      )}
      <div className="space-y-3 p-3">
        {description && (
          <p className="text-center text-sm text-gray-600 line-clamp-2">{description}</p>
        )}
        {detailList}
        {(priceEditor || price) && (
          <div className="flex justify-center">
            {priceEditor ?? (
              <p className="whitespace-nowrap text-center text-lg font-bold text-gray-900 dark:text-gray-900">
                {price}
              </p>
            )}
          </div>
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

