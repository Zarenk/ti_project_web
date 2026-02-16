"use client"

import { useEffect, useState } from "react"
import { Bell, X, ChevronDown, ChevronUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import {
  fetchCompanyVerticalNotifications,
  type VerticalNotification,
} from "./tenancy.api"

interface VerticalNotificationsBannerProps {
  companyId: number
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Hace un momento"
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays}d`

  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
  })
}

const getVerticalColor = (vertical: string) => {
  const colors: Record<string, string> = {
    GENERAL: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    RESTAURANTS: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    RETAIL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    SERVICES: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    MANUFACTURING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    COMPUTERS: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  }
  return colors[vertical] || colors.GENERAL
}

const getVerticalLabel = (vertical: string) => {
  const labels: Record<string, string> = {
    GENERAL: "General",
    RESTAURANTS: "Restaurantes",
    RETAIL: "Retail",
    SERVICES: "Servicios",
    MANUFACTURING: "Manufactura",
    COMPUTERS: "Computación",
  }
  return labels[vertical] || vertical
}

export function VerticalNotificationsBanner({
  companyId,
}: VerticalNotificationsBannerProps) {
  const [notifications, setNotifications] = useState<VerticalNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true)
      try {
        const data = await fetchCompanyVerticalNotifications(companyId)
        // Only show last 5 notifications
        setNotifications(data.notifications.slice(0, 5))
      } catch (err) {
        console.error("Error loading notifications:", err)
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    void loadNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [companyId])

  if (loading || notifications.length === 0 || dismissed) {
    return null
  }

  const latestNotification = notifications[0]
  const hasMore = notifications.length > 1

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <Bell className="size-4 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1 space-y-2">
            {/* Latest Notification */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {latestNotification.message}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={getVerticalColor(
                      latestNotification.metadata.previousVertical,
                    )}
                  >
                    {getVerticalLabel(latestNotification.metadata.previousVertical)}
                  </Badge>
                  <span className="text-xs text-blue-600 dark:text-blue-400">→</span>
                  <Badge
                    variant="secondary"
                    className={getVerticalColor(latestNotification.metadata.newVertical)}
                  >
                    {getVerticalLabel(latestNotification.metadata.newVertical)}
                  </Badge>
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {formatDate(latestNotification.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="h-6 px-2 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/40"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="size-4" />
                        <span className="ml-1 text-xs">Ocultar</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-4" />
                        <span className="ml-1 text-xs">
                          {notifications.length - 1} más
                        </span>
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDismissed(true)}
                  className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/40"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Expanded Notifications */}
            {expanded && hasMore && (
              <div className="space-y-2 border-t border-blue-200 pt-2 dark:border-blue-800/50">
                {notifications.slice(1).map((notification) => (
                  <div key={notification.id} className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        {notification.message}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${getVerticalColor(
                            notification.metadata.previousVertical,
                          )}`}
                        >
                          {getVerticalLabel(notification.metadata.previousVertical)}
                        </Badge>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400">
                          →
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${getVerticalColor(
                            notification.metadata.newVertical,
                          )}`}
                        >
                          {getVerticalLabel(notification.metadata.newVertical)}
                        </Badge>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
