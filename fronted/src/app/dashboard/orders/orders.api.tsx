import { getAuthHeaders } from "@/utils/auth-token"
import { authFetch } from "@/utils/auth-fetch";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function getOrders(params: { status?: string; from?: string; to?: string; clientId?: string; code?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.append("status", params.status);
  if (params.from) qs.append("from", params.from);
  if (params.to) qs.append("to", params.to);
  if (params.clientId) qs.append("clientId", params.clientId);
  if (params.code) qs.append("code", params.code);
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BACKEND_URL}/api/web-sales/orders?${qs.toString()}`,
    {
      headers,
      credentials: "include",
    }
  );
  if (!res.ok) {
    let message = "Error al obtener las ordenes";
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
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await authFetch(
    `${BACKEND_URL}/api/web-sales/orders/count${qs}`,
    { credentials: "include" },
  );

  if (res.status === 403) {
    return { count: 0 };
  }

  if (!res.ok) throw new Error("Error al obtener el conteo de ordenes");
  return res.json();
}

// Fetches the most recent orders...
export type OrdersDashboardOverview = {
  pendingCount: number
  recentOrders: Array<{ id: number; code: string; createdAt: string; status: string }>
}

export async function getOrdersDashboardOverview(params: { status?: string; limit?: number; from?: string; to?: string } = {}): Promise<OrdersDashboardOverview> {
  const qs = new URLSearchParams()
  if (params.status) qs.append("status", params.status)
  if (params.limit) qs.append("limit", String(params.limit))
  if (params.from) qs.append("from", params.from)
  if (params.to) qs.append("to", params.to)

  const res = await authFetch(
    `${BACKEND_URL}/api/web-sales/orders/dashboard-overview?${qs.toString()}`,
    { credentials: "include" },
  )

  if (res.status === 403) {
    return { pendingCount: 0, recentOrders: [] }
  }

  if (!res.ok) throw new Error("Error al obtener el resumen de ordenes")
  const payload = await res.json()
  const recent = Array.isArray(payload?.recentOrders) ? payload.recentOrders : []
  return {
    pendingCount: typeof payload?.pendingCount === "number" ? payload.pendingCount : 0,
    recentOrders: recent,
  }
}

export async function getRecentOrders(limit = 10) {
  const qs = new URLSearchParams();
  qs.append("limit", limit.toString());
  const res = await authFetch(
    `${BACKEND_URL}/api/web-sales/orders/recent?${qs.toString()}`,
    { credentials: "include" },
  );

  if (res.status === 403) {
    return [];
  }

  if (!res.ok) throw new Error("Error al obtener actividad de ordenes");
  return res.json();
}

export async function updateOrderSeries(
  id: number | string,
  items: { productId: number; series: string[] }[],
) {
  const res = await fetch(
    `${BACKEND_URL}/api/web-sales/order/${id}/series`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }
  );
  if (!res.ok) {
    let message = "Error al actualizar series de la orden";
    try { message = await res.text(); } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json();
}

export async function getRestaurantOrders(params: { status?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.status) qs.append("status", params.status)
  const query = qs.toString()
  const res = await authFetch(`/restaurant-orders${query ? `?${query}` : ""}`, {
    credentials: "include",
  })

  if (res.status === 403) {
    return []
  }

  if (!res.ok) {
    let message = "Error al obtener las ordenes del restaurante"
    try {
      message = await res.text()
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  return res.json()
}

export async function getRestaurantOrder(id: number | string) {
  const res = await authFetch(`/restaurant-orders/${id}`, {
    credentials: "include",
  })

  if (!res.ok) {
    let message = "Error al obtener la orden del restaurante"
    try {
      message = await res.text()
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  return res.json()
}

export type CreateRestaurantOrderPayload = {
  storeId?: number | null
  tableId?: number | null
  clientId?: number | null
  notes?: string
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  items: Array<{
    productId: number
    quantity: number
    unitPrice: number
    notes?: string
    stationId?: number
  }>
}

export async function createRestaurantOrder(payload: CreateRestaurantOrderPayload) {
  const res = await authFetch("/restaurant-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let message = "Error al crear la orden de restaurante"
    try {
      message = await res.text()
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  return res.json()
}

export async function updateRestaurantOrder(
  id: number | string,
  payload: Partial<CreateRestaurantOrderPayload> & { status?: string },
) {
  const res = await authFetch(`/restaurant-orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let message = "Error al actualizar la orden del restaurante"
    try {
      message = await res.text()
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  return res.json()
}
