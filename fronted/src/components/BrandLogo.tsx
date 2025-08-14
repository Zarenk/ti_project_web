import React from "react"

export interface BrandLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
}

export function BrandLogo({ src, alt = "brand logo", ...props }: BrandLogoProps) {
  const handleError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = "/placeholder.svg"
  }

  return <img src={src} alt={alt} onError={handleError} {...props} />
}