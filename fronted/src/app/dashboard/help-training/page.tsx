"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  RefreshCw,
  BarChart3,
  GraduationCap,
  ClipboardCheck,
  Activity,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

import {
  getHelpAnalytics,
  getHelpPerformance,
  getLearningSessions,
  triggerAnalysis,
} from "./help-training.api"
import type {
  HelpAnalytics,
  PerformanceMetrics,
  LearningSession,
} from "./help-training.api"

import { MetricsOverview } from "./components/metrics-overview"
import { TrainingPanel } from "./components/training-panel"
import { CandidatesReview } from "./components/candidates-review"
import { PerformanceChart } from "./components/performance-chart"
import { LearningSessionsTable } from "./components/learning-sessions-table"

export default function HelpTrainingPage() {
  const [analytics, setAnalytics] = useState<HelpAnalytics | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [sessions, setSessions] = useState<LearningSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [analyticsData, perfData, sessionsData] = await Promise.allSettled([
        getHelpAnalytics(),
        getHelpPerformance(7),
        getLearningSessions(),
      ])

      if (analyticsData.status === "fulfilled") setAnalytics(analyticsData.value)
      if (perfData.status === "fulfilled") setPerformance(perfData.value)
      if (sessionsData.status === "fulfilled") setSessions(sessionsData.value)
    } catch {
      toast.error("Error al cargar datos del panel IA")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleRefresh() {
    setRefreshing(true)
    loadData()
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      await triggerAnalysis()
      toast.success("Análisis de patrones completado")
      loadData()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al ejecutar análisis",
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const pendingCount =
    analytics?.candidates.filter((c) => c.status === "PENDING").length ?? 0

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Brain className="h-6 w-6" />
            Entrenamiento IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitorea, entrena y mejora el asistente inteligente
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            Analizar patrones
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Metrics cards */}
      <MetricsOverview analytics={analytics} performance={performance} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="inline-flex w-full min-w-max gap-1 rounded-lg bg-muted/60 p-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-1.5">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Entrenamiento</span>
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Candidatos</span>
            {pendingCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 min-w-5 px-1 text-[10px]"
              >
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Rendimiento</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-4">
          {/* Top unanswered */}
          {analytics && analytics.topUnanswered.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Preguntas sin respuesta (top)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topUnanswered.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.question}</p>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {item.section}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="ml-2 shrink-0">
                        {item.count}x
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top negative feedback */}
          {analytics && analytics.topNegative.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Respuestas con feedback negativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topNegative.map((item, i) => (
                    <div key={i} className="rounded-md border p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{item.question}</p>
                        <Badge variant="destructive" className="ml-2 shrink-0">
                          {item.count}x
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.answer}
                      </p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {item.section}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sessions */}
          <LearningSessionsTable sessions={sessions.slice(0, 50)} />
        </TabsContent>

        {/* Tab: Entrenamiento */}
        <TabsContent value="training">
          <TrainingPanel onEntryAdded={handleRefresh} />
        </TabsContent>

        {/* Tab: Candidatos */}
        <TabsContent value="candidates">
          <CandidatesReview
            candidates={analytics?.candidates ?? []}
            onReviewed={handleRefresh}
          />
        </TabsContent>

        {/* Tab: Rendimiento */}
        <TabsContent value="performance">
          <PerformanceChart performance={performance} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
