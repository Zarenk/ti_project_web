"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Brain,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Lightbulb,
  BarChart3,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import {
  generateLearningInsights,
  getSuggestedAliases,
  getSuggestedEntries,
  getLearningSession,
  getPromotedAnswers,
  exportLearningData,
  clearLearningData,
  analyzePatternsAndSuggest,
  type SuggestedAlias,
  type SuggestedEntry,
  type PromotedAnswer,
} from "@/data/help/adaptive-learning"

export function HelpLearningDashboard() {
  const [insights, setInsights] = useState<ReturnType<typeof generateLearningInsights> | null>(null)
  const [suggestedAliases, setSuggestedAliases] = useState<SuggestedAlias[]>([])
  const [suggestedEntries, setSuggestedEntries] = useState<SuggestedEntry[]>([])
  const [promotedAnswers, setPromotedAnswers] = useState<PromotedAnswer[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setLoading(true)
    try {
      setInsights(generateLearningInsights())
      setSuggestedAliases(getSuggestedAliases())
      setSuggestedEntries(getSuggestedEntries())
      setPromotedAnswers(getPromotedAnswers())
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = () => {
    analyzePatternsAndSuggest()
    loadData()
  }

  const handleExport = () => {
    const data = exportLearningData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `help-learning-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    if (confirm("¿Estás seguro de que quieres limpiar todos los datos de aprendizaje?")) {
      clearLearningData()
      loadData()
    }
  }

  if (!insights) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Sistema de Auto-Aprendizaje
          </h1>
          <p className="text-muted-foreground">
            Mejora continua del asistente de ayuda basada en interacciones reales
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAnalyze} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Analizar Patrones
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Datos
          </Button>
          <Button onClick={handleClear} variant="destructive" size="sm">
            Limpiar Datos
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interacciones</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              Sesiones registradas para análisis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Fallos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(insights.failureRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Preguntas sin respuesta adecuada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejoras Sugeridas</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.suggestedImprovements}</div>
            <p className="text-xs text-muted-foreground">
              {insights.pendingReviewCount} pendientes de revisión
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Velocidad de Aprendizaje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.learningVelocity}</div>
            <p className="text-xs text-muted-foreground">
              Mejoras en los últimos 7 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="failed-queries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="failed-queries">
            <AlertCircle className="h-4 w-4 mr-2" />
            Queries Fallidas
          </TabsTrigger>
          <TabsTrigger value="suggested-aliases">
            <CheckCircle className="h-4 w-4 mr-2" />
            Aliases Sugeridos ({suggestedAliases.length})
          </TabsTrigger>
          <TabsTrigger value="suggested-entries">
            <Lightbulb className="h-4 w-4 mr-2" />
            Nuevas Entradas ({suggestedEntries.length})
          </TabsTrigger>
          <TabsTrigger value="promoted-answers">
            <ThumbsUp className="h-4 w-4 mr-2" />
            Respuestas Promovidas ({promotedAnswers.length})
          </TabsTrigger>
        </TabsList>

        {/* Failed Queries */}
        <TabsContent value="failed-queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Preguntas sin Respuesta</CardTitle>
              <CardDescription>
                Preguntas más frecuentes que no obtuvieron respuesta adecuada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {insights.topFailedQueries.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{item.query}</p>
                        <p className="text-xs text-muted-foreground">
                          Frecuencia: {item.count} veces
                        </p>
                      </div>
                      <Badge variant="destructive">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggested Aliases */}
        <TabsContent value="suggested-aliases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aliases Sugeridos por el Sistema</CardTitle>
              <CardDescription>
                El sistema ha detectado estas variaciones de preguntas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {suggestedAliases.map((alias, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1 flex-1">
                        <p className="font-medium">{alias.suggestedAlias}</p>
                        <p className="text-xs text-muted-foreground">
                          Para entrada: {alias.entryId} | Frecuencia: {alias.frequency} | Confianza: {(alias.confidence * 100).toFixed(0)}%
                        </p>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {alias.sources.slice(0, 3).map((source, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {alias.status === "pending" ? (
                          <>
                            <Button size="sm" variant="default">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant={alias.status === "approved" ? "default" : "destructive"}>
                            {alias.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggested Entries */}
        <TabsContent value="suggested-entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nuevas Entradas Sugeridas</CardTitle>
              <CardDescription>
                El sistema sugiere agregar estas nuevas preguntas frecuentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {suggestedEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1 flex-1">
                        <p className="font-medium">{entry.question}</p>
                        <p className="text-xs text-muted-foreground">
                          Frecuencia: {entry.frequency} veces
                        </p>
                        {entry.suggestedAnswer && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">
                            {entry.suggestedAnswer}
                          </p>
                        )}
                        <div className="flex gap-1 flex-wrap mt-1">
                          {entry.sources.slice(0, 3).map((source, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {entry.status === "pending" ? (
                          <>
                            <Button size="sm" variant="default">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant={entry.status === "approved" ? "default" : "destructive"}>
                            {entry.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promoted Answers */}
        <TabsContent value="promoted-answers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Respuestas Promovidas</CardTitle>
              <CardDescription>
                Respuestas mejoradas basadas en feedback positivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {promotedAnswers.map((answer, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Entrada: {answer.entryId}</p>
                        <Badge variant={answer.confidence >= 0.7 ? "default" : "secondary"}>
                          {(answer.confidence * 100).toFixed(0)}% confianza
                        </Badge>
                      </div>
                      <div className="text-sm space-y-2">
                        <div className="p-2 bg-muted rounded">
                          <p className="text-xs font-semibold mb-1">Respuesta Promovida:</p>
                          <p>{answer.promotedAnswer}</p>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" /> {answer.positiveVotes}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsDown className="h-3 w-3" /> {answer.negativeVotes}
                          </span>
                          <span>
                            Actualizado: {new Date(answer.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
