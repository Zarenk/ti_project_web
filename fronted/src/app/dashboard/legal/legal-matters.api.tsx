import { BACKEND_URL } from "@/lib/utils"
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

export interface LegalMatter {
  id: number
  title: string
  internalCode: string | null
  externalCode: string | null
  description: string | null
  area: string
  status: string
  priority: string
  court: string | null
  judge: string | null
  jurisdiction: string | null
  caseValue: number | null
  currency: string
  openedAt: string
  closedAt: string | null
  nextDeadline: string | null
  assignedToId: number | null
  clientId: number | null
  createdById: number | null
  createdAt: string
  updatedAt: string
  assignedTo?: { id: number; username: string; email: string } | null
  client?: { id: number; name: string; typeNumber: string | null } | null
  _count?: {
    documents: number
    events: number
    parties: number
    notes: number
  }
}

export interface LegalMatterDetail extends LegalMatter {
  createdBy?: { id: number; username: string } | null
  parties: LegalMatterParty[]
  documents: LegalDocument[]
  events: LegalEvent[]
  timeEntries: LegalTimeEntry[]
  notes: LegalNote[]
}

export interface LegalMatterParty {
  id: number
  matterId: number
  role: string
  name: string
  documentType: string | null
  documentNumber: string | null
  email: string | null
  phone: string | null
  address: string | null
  lawyerName: string | null
  notes: string | null
}

export interface LegalDocument {
  id: number
  matterId: number
  type: string
  title: string
  description: string | null
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  version: number
  createdAt: string
  uploadedBy?: { id: number; username: string } | null
}

export interface LegalEvent {
  id: number
  matterId: number
  type: string
  status: string
  title: string
  description: string | null
  location: string | null
  scheduledAt: string
  endAt: string | null
  reminderAt: string | null
  completedAt: string | null
  assignedTo?: { id: number; username: string } | null
}

export interface LegalTimeEntry {
  id: number
  matterId: number
  description: string
  hours: number
  rate: number | null
  amount: number | null
  billable: boolean
  date: string
  user?: { id: number; username: string } | null
}

export interface LegalNote {
  id: number
  matterId: number
  content: string
  isPrivate: boolean
  createdAt: string
  createdBy?: { id: number; username: string } | null
}

export interface LegalStats {
  total: number
  active: number
  closed: number
  upcomingEvents: number
}

export interface LegalEventWithMatter extends LegalEvent {
  matter?: { id: number; title: string; internalCode: string | null }
}

export interface CalendarNote {
  id: number
  date: string
  content: string
  color: string | null
  reminderAt: string | null
  reminderSent: boolean
  isPrivate: boolean
  createdById: number | null
  createdBy?: { id: number; username: string } | null
  createdAt: string
}

export interface LegalDocumentWithMatter extends LegalDocument {
  matter?: { id: number; title: string; internalCode: string | null }
}

export async function getLegalMatters(filters?: {
  status?: string
  area?: string
  search?: string
}): Promise<LegalMatter[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.area) params.set("area", filters.area)
    if (filters?.search) params.set("search", filters.search)

    const qs = params.toString()
    const url = `${BACKEND_URL}/api/legal-matters${qs ? `?${qs}` : ""}`

    const res = await authFetch(url, { cache: "no-store" })
    if (!res.ok) {
      throw new Error("Error al obtener los expedientes")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return []
    throw error
  }
}

export async function getLegalMatter(id: number): Promise<LegalMatterDetail> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-matters/${id}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al obtener el expediente")
  }
  return res.json()
}

