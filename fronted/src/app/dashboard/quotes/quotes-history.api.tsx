"use client"

import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

export type QuoteHistoryItem = {
  id: number
  quoteNumber: string | null
  status: "DRAFT" | "ISSUED" | "CANCELLED"
  createdAt: string
  issuedAt: string | null
  currency: string
  total: number
  clientNameSnapshot: string | null
  lastEventCode?: string | null
  lastEventAt?: string | null
}

export type QuoteHistoryFilters = {
  status?: string
  q?: string
  from?: string
  to?: string
}

export type QuoteHistoryEvent = {
  id: string
  createdAt: string
  actorEmail: string | null
  actorId: number | null
  action: string
  eventCode: string | null
  summary: string | null
  diff: Record<string, unknown> | null
}

export async function getQuotesHistory(filters: QuoteHistoryFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.q) params.set("q", filters.q)
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  const query = params.toString()
  const res = await authFetch(`/quotes${query ? `?${query}` : ""}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    if (res.status === 401) throw new UnauthenticatedError()
    throw new Error("No se pudo cargar el historial de cotizaciones.")
  }
  return (await res.json()) as QuoteHistoryItem[]
}

export async function getQuoteEvents(id: number) {
  const res = await authFetch(`/quotes/${id}/events`, {
    cache: "no-store",
  })
  if (!res.ok) {
    if (res.status === 401) throw new UnauthenticatedError()
    throw new Error("No se pudo cargar los eventos de la cotización.")
  }
  return (await res.json()) as QuoteHistoryEvent[]
}
