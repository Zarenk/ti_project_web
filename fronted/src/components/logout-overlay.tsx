"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"

export default function LogoutOverlay() {
  const { authPending } = useAuth()
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (!authPending) return
    const prevOverflow = document.body.style.overflow
    const prevCursor = document.body.style.cursor
    document.body.style.overflow = 'hidden'
    document.body.style.cursor = 'wait'
    // Trigger enter animations on next frame
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
        "fixed inset-0 z-50 flex items-center justify-center",
        // Backdrop base
        entered ? "bg-black/40" : "bg-black/0",
        // Backdrop blur, motion-safe only
        entered ? "motion-safe:backdrop-blur-sm" : "motion-safe:backdrop-blur-0",
        // Transition
        "transition-all duration-300 ease-out motion-reduce:transition-none",
      ].join(" ")}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className={[
          "rounded-lg bg-card border p-6 shadow-lg flex items-center gap-3 text-card-foreground",
          // Card enter animation
          entered ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2",
          "transform-gpu transition-all duration-300 ease-out motion-reduce:transition-none",
        ].join(" ")}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-medium">Cerrando sesión…</span>
      </div>
    </div>
  )
}