export async function getLegalStats(): Promise<LegalStats> {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/legal-matters/stats`, {
      cache: "no-store",
    })
    if (!res.ok) throw new Error("Error al obtener estadísticas")
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { total: 0, active: 0, closed: 0, upcomingEvents: 0 }
    }
    throw error
  }
}

export async function createLegalMatter(data: {
  title: string
  description?: string
  area?: string
  priority?: string
  court?: string
  judge?: string
  jurisdiction?: string
  caseValue?: number
  currency?: string
  clientId?: number
  assignedToId?: number
  internalCode?: string
  externalCode?: string
  parties?: {
    name: string
    role?: string
    documentNumber?: string
    email?: string
    phone?: string
  }[]
}): Promise<LegalMatter> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-matters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al crear el expediente")
  }
  return res.json()
}

export async function updateLegalMatter(
  id: number,
  data: Record<string, unknown>,
): Promise<LegalMatter> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-matters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al actualizar el expediente")
  }
  return res.json()
}

export async function deleteLegalMatter(id: number): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-matters/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al eliminar el expediente")
  }
}

// ── Documents ─────────────────────────────────────────

export function getLegalDocumentDownloadUrl(docId: number): string {
  return `${BACKEND_URL}/api/legal-documents/${docId}/download`
}

export async function downloadLegalDocument(docId: number): Promise<void> {
  const res = await authFetch(
    `${BACKEND_URL}/api/legal-documents/${docId}/download`,
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al descargar el documento")
  }
  const blob = await res.blob()
  const contentDisposition = res.headers.get("content-disposition")
  let fileName = `documento-${docId}`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match) fileName = decodeURIComponent(match[1])
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function uploadLegalDocument(
  matterId: number,
  file: File,
  metadata: { title: string; description?: string; type?: string },
): Promise<LegalDocument> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("matterId", String(matterId))
  formData.append("title", metadata.title)
  if (metadata.description) formData.append("description", metadata.description)
  if (metadata.type) formData.append("type", metadata.type)

  const res = await authFetch(`${BACKEND_URL}/api/legal-documents/upload`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al subir el documento")
  }
  return res.json()
}

export async function updateLegalDocument(
  id: number,
  data: { title?: string; description?: string; type?: string },
): Promise<LegalDocument> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al actualizar el documento")
  }
  return res.json()
}

export async function deleteLegalDocument(id: number): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-documents/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al eliminar el documento")
  }
}

// ── Events ────────────────────────────────────────────

export async function createLegalEvent(data: {
  matterId: number
  title: string
  type?: string
  description?: string
  location?: string
  scheduledAt: string
  endAt?: string
  reminderAt?: string
  assignedToId?: number
}): Promise<LegalEvent> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al crear el evento")
  }
  return res.json()
}

export async function updateLegalEvent(
  id: number,
  data: Record<string, unknown>,
): Promise<LegalEvent> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al actualizar el evento")
  }
  return res.json()
}

export async function deleteLegalEvent(id: number): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-events/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al eliminar el evento")
  }
}

// ── Notes ─────────────────────────────────────────────

export async function createLegalNote(data: {
  matterId: number
  content: string
  isPrivate?: boolean
}): Promise<LegalNote> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-events/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al crear la nota")
  }
  return res.json()
}

export async function updateLegalNote(
  id: number,
  data: { content?: string; isPrivate?: boolean },
): Promise<LegalNote> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-events/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al actualizar la nota")
  }
  return res.json()
}

export async function deleteLegalNote(id: number): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-events/notes/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al eliminar la nota")
  }
}

// ── Time Entries ──────────────────────────────────────

export async function createLegalTimeEntry(data: {
  matterId: number
  description: string
  hours: number
  rate?: number
  billable?: boolean
  date?: string
}): Promise<LegalTimeEntry> {
  const res = await authFetch(`${BACKEND_URL}/api/legal-events/time-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al crear registro de horas")
  }
  return res.json()
}

