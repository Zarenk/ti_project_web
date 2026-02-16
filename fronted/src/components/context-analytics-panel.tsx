"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getAnalyticsEvents,
  subscribeToAnalytics,
  type AnalyticsEvent,
} from "@/lib/analytics"
import { cn } from "@/lib/utils"

const CONTEXT_EVENT_PREFIX = "context_"
const MAX_ROWS = 6

type ContextAnalyticsPanelProps = {
  mode?: "floating" | "inline"
  defaultExpanded?: boolean
  className?: string
}

export function ContextAnalyticsPanel({
  mode = "floating",
  defaultExpanded,
  className,
}: ContextAnalyticsPanelProps) {
  const [events, setEvents] = useState<AnalyticsEvent[]>(() =>
    getAnalyticsEvents().filter(filterContextEvents).slice(-MAX_ROWS),
  )
  const [expanded, setExpanded] = useState(
    defaultExpanded ?? mode === "inline",
  )

  useEffect(() => {
    return subscribeToAnalytics((event) => {
      if (!filterContextEvents(event)) {
        return
      }
      setEvents((prev) => {
        const next = [...prev, event].slice(-MAX_ROWS)
        return next
      })
    })
  }, [])

  const rows = useMemo(() => events.slice().reverse(), [events])

  if (rows.length === 0) {
    return null
  }

  const isFloating = mode === "floating"

  return (
    <div
      className={cn(
        isFloating
          ? "fixed bottom-6 left-6 z-40 w-[min(90vw,420px)] rounded-2xl border border-slate-200/70 bg-white/90 shadow-xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80"
          : "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
      onClick={() => {
        if (isFloating && !expanded) {
          setExpanded(true)
        }
      }}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Analytics de Contexto
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Últimos eventos
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-slate-500 underline underline-offset-4 dark:text-slate-300"
          onClick={(event) => {
            if (isFloating) {
              event.stopPropagation()
            }
            setExpanded((prev) => !prev)
          }}
        >
          {expanded ? "Cerrar" : "Ver"}
        </button>
      </div>
      {expanded ? (
        <div className="max-h-72 overflow-auto border-t border-slate-100 px-4 py-2 text-xs dark:border-slate-700">
          {rows.map((event, index) => (
            <div
              key={`${event.timestamp}-${event.name}-${index}`}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-2",
                classifyEvent(event.name),
              )}
            >
              <div className="flex-1">
                <p className="font-semibold">{event.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </p>
                {event.payload && (
                  <pre className="mt-1 overflow-auto rounded bg-black/5 p-1 text-[11px] dark:bg-white/5">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function filterContextEvents(event: AnalyticsEvent) {
  return event.name.startsWith(CONTEXT_EVENT_PREFIX)
}

function classifyEvent(name: string) {
  if (name.includes("failure")) {
    return "border-rose-200 bg-rose-50/70 dark:border-rose-400/30 dark:bg-rose-950/70"
  }
  if (name.includes("success")) {
    return "border-emerald-200 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-950/70"
  }
  return "border-slate-200 bg-slate-50/70 dark:border-slate-600/40 dark:bg-slate-900/60"
}
