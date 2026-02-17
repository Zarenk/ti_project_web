"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, X, MessageCircleQuestion, Minus } from "lucide-react"
import { useHelpAssistant } from "@/context/help-assistant-context"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type MascotState = "idle" | "waving" | "thinking" | "responding"

const LOTTIE_SRC: Record<MascotState, string> = {
  idle: "/lottie/help-robot-idle.json",
  waving: "/lottie/help-robot-waving.json",
  thinking: "/lottie/help-robot-thinking.json",
  responding: "/lottie/help-robot-responding.json",
}

/**
 * Lightweight Lottie renderer using lottie-web directly (loaded lazily).
 */
function LottieAnimation({ state }: { state: MascotState }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<any>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const lottie = (await import("lottie-web")).default
        if (cancelled || !containerRef.current) return

        // Destroy previous animation
        if (animRef.current) {
          animRef.current.destroy()
          animRef.current = null
        }

        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: LOTTIE_SRC[state],
        })
      } catch {
        if (!cancelled) setHasError(true)
      }
    }

    setHasError(false)
    void load()

    return () => {
      cancelled = true
      if (animRef.current) {
        animRef.current.destroy()
        animRef.current = null
      }
    }
  }, [state])

  if (hasError) {
    return <Bot className="h-7 w-7 text-primary" />
  }

  return (
    <div
      ref={containerRef}
      style={{ width: 52, height: 52 }}
      aria-hidden="true"
    />
  )
}

export function HelpMascot() {
  const {
    isOpen,
    setIsOpen,
    mascotState,
    showProactiveTip,
    dismissTip,
    sectionMeta,
  } = useHelpAssistant()

  const [isMinimized, setIsMinimized] = useState(false)

  // Load minimized state from localStorage on mount (avoids hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem("help-mascot-minimized")
    if (stored === "true") setIsMinimized(true)
  }, [])

  // Auto-restore when panel is opened externally (e.g. from sidebar link)
  useEffect(() => {
    if (isOpen && isMinimized) {
      setIsMinimized(false)
      localStorage.setItem("help-mascot-minimized", "false")
    }
  }, [isOpen, isMinimized])

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (showProactiveTip) dismissTip()
  }

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMinimized(true)
    localStorage.setItem("help-mascot-minimized", "true")
    if (isOpen) setIsOpen(false)
    if (showProactiveTip) dismissTip()
  }

  const handleRestore = () => {
    setIsMinimized(false)
    localStorage.setItem("help-mascot-minimized", "false")
  }

  const showTip = showProactiveTip && !isOpen && !!sectionMeta && !isMinimized

  /* ─── Minimized: small tab flush with right edge ─── */
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-0 z-50 print:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleRestore}
              className="flex h-10 w-7 items-center justify-center rounded-l-lg bg-white/90 shadow-md ring-1 ring-slate-200/80 backdrop-blur-sm transition-all duration-200 hover:w-9 hover:bg-white hover:shadow-lg dark:bg-slate-900/90 dark:ring-slate-700 dark:hover:bg-slate-900"
              aria-label="Mostrar asistente de ayuda"
            >
              <MessageCircleQuestion className="h-4 w-4 text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            Mostrar asistente de ayuda
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  /* ─── Full mascot button ─── */
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 print:hidden">
      {/* Proactive tip tooltip — always mounted, CSS transitions */}
      <div
        className={`mb-1 max-w-[260px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg transition-all duration-200 dark:border-slate-700 dark:bg-slate-900 ${
          showTip
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0"
        }`}
      >
        <p className="font-medium text-slate-900 dark:text-slate-100">
          {sectionMeta?.label}
        </p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {sectionMeta?.description}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => {
              dismissTip()
              setIsOpen(true)
            }}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Necesito ayuda
          </button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={dismissTip}
          >
            Entendido
          </Button>
        </div>
      </div>

      {/* Mascot container with minimize option */}
      <div className="group relative">
        {/* Minimize button — visible on mobile, hover-only on desktop */}
        {!isOpen && (
          <button
            onClick={handleMinimize}
            className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all duration-150 hover:bg-red-50 hover:text-red-500 hover:ring-red-200 sm:opacity-0 sm:group-hover:opacity-100 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700 dark:hover:bg-red-950 dark:hover:text-red-400 dark:hover:ring-red-800"
            aria-label="Ocultar asistente"
          >
            <Minus className="h-3 w-3" />
          </button>
        )}

        {/* Mascot button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggle}
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200 transition-transform duration-150 hover:scale-[1.08] active:scale-95 dark:bg-slate-900 dark:ring-slate-700"
              aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente de ayuda"}
            >
              {/* Ping ring when waving */}
              {mascotState === "waving" && !isOpen && (
                <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
              )}

              {/* Lottie animation — always mounted, hidden when open */}
              <span
                className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full transition-opacity duration-150 ${
                  isOpen ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
              >
                <LottieAnimation state={mascotState} />
              </span>

              {/* X icon overlay when open */}
              {isOpen && (
                <span className="absolute inset-0 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <X className="h-6 w-6" />
                </span>
              )}

              {/* State indicator dot */}
              {!isOpen && mascotState !== "idle" && (
                <span
                  className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                    mascotState === "waving"
                      ? "bg-amber-500"
                      : mascotState === "thinking"
                        ? "bg-blue-500"
                        : "bg-emerald-500"
                  }`}
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            {isOpen ? "Cerrar asistente" : "Asistente de ayuda - Haz clic para abrir"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
