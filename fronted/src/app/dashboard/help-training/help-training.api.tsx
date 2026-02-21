import { BACKEND_URL } from "@/lib/utils"
import { authFetch } from "@/utils/auth-fetch"

// ========== Types ==========

export interface HelpAnalytics {
  queries7d: number
  queries30d: number
  kbPercent: number
  satisfactionPercent: number
  topUnanswered: Array<{ question: string; count: number; section: string }>
  topNegative: Array<{
    question: string
    answer: string
    section: string
    count: number
  }>
  candidates: Array<{
    id: number
    question: string
    answer: string
    section: string
    positiveVotes: number
    negativeVotes: number
    status: string
    createdAt: string
    reviewedAt: string | null
  }>
}

export interface PerformanceMetrics {
  total: number
  p50: number
  p95: number
  p99: number
  avgMs: number
  dailyStats: Array<{
    date: string
    count: number
    avgMs: number
    p50: number
    p95: number
  }>
  bySource: Array<{
    source: string
    count: number
    avgMs: number
    percentage: number
  }>
}

export interface LearningInsights {
  totalSessions: number
  failureRate: number
  topFailedQueries: Array<{ query: string; count: number }>
  suggestedImprovements: number
  autoApprovedCount: number
  pendingReviewCount: number
  learningVelocity: number
}

export interface LearningSession {
  id: number
  userId: number
  query: string
  queryNorm: string
  section: string | null
  matchFound: boolean
  matchedFaqId: string | null
  confidence: number | null
  wasHelpful: boolean | null
  timestamp: string
  source: string | null
  responseTimeMs: number | null
}

// ========== API Functions ==========

export async function getHelpAnalytics(): Promise<HelpAnalytics> {
  const res = await authFetch(`${BACKEND_URL}/api/help/admin/analytics`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al cargar analytics")
  }
  return res.json()
}

export async function getHelpPerformance(
  days = 7,
): Promise<PerformanceMetrics> {
  const res = await authFetch(
    `${BACKEND_URL}/api/help/admin/performance?days=${days}`,
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al cargar metricas de rendimiento")
  }
  return res.json()
}

export async function getLearningInsights(): Promise<LearningInsights> {
  const res = await authFetch(`${BACKEND_URL}/api/help/learning/insights`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al cargar insights")
  }
  return res.json()
}

export async function getLearningSessions(): Promise<LearningSession[]> {
  const res = await authFetch(`${BACKEND_URL}/api/help/learning/sessions`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al cargar sesiones")
  }
  return res.json()
}

export async function reviewCandidate(
  id: number,
  status: "APPROVED" | "REJECTED",
  answer?: string,
): Promise<void> {
  const res = await authFetch(
    `${BACKEND_URL}/api/help/admin/candidates/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, answer }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al revisar candidato")
  }
}

export async function approveEntry(data: {
  question: string
  answer: string
  section: string
}): Promise<void> {
  const res = await authFetch(
    `${BACKEND_URL}/api/help/learning/entry/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al agregar entrada")
  }
}

export async function triggerAnalysis(): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/help/learning/analyze`, {
    method: "POST",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al ejecutar analisis")
  }
}
