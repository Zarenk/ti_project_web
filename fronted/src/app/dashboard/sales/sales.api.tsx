const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

import { DateRange } from "react-day-picker"
import { getAuthHeaders } from "@/utils/auth-token"
import { getTenantSelection } from "@/utils/tenant-preferences"
import { authFetch } from "@/utils/auth-fetch";

async function buildAuthHeaders(
  init: HeadersInit = {},
  requireAuth = true,
): Promise<Headers> {
  const headers = new Headers(init)
  const authHeaders = await getAuthHeaders()

  if (requireAuth && !Object.prototype.hasOwnProperty.call(authHeaders, "Authorization")) {
    throw new Error("No se encontro un token de autenticacion")
  }

  for (const [key, value] of Object.entries(authHeaders)) {
    if (value != null && value !== "") {
      headers.set(key, value)
    }
  }

  return headers
}

export async function createSale(data: {
  userId: number;
  storeId: number;
  clientId?: number;
  total: number;
  description?: string;
  details: { productId: number; quantity: number; price: number }[];
  tipoComprobante?: string; // Tipo de comprobante (factura, boleta, etc.)
  tipoMoneda: string;
  payments: { paymentMethodId: number; amount: number; currency: string }[];
  source?: 'POS' | 'WEB';
}) {
  const headers = await getAuthHeaders();
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion');
  }
  const { orgId, companyId } = await getTenantSelection();
  const payload = {
    ...data,
    organizationId: orgId ?? undefined,
    companyId: companyId ?? undefined,
  };
  try{
    const response = await fetch(`${BACKEND_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al crear la venta: ${errorText}`);
    } 
    return await response.json();
  }
  catch(error){
    console.error('Error al crear la venta:', error);
    throw error;
  }
}

export async function createWebSale(data: {
  userId: number;
  storeId?: number;
  clientId?: number;
  total: number;
  description?: string;
  details: { productId: number; quantity: number; price: number }[];
  tipoComprobante?: string;
  tipoMoneda: string;
  payments: { paymentMethodId: number; amount: number; currency: string }[];
  shippingName?: string;
  shippingAddress?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  source?: 'WEB';
}) {
  const headers = await getAuthHeaders();
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion');
  }
  const { orgId, companyId } = await getTenantSelection();
  const payload = {
    ...data,
    organizationId: orgId ?? undefined,
    companyId: companyId ?? undefined,
  };
  const response = await fetch(`${BACKEND_URL}/api/web-sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al crear la venta web: ${errorText}`);
  }
  return await response.json();
}

export async function createWebOrder(data: any) {
  const headers = await buildAuthHeaders({ 'Content-Type': 'application/json' })
  const response = await fetch(`${BACKEND_URL}/api/web-sales/order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al crear la orden web: ${errorText}`);
  }
  return await response.json();
}

export async function payWithCulqi(token: string, amount: number, order: any) {
  const headers = await buildAuthHeaders({ 'Content-Type': 'application/json' })
  const res = await fetch(`${BACKEND_URL}/api/payments/culqi`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, amount, order }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al procesar pago: ${text}`);
  }
  return res.json();
}

export async function completeWebOrder(
  id: number,
  data?: {
    carrierId?: string;
    carrierName?: string;
    carrierMode?: string;
    shippingMethod?: string;
  },
) {
  const headers = await buildAuthHeaders({ 'Content-Type': 'application/json' })
  const response = await fetch(`${BACKEND_URL}/api/web-sales/order/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}), 
    headers,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al completar la orden: ${errorText}`);
  }
  return await response.json();
}

export async function rejectWebOrder(id: number) {
  const headers = await buildAuthHeaders()
  const response = await fetch(`${BACKEND_URL}/api/web-sales/order/${id}/reject`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al rechazar la orden: ${errorText}`);
  }
  return await response.json();
}

export async function uploadOrderProofs(
  id: number | string,
  files: File[],
  description: string,
) {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  formData.append('description', description);

  const headers = await buildAuthHeaders()
  const res = await fetch(`${BACKEND_URL}/api/web-sales/order/${id}/proofs`, {
    method: 'POST',
    body: formData,
    headers,
  });

  if (!res.ok) {
    throw new Error('Error al subir las pruebas de pago');
  }

  return res.json();
}

export async function getWebOrderById(id: number | string) {
  const headers = await buildAuthHeaders()
  const res = await fetch(`${BACKEND_URL}/api/web-sales/order/${id}`, { headers });
  if (!res.ok) throw new Error('Error al obtener la orden web');
  return res.json();
}

export async function getWebOrderByCode(code: string) {
  const headers = await buildAuthHeaders()
  const res = await fetch(
    `${BACKEND_URL}/api/web-sales/order/by-code/${encodeURIComponent(code)}`,
    { headers },
  );
  if (!res.ok) throw new Error('Error al obtener la orden web');
  return res.json();
}

export async function getOrdersByUser(id: number | string) {
  const headers = await buildAuthHeaders()
  const res = await fetch(`${BACKEND_URL}/api/web-sales/order/by-user/${id}`, {
    headers,
  });
  if (!res.ok) throw new Error('Error al obtener las ordenes del usuario');
  return res.json();
}

