import { authFetch } from "@/utils/auth-fetch"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TrialBalanceRow {
  accountId: number
  accountCode: string
  accountName: string
  accountType: string
  debit: number
  credit: number
  debitBalance: number
  creditBalance: number
}

export interface TrialBalanceResponse {
  rows: TrialBalanceRow[]
  totals: {
    debit: number
    credit: number
    debitBalance: number
    creditBalance: number
  }
}

export interface TrialBalanceFilters {
  from?: string
  to?: string
}

/* ------------------------------------------------------------------ */
/*  Fetch                                                              */
/* ------------------------------------------------------------------ */

export async function fetchTrialBalance(
  filters: TrialBalanceFilters = {},
): Promise<TrialBalanceResponse> {
  const params = new URLSearchParams()
  if (filters.from) params.append("from", filters.from)
  if (filters.to) params.append("to", filters.to)

  const qs = params.toString()
  const res = await authFetch(
    `/accounting/journal-entries/trial-balance${qs ? `?${qs}` : ""}`,
    { cache: "no-store" },
  )

  if (!res.ok) {
    let msg = "Error al obtener el balance de comprobación"
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

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ACTIVO: "Activo",
  PASIVO: "Pasivo",
  PATRIMONIO: "Patrimonio",
  INGRESO: "Ingreso",
  GASTO: "Gasto",
}
