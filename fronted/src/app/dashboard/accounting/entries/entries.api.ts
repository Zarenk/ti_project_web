import { authFetch } from "@/utils/auth-fetch"
import { BACKEND_URL } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EntryStatus = "DRAFT" | "POSTED" | "VOID"
export type EntrySource = "SALE" | "PURCHASE" | "ADJUSTMENT" | "MANUAL"

export interface AccountOption {
  id: number
  code: string
  name: string
  accountType: string
  isPosting: boolean
  level: number
}

export interface JournalEntryLine {
  id?: number
  accountId: number
  description?: string
  debit: number
  credit: number
  account?: { id: number; code: string; name: string }
}

export interface JournalEntry {
  id: number
  date: string
  description?: string
  status: EntryStatus
  debitTotal: number
  creditTotal: number
  correlativo: string
  cuo: string
  sunatStatus: string
  source: EntrySource
  moneda: "PEN" | "USD"
  tipoCambio?: number
  organizationId?: number
  companyId?: number
  createdAt?: string
  updatedAt?: string
  lines: JournalEntryLine[]
  period?: { id: number; startDate: string; endDate: string; status?: string }
}

export interface CreateEntryPayload {
  date: string
  description?: string
  source: EntrySource
  moneda?: "PEN" | "USD"
  tipoCambio?: number
  lines: { accountId: number; description?: string; debit: number; credit: number }[]
}

export interface UpdateEntryPayload {
  date?: string
  description?: string
  lines?: { accountId: number; description?: string; debit: number; credit: number }[]
}

export interface EntryFilters {
  from?: string
  to?: string
  sources?: EntrySource[]
  statuses?: EntryStatus[]
  page?: number
  size?: number
}

export interface PaginatedEntries {
  data: JournalEntry[]
  total: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function handleResponse<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (!res.ok) {
    let msg = fallbackMsg
    try {
      const body = await res.json()
      msg = body?.message ?? body?.error ?? fallbackMsg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json()
}

/* ------------------------------------------------------------------ */
/*  Journal Entries CRUD                                               */
/* ------------------------------------------------------------------ */

export async function fetchEntries(filters: EntryFilters = {}): Promise<PaginatedEntries> {
  const params = new URLSearchParams()
  if (filters.from) params.append("from", filters.from)
  if (filters.to) params.append("to", filters.to)
  if (filters.sources?.length) params.append("sources", filters.sources.join(","))
  if (filters.statuses?.length) params.append("statuses", filters.statuses.join(","))
  if (filters.page) params.append("page", String(filters.page))
  if (filters.size) params.append("size", String(filters.size))

  const res = await authFetch(
    `${BACKEND_URL}/api/accounting/journal-entries?${params}`,
    { credentials: "include" },
  )
  return handleResponse(res, "Error al obtener asientos")
}

export async function fetchEntry(id: number): Promise<JournalEntry> {
  const res = await authFetch(
    `${BACKEND_URL}/api/accounting/journal-entries/${id}`,
    { credentials: "include" },
  )
  return handleResponse(res, "Error al obtener asiento")
}

export async function createEntry(data: CreateEntryPayload): Promise<JournalEntry> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journal-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  })
  return handleResponse(res, "Error al crear asiento")
}

export async function updateEntry(id: number, data: UpdateEntryPayload): Promise<JournalEntry> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journal-entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  })
  return handleResponse(res, "Error al actualizar asiento")
}

export async function postEntry(id: number): Promise<JournalEntry> {
  const res = await authFetch(
    `${BACKEND_URL}/api/accounting/journal-entries/${id}/post`,
    { method: "POST", credentials: "include" },
  )
  return handleResponse(res, "Error al contabilizar asiento")
}

export async function voidEntry(id: number): Promise<JournalEntry> {
  const res = await authFetch(
    `${BACKEND_URL}/api/accounting/journal-entries/${id}/void`,
    { method: "POST", credentials: "include" },
  )
  return handleResponse(res, "Error al anular asiento")
}

export async function deleteEntry(id: number): Promise<void> {
  const res = await authFetch(
    `${BACKEND_URL}/api/accounting/journal-entries/${id}`,
    { method: "DELETE", credentials: "include" },
  )
  if (!res.ok) {
    throw new Error("Error al eliminar asiento")
  }
}

/* ------------------------------------------------------------------ */
/*  Accounts (for picker / autocomplete)                               */
/* ------------------------------------------------------------------ */

export async function fetchAccounts(): Promise<AccountOption[]> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/accounts`, {
    credentials: "include",
  })
  if (!res.ok) return []

  const tree: unknown[] = await res.json()
  return flattenAccounts(tree)
}

interface RawAccountNode {
  id: number
  code: string
  name: string
  accountType: string
  isPosting?: boolean
  level?: number
  children?: RawAccountNode[]
}

function flattenAccounts(nodes: unknown[], result: AccountOption[] = []): AccountOption[] {
  for (const raw of nodes) {
    const node = raw as RawAccountNode
    result.push({
      id: node.id,
      code: node.code,
      name: node.name,
      accountType: node.accountType,
      isPosting: node.isPosting ?? false,
      level: node.level ?? 0,
    })
    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenAccounts(node.children, result)
    }
  }
  return result
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

export function formatCurrency(value: number, currency: "PEN" | "USD" = "PEN"): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatAmount(value: number): string {
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const STATUS_CONFIG = {
  DRAFT: { label: "Borrador", variant: "secondary" as const },
  POSTED: { label: "Contabilizado", variant: "default" as const },
  VOID: { label: "Anulado", variant: "destructive" as const },
} satisfies Record<EntryStatus, { label: string; variant: "secondary" | "default" | "destructive" }>

export const SOURCE_CONFIG = {
  SALE: { label: "Venta", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  PURCHASE: { label: "Compra", color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
  ADJUSTMENT: { label: "Ajuste", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  MANUAL: { label: "Manual", color: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20" },
} satisfies Record<EntrySource, { label: string; color: string }>
