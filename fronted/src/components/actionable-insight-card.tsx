"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

type InsightSeverity = "success" | "info" | "warning" | "critical" | "neutral"
type InsightType = "positive" | "negative" | "neutral" | "action-required"

interface ActionableInsightCardProps {
  /**
   * The main insight title
   */
  title: string

  /**
   * Detailed description of the insight
   */
  description: string

  /**
   * Severity level of the insight
   */
  severity?: InsightSeverity

  /**
   * Type of insight - affects icon and visual treatment
   */
  type?: InsightType

  /**
   * Optional custom icon
   */
  icon?: LucideIcon

  /**
   * Optional badge label (e.g., "NUEVO", "URGENTE")
   */
  badge?: string

  /**
   * Optional metric value to display prominently
   */
  metric?: {
    value: string
    label: string
    trend?: "up" | "down"
  }

  /**
   * Call-to-action button
   */
  action?: {
    label: string
    href?: string
    onClick?: () => void
    variant?: "default" | "outline" | "ghost"
  }

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Whether to show in compact mode
   */
  compact?: boolean
}

const severityConfig = {
  success: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    iconColor: "text-green-600",
    icon: CheckCircle2,
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600",
    icon: Info,
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
    iconColor: "text-yellow-600",
    icon: AlertTriangle,
  },
  critical: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    iconColor: "text-red-600",
    icon: AlertCircle,
  },
  neutral: {
    bg: "bg-muted/50",
    border: "border-border",
    iconColor: "text-muted-foreground",
    icon: Info,
  },
}

export function ActionableInsightCard({
  title,
  description,
  severity = "neutral",
  type = "neutral",
  icon: CustomIcon,
  badge,
  metric,
  action,
  className,
  compact = false,
}: ActionableInsightCardProps) {
  const config = severityConfig[severity]
  const Icon = CustomIcon || config.icon

  const getTrendIcon = () => {
    if (!metric?.trend) return null
    return metric.trend === "up" ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  return (
    <Card
      className={cn(
        "border-2 transition-all hover:shadow-md",
        config.bg,
        config.border,
        className
      )}
    >
      <CardContent className={cn(compact ? "p-4" : "p-5")}>
        <div className="flex gap-3">
          {/* Icon */}
          <div className={cn("flex-shrink-0", compact ? "mt-0.5" : "mt-1")}>
            <div className={cn(
              "rounded-full p-2",
              severity === "neutral" ? "bg-background" : "bg-white dark:bg-gray-800"
            )}>
              <Icon className={cn(config.iconColor, compact ? "h-4 w-4" : "h-5 w-5")} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header with badge */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className={cn(
                "font-semibold",
                compact ? "text-sm" : "text-base"
              )}>
                {title}
              </h4>
              {badge && (
                <Badge
                  variant="outline"
                  className={cn(
                    "flex-shrink-0",
                    compact && "text-xs"
                  )}
                >
                  {badge}
                </Badge>
              )}
            </div>

            {/* Description */}
            <p className={cn(
              "text-muted-foreground leading-relaxed",
              compact ? "text-xs" : "text-sm"
            )}>
              {description}
            </p>

            {/* Metric */}
            {metric && (
              <div className="mt-3 flex items-center gap-2">
                <div>
                  <div className={cn(
                    "font-bold",
                    compact ? "text-lg" : "text-2xl",
                    config.iconColor
                  )}>
                    {metric.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {metric.label}
                  </div>
                </div>
                {getTrendIcon()}
              </div>
            )}

            {/* Action Button */}
            {action && (
              <div className="mt-4">
                {action.href ? (
                  <Button
                    asChild
                    variant={action.variant || "default"}
                    size={compact ? "sm" : "default"}
                    className="w-full sm:w-auto"
                  >
                    <Link href={action.href}>
                      {action.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={action.onClick}
                    variant={action.variant || "default"}
                    size={compact ? "sm" : "default"}
                    className="w-full sm:w-auto"
                  >
                    {action.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Grid layout for multiple insight cards
 */
interface InsightCardGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  className?: string
}

export function InsightCardGrid({
  children,
  columns = 2,
  className,
}: InsightCardGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  )
}
