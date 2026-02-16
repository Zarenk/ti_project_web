import { EntryStatus } from '@prisma/client';
import { authFetch } from '@/utils/auth-fetch';
import { BACKEND_URL } from '@/lib/utils';

export interface JournalEntryLine {
  id?: number;
  accountId: number;
  description?: string;
  debit: number;
  credit: number;
  account?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface JournalEntry {
  id: number;
  date: Date | string;
  description?: string;
  status: EntryStatus;
  debitTotal: number;
  creditTotal: number;
  correlativo: string;
  cuo: string;
  sunatStatus: string;
  source: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'MANUAL';
  moneda: 'PEN' | 'USD';
  tipoCambio?: number;
  lines: JournalEntryLine[];
  period?: {
    id: number;
    startDate: Date | string;
    endDate: Date | string;
  };
}

export interface CreateJournalEntryDto {
  date: Date | string;
  description?: string;
  source: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'MANUAL';
  moneda?: 'PEN' | 'USD';
  tipoCambio?: number;
  lines: Omit<JournalEntryLine, 'id' | 'account'>[];
}

export interface UpdateJournalEntryDto {
  date?: Date | string;
  description?: string;
  lines?: Omit<JournalEntryLine, 'id' | 'account'>[];
}

export interface JournalEntryFilters {
  from?: Date | string;
  to?: Date | string;
  sources?: string[];
  statuses?: EntryStatus[];
  accountIds?: number[];
  balanced?: boolean;
  page?: number;
  size?: number;
}

export async function getJournalEntries(
  filters: JournalEntryFilters = {}
): Promise<{ data: JournalEntry[]; total: number }> {
  const params = new URLSearchParams();

  if (filters.from) params.append('from', new Date(filters.from).toISOString());
  if (filters.to) params.append('to', new Date(filters.to).toISOString());
  if (filters.sources?.length) params.append('sources', filters.sources.join(','));
  if (filters.statuses?.length) params.append('statuses', filters.statuses.join(','));
  if (filters.accountIds?.length) params.append('accountIds', filters.accountIds.join(','));
  if (filters.balanced !== undefined) params.append('balanced', String(filters.balanced));
  if (filters.page) params.append('page', String(filters.page));
  if (filters.size) params.append('size', String(filters.size));

  const res = await authFetch(`${BACKEND_URL}/api/accounting/journal-entries?${params}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Error al obtener asientos');
  }

  return res.json();
}

export async function getJournalEntry(id: number): Promise<JournalEntry> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journal-entries/${id}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Error al obtener asiento');
  }

  return res.json();
}

export async function createJournalEntry(
  data: CreateJournalEntryDto
): Promise<JournalEntry> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journal-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Error al crear asiento');
  }

  return res.json();
}

export async function updateJournalEntry(
  id: number,
  data: UpdateJournalEntryDto
): Promise<JournalEntry> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journal-entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Error al actualizar asiento');
  }

  return res.json();
}

export async function postJournalEntry(id: number): Promise<JournalEntry> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journal-entries/${id}/post`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Error al registrar asiento');
  }

  return res.json();
}

export async function voidJournalEntry(id: number): Promise<JournalEntry> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journal-entries/${id}/void`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Error al anular asiento');
  }

  return res.json();
}

export async function deleteJournalEntry(id: number): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/accounting/journal-entries/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Error al eliminar asiento');
  }
}

export async function exportPLE(
  from: Date | string,
  to: Date | string,
  format: '5.1' | '6.1'
): Promise<void> {
  const params = new URLSearchParams({
    from: new Date(from).toISOString().split('T')[0],
    to: new Date(to).toISOString().split('T')[0],
    format,
  });

  const res = await authFetch(`${BACKEND_URL}/api/accounting/export/ple?${params}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Error al exportar PLE');
  }

  // Descargar archivo
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PLE_${format.replace('.', '')}_${new Date().getTime()}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
