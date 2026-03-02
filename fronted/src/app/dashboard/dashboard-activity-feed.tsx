"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, Package, ShoppingCart, AlertTriangle, Inbox } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import type { ActivityItem } from "./use-dashboard-data"

// ── Activity type styles ──────────────────────────────────────────────────────

const ACTIVITY_STYLES: Record<string, { icon: React.ElementType; dot: string; bg: string }> = {
  order: { icon: ShoppingCart, dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  sale: { icon: DollarSign, dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  entry: { icon: Package, dot: "bg-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  alert: { icon: AlertTriangle, dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DashboardActivityFeedProps {
  activities: ActivityItem[]
  showAmounts: boolean
  label: string
}

export function DashboardActivityFeed({ activities, showAmounts, label }: DashboardActivityFeedProps) {
  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{label}</CardTitle>
        <CardDescription>Ultimas actualizaciones</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
          </div>
        ) : (
          activities.map((a) => {
            const style = ACTIVITY_STYLES[a.type] ?? ACTIVITY_STYLES.entry
            const Icon = style.icon
            return (
              <Link
                key={`${a.type}-${a.id}`}
                href={a.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50 cursor-pointer group w-full min-w-0"
              >
                <div className={`rounded-full p-1.5 flex-shrink-0 ${style.bg}`}>
                  <Icon className="h-3.5 w-3.5 text-foreground/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">{a.description}</p>
                    {showAmounts && a.amount != null && a.amount > 0 && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0 tabular-nums">
                        S/. {a.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${style.dot} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