export async function updateLegalTimeEntry(
  id: number,
  data: { description?: string; hours?: number; rate?: number | null; billable?: boolean; date?: string },
): Promise<LegalTimeEntry> {
  const res = await authFetch(
    `${BACKEND_URL}/api/legal-events/time-entries/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al actualizar registro de horas")
  }
  return res.json()
}

export async function deleteLegalTimeEntry(id: number): Promise<void> {
  const res = await authFetch(
    `${BACKEND_URL}/api/legal-events/time-entries/${id}`,
    { method: "DELETE" },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al eliminar registro de horas")
  }
}

// ── Parties ──────────────────────────────────────────

export async function addLegalParty(
  matterId: number,
  data: {
    name: string
    role?: string
    documentType?: string
    documentNumber?: string
    email?: string
    phone?: string
    address?: string
    lawyerName?: string
    notes?: string
  },
): Promise<LegalMatterParty> {
  const res = await authFetch(
    `${BACKEND_URL}/api/legal-matters/${matterId}/parties`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al agregar la parte")
  }
  return res.json()
}

export async function updateLegalParty(
  matterId: number,
  partyId: number,
  data: Record<string, unknown>,
): Promise<LegalMatterParty> {
  const res = await authFetch(
    `${BACKEND_URL}/api/legal-matters/${matterId}/parties/${partyId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al actualizar la parte")
  }
  return res.json()
}

export async function deleteLegalParty(
  matterId: number,
  partyId: number,
): Promise<void> {
  const res = await authFetch(
    `${BACKEND_URL}/api/legal-matters/${matterId}/parties/${partyId}`,
    { method: "DELETE" },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al eliminar la parte")
  }
}

// ── Cross-matter queries ──────────────────────────────

export async function getAllLegalEvents(filters?: {
  status?: string
  from?: string
  to?: string
}): Promise<LegalEventWithMatter[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.from) params.set("from", filters.from)
    if (filters?.to) params.set("to", filters.to)

    const qs = params.toString()
    const url = `${BACKEND_URL}/api/legal-events${qs ? `?${qs}` : ""}`

    const res = await authFetch(url, { cache: "no-store" })
    if (!res.ok) throw new Error("Error al obtener los eventos")
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return []
    throw error
  }
}

export async function getAllLegalDocuments(filters?: {
  type?: string
  search?: string
}): Promise<LegalDocumentWithMatter[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.type) params.set("type", filters.type)
    if (filters?.search) params.set("search", filters.search)

    const qs = params.toString()
    const url = `${BACKEND_URL}/api/legal-documents${qs ? `?${qs}` : ""}`

    const res = await authFetch(url, { cache: "no-store" })
    if (!res.ok) throw new Error("Error al obtener los documentos")
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return []
    throw error
  }
}

// ── Calendar Notes (independent, not tied to matters) ──

export async function getCalendarNotes(
  from: string,
  to: string,
): Promise<CalendarNote[]> {
  try {
    const params = new URLSearchParams({ from, to })
    const url = `${BACKEND_URL}/api/legal-events/calendar-notes?${params}`

    const res = await authFetch(url, { cache: "no-store" })
    if (!res.ok) throw new Error("Error al obtener notas del calendario")
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) return []
    throw error
  }
}

export async function createCalendarNote(data: {
  date: string
  content: string
  color?: string
  reminderAt?: string
  isPrivate?: boolean
}): Promise<CalendarNote> {
  const res = await authFetch(
    `${BACKEND_URL}/api/legal-events/calendar-notes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al crear nota del calendario")
  }
  return res.json()
}

export async function updateCalendarNote(
  id: number,
  data: {
    content?: string
    color?: string
    reminderAt?: string | null
    isPrivate?: boolean
  },
): Promise<CalendarNote> {
  const res = await authFetch(
    `${BACKEND_URL}/api/legal-events/calendar-notes/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al actualizar nota del calendario")
  }
  return res.json()
}

export async function deleteCalendarNote(id: number): Promise<void> {
  const res = await authFetch(
    `${BACKEND_URL}/api/legal-events/calendar-notes/${id}`,
    { method: "DELETE" },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Error al eliminar nota del calendario")
  }
}
