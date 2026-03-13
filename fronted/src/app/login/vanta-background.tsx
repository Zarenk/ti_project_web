"use client"

import { useEffect, useRef, useState, useCallback } from "react"

const THEME_CONFIG = {
  dark: {
    color: 0x4a90d9,
    backgroundColor: 0x0a0e1a,
    fallback: "#0a0e1a",
  },
  light: {
    color: 0x3b82f6,
    backgroundColor: 0xf0f4f8,
    fallback: "#f0f4f8",
  },
} as const

const STORAGE_KEY = "vanta-bg-hidden"

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

/**
 * Vanta.js NET effect background for the login page.
 * Adapts colors to light/dark theme and reacts to theme changes.
 * Includes a toggle button to show/hide the animation (persisted in localStorage).
 */
export default function VantaBackground() {
  const vantaRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vantaEffect = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modulesRef = useRef<{ THREE: any; VANTA_NET: any } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(STORAGE_KEY) === "1"
  })

  const destroyEffect = useCallback(() => {
    if (vantaEffect.current) {
      vantaEffect.current.destroy()
      vantaEffect.current = null
    }
  }, [])

  const createEffect = useCallback((currentTheme: "dark" | "light") => {
    if (!modulesRef.current || !vantaRef.current) return

    destroyEffect()

    const { THREE, VANTA_NET } = modulesRef.current
    const config = THEME_CONFIG[currentTheme]

    vantaEffect.current = VANTA_NET({
      el: vantaRef.current,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: config.color,
      backgroundColor: config.backgroundColor,
      points: 9,
      maxDistance: 22,
      spacing: 16,
      showDots: true,
    })
  }, [destroyEffect])

  // Load modules once
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const THREE = await import("three")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const VANTA_NET = (await import("vanta/dist/vanta.net.min")).default as any

        if (cancelled || !vantaRef.current) return

        modulesRef.current = { THREE, VANTA_NET }
        const initialTheme = getSystemTheme()
        setTheme(initialTheme)

        // Only create effect if not hidden
        const isHidden = localStorage.getItem(STORAGE_KEY) === "1"
        if (!isHidden) {
          createEffect(initialTheme)
        }
        setLoaded(true)
      } catch (err) {
        console.warn("[VantaBackground] Failed to load:", err)
      }
    }

    init()

    return () => {
      cancelled = true
      destroyEffect()
    }
  }, [createEffect, destroyEffect])

  // Watch for theme changes via MutationObserver on <html> class
  useEffect(() => {
    const html = document.documentElement

    const observer = new MutationObserver(() => {
      const newTheme = getSystemTheme()
      setTheme((prev) => {
        if (prev === newTheme) return prev
        if (!hidden) createEffect(newTheme)
        return newTheme
      })
    })

    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [createEffect, hidden])

  const toggleAnimation = useCallback(() => {
    setHidden((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      if (next) {
        destroyEffect()
      } else {
        createEffect(getSystemTheme())
      }
      return next
    })
  }, [createEffect, destroyEffect])

  const fallback = THEME_CONFIG[theme].fallback

  return (
    <>
      <div
        ref={vantaRef}
        className="fixed inset-0 -z-10 transition-opacity duration-700"
        style={{
          opacity: loaded && !hidden ? 1 : 0,
          backgroundColor: fallback,
        }}
      />

      {/* Toggle button */}
      <button
        type="button"
        onClick={toggleAnimation}
        aria-label={hidden ? "Activar animacion de fondo" : "Desactivar animacion de fondo"}
        title={hidden ? "Activar animacion" : "Desactivar animacion"}
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 border-slate-300/60 bg-white/80 text-slate-600 hover:bg-white dark:border-slate-600/60 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700/90"
      >
        {hidden ? (
          // Eye icon — animation is off, click to show
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          // Eye-off icon — animation is on, click to hide
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
            <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
            <path d="m2 2 20 20" />
          </svg>
        )}
      </button>
    </>
  )
}
