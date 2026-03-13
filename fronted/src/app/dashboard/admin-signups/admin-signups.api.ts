import { authFetch } from "@/utils/auth-fetch"

const BASE = "/admin/signups"

// ── Types ────────────────────────────────────────────────────────────────────

export interface SignupStats {
  signupsToday: number
  signupsYesterday: number
  signupsThisWeek: number
  successToday: number
  failedToday: number
  blockedToday: number
  pendingVerification: number
  activeTrials: number
  expiringTrials: number
  totalOrgsFromSignup: number
  activeBlocklistEntries: number
}

export interface SignupAttempt {
  id: number
  email: string
  domain: string
  ip: string | null
  deviceHash: string | null
  userAgent: string | null
  status: "PENDING" | "SUCCESS" | "FAILED" | "BLOCKED"
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface TrialOrg {
  id: number
  planId: number
  organizationId: number
  status: string
  trialEndsAt: string | null
  createdAt: string
  organization: {
    id: number
    name: string
    slug: string | null
    status: string
    createdAt: string
    users: Array<{
      id: number
      email: string
      username: string
      emailVerifiedAt: string | null
      createdAt: string
    }>
    companies: Array<{
      id: number
      name: string
      businessVertical: string
    }>
  }
  plan: { code: string; name: string }
}

export interface BlocklistEntry {
  id: number
  ip: string | null
  deviceHash: string | null
  domain: string | null
  reason: string | null
  blockedUntil: string | null
  createdAt: string
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function fetchSignupStats(): Promise<SignupStats> {
  const res = await authFetch(`${BASE}/stats`)
  if (!res.ok) throw new Error("Error al obtener estadísticas")
  return res.json()
}

export async function fetchSignupAttempts(params: {
  page?: number
  limit?: number
  status?: string
  search?: string
}): Promise<PaginatedResponse<SignupAttempt>> {
  const sp = new URLSearchParams()
  if (params.page) sp.set("page", String(params.page))
  if (params.limit) sp.set("limit", String(params.limit))
  if (params.status && params.status !== "ALL") sp.set("status", params.status)
  if (params.search) sp.set("search", params.search)

  const res = await authFetch(`${BASE}/attempts?${sp.toString()}`)
  if (!res.ok) throw new Error("Error al obtener intentos de registro")
  return res.json()
}

export async function fetchTrials(params: {
  page?: number
  limit?: number
  search?: string
}): Promise<PaginatedResponse<TrialOrg>> {
  const sp = new URLSearchParams()
  if (params.page) sp.set("page", String(params.page))
  if (params.limit) sp.set("limit", String(params.limit))
  if (params.search) sp.set("search", params.search)

  const res = await authFetch(`${BASE}/trials?${sp.toString()}`)
  if (!res.ok) throw new Error("Error al obtener trials")
  return res.json()
}

export async function fetchBlocklist(params: {
  page?: number
  limit?: number
}): Promise<PaginatedResponse<BlocklistEntry>> {
  const sp = new URLSearchParams()
  if (params.page) sp.set("page", String(params.page))
  if (params.limit) sp.set("limit", String(params.limit))

  const res = await authFetch(`${BASE}/blocklist?${sp.toString()}`)
  if (!res.ok) throw new Error("Error al obtener blocklist")
  return res.json()
}

export async function removeBlocklistEntry(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/blocklist/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Error al desbloquear entrada")
}

export async function manualVerifyEmail(userId: number): Promise<void> {
  const res = await authFetch(`${BASE}/verify/${userId}`, { method: "PATCH" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.message ?? "Error al verificar email")
  }
}

export async function extendTrial(orgId: number, days: number): Promise<{ newTrialEndsAt: string }> {
  const res = await authFetch(`${BASE}/trials/${orgId}/extend`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.message ?? "Error al extender trial")
  }
  return res.json()
}
