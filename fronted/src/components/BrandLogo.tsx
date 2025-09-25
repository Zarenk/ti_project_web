import React from "react"

export interface BrandLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  fallbackSrc?: string | string[]
}

export function BrandLogo({ src, alt = "brand logo", fallbackSrc, ...props }: BrandLogoProps) {
  const fallbackList = Array.isArray(fallbackSrc)
    ? fallbackSrc.filter((value): value is string => Boolean(value))
    : fallbackSrc
      ? [fallbackSrc]
      : []
  const handleError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    const el = e.currentTarget
    const raw = el.dataset.fallbacks
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as string[]
        const [next, ...rest] = parsed
        if (next) {
          el.src = next
          el.dataset.fallbacks = JSON.stringify(rest)
          return
        }
      } catch {
        // ignore parse errors and fall through to placeholder
      }
      delete el.dataset.fallbacks
    }
    el.onerror = null
    el.src = "/placeholder.svg"
  }

  const dataProps =
    fallbackList.length > 0
      ? ({ "data-fallbacks": JSON.stringify(fallbackList) } satisfies Record<`data-${string}`, string>)
      : {}

  return <img src={src} alt={alt} onError={handleError} {...dataProps} {...props} />
}