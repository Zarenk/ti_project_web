import { authFetch } from "@/utils/auth-fetch"

const BASE = "/api/complaints"

export interface ComplaintItem {
  id: number
  correlativeNumber: string
  year: number
  trackingCode: string
  status: string
  consumerName: string
  consumerDocType: string
  consumerDocNumber: string
  consumerEmail: string
  consumerPhone: string | null
  complaintType: string
  goodType: string
  detail: string
  consumerRequest: string
  goodDescription: string
  claimedAmount: number | null
  amountCurrency: string
  createdAt: string
  deadlineDate: string
  responseText: string | null
  responseDate: string | null
  respondedByUserId: number | null
  providerLegalName: string
  providerRuc: string
  providerAddress: string
  remainingBusinessDays: number
  reclassified: boolean
  // Consumer extra
  consumerAddress: string | null
  isMinor: boolean
  parentName: string | null
  respondedBy?: { id: number; username: string; email: string } | null
}

export interface ComplaintListResponse {
  data: ComplaintItem[]
  total: number
  page: number
  pageSize: number
}

export interface ComplaintStats {
  total: number
  pending: number
  responded: number
  overdue: number
}

export async function getComplaints(
  filters: Record<string, string | number | undefined> = {}
): Promise<ComplaintListResponse> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v))
  })

  const res = await authFetch(`${BASE}?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al cargar reclamaciones")
  }
  return res.json()
}

export async function getComplaintDetail(
  id: number
): Promise<ComplaintItem> {
  const res = await authFetch(`${BASE}/${id}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al cargar detalle")
  }
  return res.json()
}

export async function respondComplaint(
  id: number,
  responseText: string
): Promise<ComplaintItem> {
  const res = await authFetch(`${BASE}/${id}/respond`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responseText }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al responder reclamo")
  }
  return res.json()
}

export async function reclassifyComplaint(
  id: number
): Promise<ComplaintItem> {
  const res = await authFetch(`${BASE}/${id}/reclassify`, {
    method: "PATCH",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al reclasificar")
  }
  return res.json()
}

export async function getComplaintStats(): Promise<ComplaintStats> {
  const res = await authFetch(`${BASE}/stats`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al cargar estadísticas")
  }
  return res.json()
}

export async function exportComplaintsCsv(
  filters: Record<string, string | undefined> = {}
): Promise<void> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v)
  })

  const res = await authFetch(`${BASE}/export?${params}`)
  if (!res.ok) throw new Error("Error al exportar")

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "libro-reclamaciones.csv"
  a.click()
  URL.revokeObjectURL(url)
}
