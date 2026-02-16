"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { useTheme } from "next-themes"
import { useSiteSettings } from "@/context/site-settings-context"
import { getLogoForTheme } from "@/utils/site-settings"

export default function LogoutOverlay() {
  const { authPending } = useAuth()
  const [entered, setEntered] = useState(false)
  const { settings } = useSiteSettings()
  const { resolvedTheme } = useTheme()
  const logoUrl = getLogoForTheme(
    settings,
    (resolvedTheme as "light" | "dark") ?? "light",
  )

  useEffect(() => {
    if (!authPending) return
    const prevOverflow = document.body.style.overflow
    const prevCursor = document.body.style.cursor
    document.body.style.overflow = "hidden"
    document.body.style.cursor = "wait"
    const id = requestAnimationFrame(() => setEntered(true))
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prevOverflow
      document.body.style.cursor = prevCursor
      setEntered(false)
    }
  }, [authPending])

  if (!authPending) return null

  return (
    <div
      aria-live="assertive"
      aria-busy="true"
      className={[
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6",
        entered ? "bg-background/80" : "bg-background/0",
        entered ? "motion-safe:backdrop-blur-md" : "motion-safe:backdrop-blur-0",
        "transition-all duration-500 ease-out motion-reduce:transition-none",
      ].join(" ")}
      style={{ pointerEvents: "auto" }}
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

      {/* Text with animated dots */}
      <div
        className={[
          "flex items-baseline text-sm text-muted-foreground",
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          "transform-gpu transition-all duration-500 delay-150 ease-out motion-reduce:transition-none",
        ].join(" ")}
      >
        <span className="font-medium">Cerrando sesión</span>
        <span className="animate-dot">.</span>
        <span className="animate-dot-2">.</span>
        <span className="animate-dot-3">.</span>
      </div>
    </div>
  )
}
