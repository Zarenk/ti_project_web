"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useSiteSettings } from "@/context/site-settings-context"
import { getLogoForTheme } from "@/utils/site-settings"

interface SessionExpiryOverlayProps {
  onRedirect: () => void
}

export function SessionExpiryOverlay({ onRedirect }: SessionExpiryOverlayProps) {
  const [entered, setEntered] = useState(false)
  const { settings } = useSiteSettings()
  const { resolvedTheme } = useTheme()
  const logoUrl = getLogoForTheme(
    settings,
    (resolvedTheme as "light" | "dark") ?? "light",
  )

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      aria-live="assertive"
      className={[
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center",
        entered ? "bg-background/80" : "bg-background/0",
        entered ? "motion-safe:backdrop-blur-md" : "motion-safe:backdrop-blur-0",
        "transition-all duration-500 ease-out motion-reduce:transition-none",
      ].join(" ")}
    >
      {/* Logo with pulse */}
      <div
        className={[
          entered ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4",
          "transform-gpu transition-all duration-500 ease-out motion-reduce:transition-none",
        ].join(" ")}
      >
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
      </div>

      {/* Message card */}
      <div
        className={[
          "flex flex-col items-center gap-4",
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          "transform-gpu transition-all duration-500 delay-150 ease-out motion-reduce:transition-none",
        ].join(" ")}
      >
        <div>
          <p className="text-lg font-semibold text-foreground">Tu sesión ha expirado</p>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
            Estamos redirigiéndote al inicio de sesión para que puedas continuar trabajando.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={onRedirect}
        >
          Ir al inicio de sesión
        </button>
      </div>
    </div>
  )
}
