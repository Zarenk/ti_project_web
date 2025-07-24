import { getAuthToken } from '@/lib/auth';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getOrders(params: { status?: string; from?: string; to?: string; clientId?: string; code?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.append('status', params.status);
  if (params.from) qs.append('from', params.from);
  if (params.to) qs.append('to', params.to);
  if (params.clientId) qs.append('clientId', params.clientId);
  if (params.code) qs.append('code', params.code);
  const token = getAuthToken();
  const res = await fetch(
    `${BACKEND_URL}/api/web-sales/orders?${qs.toString()}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
    }
  );
  if (!res.ok) throw new Error('Error al obtener las ordenes');
  return res.json();
}

export async function getOrdersCount(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/web-sales/orders/count${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error al obtener el conteo de ordenes');
  return res.json();
}