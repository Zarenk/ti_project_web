import { getAuthHeaders } from '@/utils/auth-token'
import { authFetch } from '@/utils/auth-fetch';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getOrders(params: { status?: string; from?: string; to?: string; clientId?: string; code?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.append('status', params.status);
  if (params.from) qs.append('from', params.from);
  if (params.to) qs.append('to', params.to);
  if (params.clientId) qs.append('clientId', params.clientId);
  if (params.code) qs.append('code', params.code);
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BACKEND_URL}/api/web-sales/orders?${qs.toString()}`,
    {
      headers,
      credentials: 'include',
    }
  );
  if (!res.ok) {
    let message = 'Error al obtener las ordenes';
    try {
      message = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export async function getOrdersCount(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  const res = await authFetch(
    `${BACKEND_URL}/api/web-sales/orders/count${qs}`,
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error('Error al obtener el conteo de ordenes')
  return res.json()
}

// Fetches the most recent orders from the backend. The backend already
// defaults to returning the last 10 orders when no limit is provided, so we
// mirror that behaviour here by using 10 as the default value. This ensures
// the recent activity section displays at most the latest ten movements.
export async function getRecentOrders(limit = 10) {
  const qs = new URLSearchParams()
  qs.append('limit', limit.toString())
  const res = await authFetch(
    `${BACKEND_URL}/api/web-sales/orders/recent?${qs.toString()}`,
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error('Error al obtener actividad de ordenes')
  return res.json()
}

export async function updateOrderSeries(
  id: number | string,
  items: { productId: number; series: string[] }[],
) {
  const res = await fetch(
    `${BACKEND_URL}/api/web-sales/order/${id}/series`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }
  );
  if (!res.ok) {
    let message = 'Error al actualizar series de la orden';
    try { message = await res.text(); } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json();
}
