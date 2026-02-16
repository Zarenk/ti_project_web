"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authFetch } from "@/utils/auth-fetch"

/**
 * FASE 3.4: Help System Analytics Dashboard
 *
 * Displays comprehensive analytics for the help system:
 * - Query volume (7d, 30d)
 * - Knowledge base hit rate
 * - User satisfaction
 * - Top unanswered questions
 * - Questions with negative feedback
 * - Pending candidates for promotion
 */

interface AnalyticsData {
  queries7d: number
  queries30d: number
  kbPercent: number
  satisfactionPercent: number
  topUnanswered: Array<{ question: string; count: number; section: string }>
  topNegative: Array<{ question: string; answer: string; negCount: number; section: string }>
  candidates: Array<{
    id: number
    question: string
    answer: string
    section: string
    positiveVotes: number
    negativeVotes: number
    createdAt: string
  }>
}

export function HelpAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    setLoading(true)
    setError(null)

    try {
      const res = await authFetch("/help/admin/analytics")
      if (!res.ok) {
        throw new Error("No tienes permisos para ver analytics")
      }

      const data = await res.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar analytics")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Cargando analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">📊 Analytics del Sistema de Ayuda</h2>
        <p className="text-sm text-muted-foreground">
          Monitoreo de rendimiento y satisfacción del usuario
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Consultas (7 días)</CardDescription>
            <CardTitle className="text-3xl">{analytics.queries7d}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {analytics.queries30d} en últimos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasa de KB Hit</CardDescription>
            <CardTitle className="text-3xl">{analytics.kbPercent}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {analytics.kbPercent >= 70 ? "✅ Excelente" : analytics.kbPercent >= 50 ? "⚠️ Mejorable" : "❌ Bajo"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Satisfacción</CardDescription>
            <CardTitle className="text-3xl">{analytics.satisfactionPercent}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {analytics.satisfactionPercent >= 80 ? "😊 Muy buena" : analytics.satisfactionPercent >= 60 ? "🙂 Aceptable" : "😞 Necesita mejora"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Candidatos Pendientes</CardDescription>
            <CardTitle className="text-3xl">{analytics.candidates.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {analytics.candidates.length > 0 ? "⏳ Requieren revisión" : "✅ Todo al día"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Unanswered Questions */}
      <Card>
        <CardHeader>
          <CardTitle>❓ Preguntas más frecuentes sin respuesta en KB</CardTitle>
          <CardDescription>
            Estas preguntas usan IA porque no están en la base de conocimiento estática
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topUnanswered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ✅ No hay preguntas sin respuesta registradas
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.topUnanswered.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between border-b pb-2 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.question}</p>
                    <p className="text-xs text-muted-foreground">
                      Sección: {item.section} • {item.count} {item.count === 1 ? "vez" : "veces"}
                    </p>
                  </div>
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Negative Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>👎 Respuestas con feedback negativo</CardTitle>
          <CardDescription>
            Estas respuestas recibieron feedback negativo y deben ser revisadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topNegative.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ✅ No hay feedback negativo reciente
            </p>
          ) : (
            <div className="space-y-4">
              {analytics.topNegative.map((item, idx) => (
                <div key={idx} className="space-y-2 border-b pb-3 last:border-0">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">P: {item.question}</p>
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                      👎 {item.negCount}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    R: {item.answer.slice(0, 150)}
                    {item.answer.length > 150 ? "..." : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Sección: {item.section}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Candidates */}
      {analytics.candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>⏳ Candidatos para promoción a KB</CardTitle>
            <CardDescription>
              Respuestas de IA que recibieron suficiente feedback positivo y esperan revisión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.candidates.map((candidate) => (
                <div key={candidate.id} className="space-y-2 border-b pb-3 last:border-0">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">P: {candidate.question}</p>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                        👍 {candidate.positiveVotes}
                      </span>
                      {candidate.negativeVotes > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                          👎 {candidate.negativeVotes}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    R: {candidate.answer.slice(0, 200)}
                    {candidate.answer.length > 200 ? "..." : ""}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Sección: {candidate.section} •{" "}
                      {new Date(candidate.createdAt).toLocaleDateString("es-ES")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                        onClick={() => handleApproveCandidate(candidate.id)}
                      >
                        ✅ Aprobar
                      </button>
                      <button
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                        onClick={() => handleRejectCandidate(candidate.id)}
                      >
                        ❌ Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadAnalytics}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          🔄 Actualizar datos
        </button>
      </div>
    </div>
  )

  async function handleApproveCandidate(id: number) {
    try {
      const res = await authFetch(`/help/admin/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      })

      if (!res.ok) throw new Error("Error al aprobar candidato")

      // Reload analytics
      loadAnalytics()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al aprobar candidato")
    }
  }

  async function handleRejectCandidate(id: number) {
    try {
      const res = await authFetch(`/help/admin/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      })

      if (!res.ok) throw new Error("Error al rechazar candidato")

      // Reload analytics
      loadAnalytics()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al rechazar candidato")
    }
  }
}
