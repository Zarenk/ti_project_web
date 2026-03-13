"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  getArbiterStatus,
  triggerArbiterRun,
  cancelArbiterRun,
} from "../help-training.api"
import type { ArbiterStatus } from "../help-training.api"

interface ArbiterPanelProps {
  onComplete?: () => void
}

export function ArbiterPanel({ onComplete }: ArbiterPanelProps) {
  const [status, setStatus] = useState<ArbiterStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasRunningRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getArbiterStatus()
      setStatus(data)

      // Detect transition from running → stopped
      if (wasRunningRef.current && !data.isRunning) {
        wasRunningRef.current = false
        if (data.currentStep?.startsWith("Error")) {
          toast.error("El árbitro terminó con error")
        } else {
          toast.success(
            `Árbitro completado: ${data.autoApprovedCount} aprobados, ${data.autoRejectedCount} rechazados`,
          )
        }
        onComplete?.()
      }

      wasRunningRef.current = data.isRunning
    } catch {
      // Silently fail on status poll
    } finally {
      setLoading(false)
    }
  }, [onComplete])

  // Initial load
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Polling when running
  useEffect(() => {
    if (status?.isRunning) {
      intervalRef.current = setInterval(fetchStatus, 2000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [status?.isRunning, fetchStatus])

  async function handleRun() {
    try {
      await triggerArbiterRun()
      wasRunningRef.current = true
      // Start polling immediately
      const data = await getArbiterStatus()
      setStatus(data)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al iniciar el árbitro",
      )
    }
  }

  async function handleCancel() {
    try {
      await cancelArbiterRun()
      toast.info("Cancelación solicitada")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al cancelar",
      )
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const progressPercent = status
    ? (status.completedSteps.length / status.totalSteps) * 100
    : 0

  const lastRunLabel = status?.lastRun
    ? formatRelativeTime(new Date(status.lastRun))
    : "Nunca"

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Árbitro de Calidad
          </CardTitle>
          {status?.isRunning ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="cursor-pointer text-destructive hover:text-destructive"
            >
              <Square className="mr-1.5 h-3.5 w-3.5" />
              Detener
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleRun}
              className="cursor-pointer"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Ejecutar Análisis
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Running state */}
        {status?.isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {status.currentStep}
              </span>
              <span className="font-medium">
                {status.completedSteps.length}/{status.totalSteps}
              </span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2 transition-all duration-300"
            />
            {status.processedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {status.processedCount} candidatos procesados
              </p>
            )}
          </div>
        )}

        {/* Stats grid */}
        {!status?.isRunning && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                label="Auto-aprobados"
                value={status?.autoApprovedCount ?? 0}
              />
              <StatCard
                icon={<XCircle className="h-4 w-4 text-red-500" />}
                label="Auto-rechazados"
                value={status?.autoRejectedCount ?? 0}
              />
              <StatCard
                icon={<Clock className="h-4 w-4 text-amber-500" />}
                label="Procesados"
                value={status?.processedCount ?? 0}
              />
              <StatCard
                icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
                label="Degradados"
                value={status?.degradedCount ?? 0}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Última ejecución: {lastRunLabel}
                {status?.lastDuration != null && ` (${status.lastDuration}s)`}
              </span>
              <span>Se ejecuta automáticamente a las 3:00 AM</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-lg font-semibold">{value}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Hace un momento"
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `Hace ${days}d`
}
