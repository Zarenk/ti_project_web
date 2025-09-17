"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import clsx from "clsx"

interface HorizontalScrollerProps {
  children: React.ReactNode
  className?: string
  itemClassName?: string
}

export default function HorizontalScroller({
  children,
  className,
  itemClassName,
}: HorizontalScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollerRef.current
    if (!el) return
    const amount = Math.floor(el.clientWidth * 0.9)
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }

  return (
    <div className={clsx("relative", className)}>
      <div
        ref={scrollerRef}
        className={clsx(
          // Add generous side padding so the first/last item can center
          "flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-[10vw] no-scrollbar",
        )}
      >
        {/* Normalize item widths for mobile viewing */}
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div
                key={i}
                className={clsx(
                  // Center each item on snap and size it to viewport for better focus
                  "flex-shrink-0 snap-center min-w-[80vw] sm:min-w-[60vw]",
                  itemClassName,
                )}
              >
                {child}
              </div>
            ))
          : (
            <div className={clsx("flex-shrink-0 snap-center min-w-[80vw] sm:min-w-[60vw]", itemClassName)}>
              {children}
            </div>
          )}
      </div>

      {/* Chevron controls */}
      <button
        type="button"
        aria-label="Desplazar a la izquierda"
        onClick={() => scrollByAmount("left")}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 shadow p-2 active:scale-95"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="Desplazar a la derecha"
        onClick={() => scrollByAmount("right")}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 shadow p-2 active:scale-95"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
