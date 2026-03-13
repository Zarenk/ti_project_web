const BASE = "/api/public/complaints"

export interface CompanyComplaintInfo {
  name: string
  ruc: string
  address: string
}

export interface ComplaintSubmitResult {
  id: number
  correlativeNumber: string
  trackingCode: string
  createdAt: string
  deadlineDate: string
}

export interface ComplaintStatusResult {
  correlativeNumber: string
  trackingCode: string
  status: string
  complaintType: string
  createdAt: string
  deadlineDate: string
  responseText: string | null
  responseDate: string | null
  providerLegalName: string
  remainingBusinessDays: number
}

export async function getCompanyForComplaint(
  slug: string
): Promise<CompanyComplaintInfo> {
  const res = await fetch(`${BASE}/company/${encodeURIComponent(slug)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Empresa no encontrada")
  }
  return res.json()
}

export async function submitComplaint(
  slug: string,
  data: Record<string, unknown>
): Promise<ComplaintSubmitResult> {
  const res = await fetch(`${BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, ...data }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al enviar el reclamo")
  }
  return res.json()
}

export async function lookupComplaintStatus(
  trackingCode: string
): Promise<ComplaintStatusResult> {
  const res = await fetch(
    `${BASE}/status/${encodeURIComponent(trackingCode)}`
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Reclamo no encontrado")
  }
  return res.json()
}
