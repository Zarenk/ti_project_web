import { BACKEND_URL } from "@/lib/utils";
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";

export interface Journal {
  id: string;
  date: string;
  description: string;
  amount: number;
  series?: string[];
}

export async function fetchJournals(): Promise<Journal[]> {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/accounting/journals`);
    if (!res.ok) throw new Error("Error al obtener journals");
    const data = (await res.json()) as Journal[];
    return data.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    if (error instanceof UnauthenticatedError) throw error;
    throw error;
  }
}

export async function createJournal(data: Omit<Journal, "id">) {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 400) {
    const body = await res.json();
    throw body.errors as Record<string, string>;
  }
  if (!res.ok) throw new Error("Error al crear journal");
  return (await res.json()) as Journal;
}

export async function updateJournal(id: string, data: Omit<Journal, "id">) {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 400) {
    const body = await res.json();
    throw body.errors as Record<string, string>;
  }
  if (!res.ok) throw new Error("Error al actualizar journal");
  return (await res.json()) as Journal;
}

export async function deleteJournal(id: string) {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journals/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error al eliminar journal");
}

export async function fetchAccountingEntries(
  from: string,
  to: string,
  page = 1,
  size = 500,
): Promise<{ data: any[]; [key: string]: any }> {
  try {
    const params = new URLSearchParams({ from, to, page: String(page), size: String(size) });
    const res = await authFetch(`${BACKEND_URL}/api/accounting/entries?${params.toString()}`);
    if (!res.ok) return { data: [] };
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { data: [] };
    throw error;
  }
}

export async function fetchSalesTransactions(
  from: string,
  to: string,
): Promise<any[]> {
  try {
    const params = new URLSearchParams({ from, to });
    const res = await authFetch(`${BACKEND_URL}/api/sales/transactions?${params.toString()}`);
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return [];
    throw error;
  }
}

export async function fetchEntryById(entryId: number): Promise<any | null> {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/entries/by-id/${entryId}`);
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}
