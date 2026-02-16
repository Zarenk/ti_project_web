"use client"

import { useTheme } from "next-themes"
import { useSiteSettings } from "@/context/site-settings-context"
import { getLogoForTheme } from "@/utils/site-settings"

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = "Cargando" }: PageLoadingProps) {
  const { settings } = useSiteSettings()
  const { resolvedTheme } = useTheme()
  const logoUrl = getLogoForTheme(
    settings,
    (resolvedTheme as "light" | "dark") ?? "light",
  )

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-5">
      {/* Logo with pulse */}
      <div className="animate-logo-pulse">
        <img
          src={logoUrl}
          alt="Logo"
          className="h-16 w-auto object-contain sm:h-20"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = "/logo_ti.png"
          }}
        />
      </div>

      {/* Loading text with animated dots */}
      <div className="flex items-baseline text-sm text-muted-foreground">
        <span>{message}</span>
        <span className="animate-dot">.</span>
        <span className="animate-dot-2">.</span>
        <span className="animate-dot-3">.</span>
      </div>
    </div>
  )
}
