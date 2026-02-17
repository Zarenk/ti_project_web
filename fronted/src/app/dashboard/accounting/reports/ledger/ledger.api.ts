import { authFetch } from "@/utils/auth-fetch"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LedgerMovement {
  id: number
  journalEntryId: number
  date: string
  description: string
  correlativo: string
  source: string
  moneda: string
  debit: number
  credit: number
  runningBalance: number
}

export interface LedgerAccount {
  accountId: number
  accountCode: string
  accountName: string
  accountType: string
  movements: LedgerMovement[]
  totalDebit: number
  totalCredit: number
  balance: number
}

export interface LedgerResponse {
  accounts: LedgerAccount[]
  totals: { debit: number; credit: number }
}

export interface LedgerFilters {
  accountId?: number
  from?: string
  to?: string
}

/* ------------------------------------------------------------------ */
/*  Fetch                                                              */
/* ------------------------------------------------------------------ */

export async function fetchLedger(filters: LedgerFilters = {}): Promise<LedgerResponse> {
  const params = new URLSearchParams()
  if (filters.accountId) params.append("accountId", String(filters.accountId))
  if (filters.from) params.append("from", filters.from)
  if (filters.to) params.append("to", filters.to)

  const qs = params.toString()
  const res = await authFetch(
    `/accounting/journal-entries/ledger${qs ? `?${qs}` : ""}`,
    { cache: "no-store" },
  )

  if (!res.ok) {
    let msg = "Error al obtener el libro mayor"
    try {
      const body = await res.json()
      msg = body?.message ?? body?.error ?? msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  return res.json()
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function formatAmount(value: number): string {
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const SOURCE_LABELS: Record<string, string> = {
  SALE: "Venta",
  PURCHASE: "Compra",
  ADJUSTMENT: "Ajuste",
  MANUAL: "Manual",
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ACTIVO: "Activo",
  PASIVO: "Pasivo",
  PATRIMONIO: "Patrimonio",
  INGRESO: "Ingreso",
  GASTO: "Gasto",
}