export async function getOrdersByEmail(email: string) {
  const headers = await buildAuthHeaders()
  const res = await fetch(
    `${BACKEND_URL}/api/web-sales/order/by-email/${encodeURIComponent(email)}`,
    { headers },
  );
  if (!res.ok) throw new Error('Error al obtener las ordenes por email');
  return res.json();
}

export async function getOrdersByDni(dni: string) {
  const headers = await buildAuthHeaders()
  const res = await fetch(
    `${BACKEND_URL}/api/web-sales/order/by-dni/${encodeURIComponent(dni)}`,
    { headers },
  );
  if (!res.ok) throw new Error('Error al obtener las ordenes por DNI');
  return res.json();
}

export async function getSales() {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion')
  }
  try {
    const response = await fetch(`${BACKEND_URL}/api/sales`, {
      headers,
    })
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Unauthorized')
      }
      throw new Error('Error al obtener las ventas')
    }
    return await response.json()
  } catch (error) {
    console.error('Error al obtener las ventas:', error)
    throw error
  }
}

export async function getMySales() {
  try {
    const response = await fetch('/api/sales/my', {
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized')
      }
      throw new Error('Error al obtener las ventas')
    }
    return await response.json()
  } catch (error) {
    console.error('Error al obtener las ventas:', error)
    throw error
  }
}

export async function getMonthlySalesTotal() {
  const response = await authFetch(`${BACKEND_URL}/api/sales/monthly-total`, {
    credentials: "include",
  });

  if (response.status === 403) {
    return { total: 0, growth: null };
  }

  if (!response.ok) {
    throw new Error("Error al obtener ventas mensuales");
  }

  return response.json();
}

