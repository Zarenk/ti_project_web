import { authFetch } from "@/utils/auth-fetch"

export interface HelpAnalytics {
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

export async function getHelpAnalytics(): Promise<HelpAnalytics> {
  const res = await authFetch("/help/admin/analytics")
  if (!res.ok) throw new Error("Error al cargar analytics del asistente")
  return res.json()
}

export async function reviewCandidate(
  id: number,
  status: "APPROVED" | "REJECTED",
  answer?: string,
): Promise<void> {
  const res = await authFetch(`/help/admin/candidates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...(answer ? { answer } : {}) }),
  })
  if (!res.ok) throw new Error("Error al procesar candidato")
}
