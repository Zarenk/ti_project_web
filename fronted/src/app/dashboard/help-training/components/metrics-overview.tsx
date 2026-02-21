"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  MessageSquare,
  Brain,
  ThumbsUp,
  Clock,
} from "lucide-react"
import type { HelpAnalytics, PerformanceMetrics } from "../help-training.api"

interface MetricsOverviewProps {
  analytics: HelpAnalytics | null
  performance: PerformanceMetrics | null
}

export function MetricsOverview({
  analytics,
  performance,
}: MetricsOverviewProps) {
  const cards = [
    {
      title: "Consultas (7d)",
      value: analytics?.queries7d ?? 0,
      subtitle: `${analytics?.queries30d ?? 0} ultimos 30d`,
      icon: MessageSquare,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Tasa KB",
      value: `${analytics?.kbPercent ?? 0}%`,
      subtitle: "Respuestas desde knowledge base",
      icon: Brain,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Satisfaccion",
      value: `${analytics?.satisfactionPercent ?? 0}%`,
      subtitle: "Feedback positivo",
      icon: ThumbsUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Latencia p95",
      value: performance ? `${performance.p95}ms` : "—",
      subtitle: performance
        ? `p50: ${performance.p50}ms · avg: ${performance.avgMs}ms`
        : "Sin datos",
      icon: Clock,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}
            >
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