export async function getProductsByStore(storeId: number) {
  try {
    const headers = await buildAuthHeaders()
    const response = await fetch(`${BACKEND_URL}/api/inventory/products-by-store/${storeId}`, {
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al obtener los productos por tienda: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error al obtener los productos por tienda:', error);
    throw error;
  }
}

export async function getStockByProductAndStore(storeId: number, productId: number) {
  try{
    const headers = await buildAuthHeaders()
    const response = await fetch(`${BACKEND_URL}/api/inventory/stock-by-product-and-store/${storeId}/${productId}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error('Error al obtener el stock del producto en la tienda');
    }
    return await response.json();
  }catch(error)
  {  
    console.error('Error al obtener el stock del producto en la tienda:', error);
    throw error;
  }
}

export async function fetchSeriesByProductAndStore(storeId: number, productId: number) {
  try {
    const headers = await buildAuthHeaders()
    const response = await fetch(`${BACKEND_URL}/api/inventory/series-by-product-and-store/${storeId}/${productId}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error("Error al obtener las series del producto en la tienda");
    }
    const data = await response.json();
    return data; // Devuelve las series disponibles
  } catch (error) {
    console.error("Error al obtener las series:", error);
    return [];
  }
}

export async function getSeriesByProductAndStore(storeId: number, productId: number) {
  try {
    const headers = await buildAuthHeaders()
    const response = await fetch(`${BACKEND_URL}/api/inventory/series-by-product-and-store/${storeId}/${productId}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error("Error al obtener las series del producto en la tienda");
    }
    const data = await response.json();
    return data; // Devuelve las series disponibles
  } catch (error) {
    console.error("Error al obtener las series:", error);
    return [];
  }
}

export async function sendInvoiceToSunat(invoiceData: any) {
  const headers = await buildAuthHeaders({ 'Content-Type': 'application/json' })
  const response = await fetch(`${BACKEND_URL}/api/sunat/send-document`, {
    method: 'POST',
    headers,
    body: JSON.stringify(invoiceData),
  });

  if (!response.ok) {
    throw new Error('Error al enviar la factura a la SUNAT');
  }

  return await response.json();
}

export async function generarYEnviarDocumento(data: { documentType: string; [key: string]: any }) {
  try {
    const headers = await buildAuthHeaders({ 'Content-Type': 'application/json' })
    const response = await fetch(`${BACKEND_URL}/api/sunat/generar-y-enviar`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al generar y enviar el documento: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al generar y enviar el documento:', error);
    throw error;
  }
}

export async function getPaymentMethods() {
  try{
    const headers = await buildAuthHeaders()
    const response = await fetch(`${BACKEND_URL}/api/paymentmethods`, {
      headers,
    });
    if (!response.ok) {
      throw new Error('Error al obtener los metodos de pago');
    }
    return await response.json();
  }
  catch(error){
    console.error('Error al obtener los metodos de pago:', error);
    throw error;
  }
}

export async function getRevenueByCategoryByRange(from: string, to: string) {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion')
  }
  const response = await fetch(
    `${BACKEND_URL}/api/sales/revenue-by-category/from/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`,
    { headers },
    );
  if (!response.ok) {
    throw new Error("Error al obtener los ingresos por categoria");
  }
  return response.json();
}

export async function getSalesByDateParams(from: string, to: string) {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion')
  }
  const response = await fetch(
    `${BACKEND_URL}/api/sales/chart/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
    { headers },
  );
  if (!response.ok) throw new Error('Error al obtener grafico de ventas');
  return response.json();
}

export async function getTopProducts(params: { from?: string; to?: string; type?: string }) {
  let endpoint = "";

  if (params.type) {
    // Ruta: /api/sales/top-products/type/:type
    endpoint = `/api/sales/top-products/type/${params.type}`;
  } else if (params.from && params.to) {
    // Ruta: /api/sales/top-products/from/:startDate/to/:endDate
    endpoint = `/api/sales/top-products/from/${encodeURIComponent(params.from)}/to/${encodeURIComponent(params.to)}`;
  } else {
    throw new Error("Faltan parametros: se requiere 'type' o 'from' y 'to'");
  }

  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion')
  }
  const response = await fetch(`${BACKEND_URL}${endpoint}`, { headers });

  if (!response.ok) {
    throw new Error("Error al obtener top de productos");
  }

  // [{ productId, name, sales, revenue, lastSale }]
  return await response.json();
}

export async function getMonthlySalesCount() {
  const response = await authFetch(`${BACKEND_URL}/api/sales/monthly-count`, {
    credentials: "include",
  });

  if (response.status === 403) {
    return { count: 0, growth: null };
  }

  if (!response.ok) {
    throw new Error("Error al obtener el conteo mensual de ventas");
  }

  return response.json();
}

export async function getMonthlyClientsStats() {
  const response = await authFetch(`${BACKEND_URL}/api/sales/monthly-clients`, {
    credentials: "include",
  });
  if (response.status === 403) {
    return { total: 0, growth: null };
  }
  if (!response.ok) {
    throw new Error("Error al obtener estadisticas de clientes");
  }
  return response.json();
}

export async function getTopClients(params: { from?: string; to?: string }) {
  let query = '';
  if (params.from && params.to) {
    query = `?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;
  }
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion')
  }
  const res = await fetch(`${BACKEND_URL}/api/sales/top-clients${query}`, {
    headers,
  });
  if (!res.ok) throw new Error('Error al obtener top clientes');
  return res.json();
}

export async function getProductSalesReport(
  productId: number,
  params: { from?: string; to?: string } = {},
) {
  const headers = await getAuthHeaders();
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion');
  }

  const searchParams = new URLSearchParams();
  if (params.from) {
    searchParams.set('from', params.from);
  }
  if (params.to) {
    searchParams.set('to', params.to);
  }

  const query = searchParams.toString();
  const endpoint = `${BACKEND_URL}/api/sales/product-report/${productId}${
    query ? `?${query}` : ''
  }`;

  const res = await fetch(endpoint, { headers });

  if (!res.ok) {
    let message = 'Error al obtener el reporte de producto';
    try {
      const errorData = await res.json();
      if (errorData?.message) {
        message = errorData.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return res.json();
}

export async function getProductReportOptions() {
  const headers = await getAuthHeaders();
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion');
  }

  const res = await fetch(`${BACKEND_URL}/api/sales/product-report-options`, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Error al obtener productos: ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getRecentSalesByRange(from: string, to: string) {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion')
  }
  const res = await fetch(
    `${BACKEND_URL}/api/sales/recent/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
    { headers },
  );
  if (!res.ok) throw new Error("Error al obtener ventas recientes");
  return res.json();
}

export async function getRecentSales(limit = 10) {
  const to = new Date().toISOString()
  const fromDate = new Date()
  fromDate.setMonth(fromDate.getMonth() - 1)
  const from = fromDate.toISOString()
  const res = await authFetch(
    `${BACKEND_URL}/api/sales/recent/${encodeURIComponent(from)}/${encodeURIComponent(to)}`
  )
  if (res.status === 403) {
    return []
  }
  if (!res.ok) throw new Error("Error al obtener ventas recientes")
  const data = await res.json()
  return Array.isArray(data) ? data.slice(0, limit) : []
}

export async function deleteSale(id: number) {
  const headers = await getAuthHeaders();
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion');
  }

  const response = await fetch(`${BACKEND_URL}/api/sales/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    let message = 'Error al eliminar la venta';
    try {
      const errorData = await response.json();
      if (errorData?.message) {
        message = errorData.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
}

export async function getSaleById(id: number | string) {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) {
    throw new Error('No se encontro un token de autenticacion')
  }
  const res = await fetch(`${BACKEND_URL}/api/sales/${id}`, { headers });
  if (!res.ok) throw new Error('Error al obtener la venta');
  return res.json();
}

export async function getWebSaleById(id: number | string) {
  const res = await fetch(`${BACKEND_URL}/api/web-sales/${id}`)
  if (!res.ok) throw new Error('Error al obtener la venta web')
  return res.json()
}

export async function getSalesTransactions(from?: string, to?: string) {
  const qs = new URLSearchParams()
  if (from) qs.append('from', from)
  if (to) qs.append('to', to)
  const headers = await getAuthHeaders()
  const res = await fetch(
    `${BACKEND_URL}/api/sales/transactions${qs.toString() ? `?${qs.toString()}` : ''}`,
    { headers },
  )
  if (!res.ok) throw new Error('Error al obtener las transacciones')
  return res.json()
}
