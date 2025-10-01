"use client"

import { useEffect, useMemo, useRef } from "react"
import { useSiteSettings } from "@/context/site-settings-context"
import { getChipPresentation, getSiteName } from "@/utils/site-settings"
import { cn } from "@/lib/utils"

export default function TopBanner() {
  const { settings } = useSiteSettings()
  const siteName = getSiteName(settings)
  const chip = getChipPresentation(settings)

  const messages = useMemo(
    () =>
      [
        `Bienvenido a ${siteName}`,
        "¡Envíos gratis por compras superiores a S/. 500!",
        "Visita nuestras nuevas ofertas semanales",
      ].filter(Boolean),
    [siteName],
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateVars = () => {
      const el = containerRef.current
      const track = trackRef.current
      if (!el || !track) return

      // ancho visible del contenedor (incluye su padding)
      const containerW = el.clientWidth
      // ancho real del track (pista de mensajes)
      const trackW = track.scrollWidth

      // Coloca la pista justo fuera del borde derecho visible y termina fuera por la izquierda
      track.style.setProperty("--start-x", `${containerW}px`)
      track.style.setProperty("--end-x", `-${trackW}px`)
    }

    updateVars()

    // Recalcular en resize / cambios de fuente / cambios de contenido
    const ro = new ResizeObserver(updateVars)
    if (containerRef.current) ro.observe(containerRef.current)
    if (trackRef.current) ro.observe(trackRef.current)

    window.addEventListener("resize", updateVars)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", updateVars)
    }
  }, [])

  return (
    <div className="top-banner">
      <div className="marquee" ref={containerRef}>
        <div className="marquee__inner" ref={trackRef} aria-hidden="false">
          {messages.map((m, i) => (
            <span
              key={`m-${i}`}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-1 text-sm font-medium",
                chip.variant === "outline" ? "border border-current text-current" : "",
                chip.className,
              )}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}