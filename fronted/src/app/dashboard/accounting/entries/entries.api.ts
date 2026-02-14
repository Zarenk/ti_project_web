import { BACKEND_URL } from "@/lib/utils";
import { authFetch } from "@/utils/auth-fetch";

export interface AccountingEntryLine {
  account: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface AccountingEntry {
  id: string;
  provider?: string;
  date: string;
  serie?: string;
  correlativo?: string;
  invoiceUrl?: string;
  status: "draft" | "posted" | "void";
  lines: AccountingEntryLine[];
}

export async function getAccountingEntry(
  id: string,
): Promise<AccountingEntry | null> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/entries/${id}`);
  if (!res.ok) {
    return null;
  }
  return res.json();
}
