import { authFetch } from "@/utils/auth-fetch"

const BASE = "/admin/dashboard"

// ── Types ────────────────────────────────────────────────────────────────────

export interface GlobalOverview {
  totalOrgs: number
  activeOrgs: number
  totalUsers: number
  activeUsersLast7d: number
  totalCompanies: number
  subscriptions: {
    trial: number
    active: number
    pastDue: number
    canceled: number
  }
  newOrgsThisMonth: number
  newUsersThisMonth: number
  verticalBreakdown: { vertical: string; count: number }[]
}

export interface SunatOverview {
  totalTransmissions: number
  pendingTransmissions: number
  acceptedToday: number
  rejectedToday: number
  failedToday: number
  failedLast7d: number
  statusBreakdown: { status: string; count: number }[]
  recentFailed: {
    id: number
    status: string
    documentType: string
    serie: string | null
    correlativo: string | null
    errorMessage: string | null
    cdrCode: string | null
    cdrDescription: string | null
    retryCount: number
    createdAt: string
    company: { id: number; name: string } | null
    organization: { id: number; name: string } | null
  }[]
  creditNotes: { total: number; thisMonth: number }
}

export interface SecurityOverview {
  loginsToday: number
  failedLoginsToday: number
  lockedUsers: number
  recentAuditActions: number
  destructiveActionsToday: number
  auditByAction7d: { action: string; count: number }[]
  recentLogins: {
    id: string
    actorEmail: string | null
    action: string
    ip: string | null
    userAgent: string | null
    summary: string | null
    createdAt: string
    organization: { id: number; name: string } | null
  }[]
}

export interface AuditLogEntry {
  id: string
  actorId: number | null
  actorEmail: string | null
  entityType: string | null
  entityId: string | null
  action: string
  summary: string | null
  diff: unknown | null
  ip: string | null
  createdAt: string
  organization: { id: number; name: string } | null
  company: { id: number; name: string } | null
}

export interface FinancialHealth {
  totalSalesAllTime: number
  salesToday: number
  salesThisMonth: { count: number; total: number }
  salesLastMonth: { count: number; total: number }
  platformInvoices: {
    paid: { count: number; total: number }
    pending: { count: number; total: number }
    failed: { count: number; total: number }
  }
  mrr: number
  delinquentOrgs: {
    id: number
    pastDueSince: string | null
    organization: { id: number; name: string }
    plan: { name: string; price: number }
  }[]
  recentSubscriptionInvoices: {
    id: number
    status: string
    amount: number
    currency: string
    dueDate: string | null
    paidAt: string | null
    createdAt: string
    organization: { id: number; name: string }
  }[]
}

export interface SalesInventoryOverview {
  totalProducts: number
  totalInventoryItems: number
  lowStockCount: number
  totalEntries: number
  entriesToday: number
  salesBySource: { source: string; count: number; total: number }[]
  topOrgsBySales: {
    organizationId: number | null
    organizationName: string
    salesCount: number
    salesTotal: number
  }[]
}

export interface WhatsappOverview {
  totalSessions: number
  connectedSessions: number
  disconnectedSessions: number
  totalMessages: number
  totalAutomations: number
  sessionDetails: {
    id: number
    phoneNumber: string | null
    status: string
    lastConnected: string | null
    isActive: boolean
    updatedAt: string
    organization: { id: number; name: string }
    company: { id: number; name: string }
  }[]
}

export interface PlansOverview {
  plans: {
    id: number
    code: string
    name: string
    price: number
    currency: string
    interval: string
    trialDays: number | null
    totalSubscriptions: number
    statusBreakdown: { status: string; count: number }[]
  }[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function fetchGlobalOverview(): Promise<GlobalOverview> {
  const res = await authFetch(`${BASE}/global-overview`)
  if (!res.ok) throw new Error("Error al obtener resumen global")
  return res.json()
}

export async function fetchSunatOverview(): Promise<SunatOverview> {
  const res = await authFetch(`${BASE}/sunat`)
  if (!res.ok) throw new Error("Error al obtener datos SUNAT")
  return res.json()
}

export async function fetchSecurityOverview(): Promise<SecurityOverview> {
  const res = await authFetch(`${BASE}/security`)
  if (!res.ok) throw new Error("Error al obtener datos de seguridad")
  return res.json()
}

export async function fetchAuditLog(params: {
  page?: number
  limit?: number
  action?: string
  search?: string
  entityType?: string
}): Promise<PaginatedResponse<AuditLogEntry>> {
  const sp = new URLSearchParams()
  if (params.page) sp.set("page", String(params.page))
  if (params.limit) sp.set("limit", String(params.limit))
  if (params.action && params.action !== "ALL") sp.set("action", params.action)
  if (params.search) sp.set("search", params.search)
  if (params.entityType && params.entityType !== "ALL") sp.set("entityType", params.entityType)

  const res = await authFetch(`${BASE}/audit-log?${sp.toString()}`)
  if (!res.ok) throw new Error("Error al obtener log de auditoría")
  return res.json()
}

export async function fetchFinancialHealth(): Promise<FinancialHealth> {
  const res = await authFetch(`${BASE}/financial`)
  if (!res.ok) throw new Error("Error al obtener salud financiera")
  return res.json()
}

export async function fetchSalesInventoryOverview(): Promise<SalesInventoryOverview> {
  const res = await authFetch(`${BASE}/sales-inventory`)
  if (!res.ok) throw new Error("Error al obtener resumen de ventas")
  return res.json()
}

export async function fetchWhatsappOverview(): Promise<WhatsappOverview> {
  const res = await authFetch(`${BASE}/whatsapp`)
  if (!res.ok) throw new Error("Error al obtener datos WhatsApp")
  return res.json()
}

export async function fetchPlansOverview(): Promise<PlansOverview> {
  const res = await authFetch(`${BASE}/plans`)
  if (!res.ok) throw new Error("Error al obtener datos de planes")
  return res.json()
}
