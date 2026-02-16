import { BACKEND_URL } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { getTenantSelection } from "@/utils/tenant-preferences"
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

export async function createSale(data: {
  userId: number;
  storeId: number;
  clientId?: number;
  total: number;
  description?: string;
  details: { productId: number; quantity: number; price: number; series?: string[] }[];
  tipoComprobante?: string; // Tipo de comprobante (factura, boleta, etc.)
  tipoMoneda: string;
  payments: { paymentMethodId: number; amount: number; currency: string }[];
  source?: 'POS' | 'WEB';
  referenceId?: string;
}) {
  const { orgId, companyId } = await getTenantSelection();
  const payload = {
    ...data,
    organizationId: orgId ?? undefined,
    companyId: companyId ?? undefined,
  };
  try {
    console.log('Payload enviado al backend:', JSON.stringify(payload, null, 2));

    const response = await authFetch(`${BACKEND_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      console.error('Error del backend:', errorData);

      // Extraer mensaje de error más específico
      const errorMessage = errorData.message
        ? (Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message)
        : 'Error al crear la venta';

      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (error) {
    console.error('Error al crear la venta:', error);
    throw error;
  }
}

export interface LookupResponse {
  identifier: string
  name: string
  address: string | null
  status?: string | null
  condition?: string | null
  type: "RUC" | "DNI"
  raw: unknown
}

export async function lookupSunatDocument(document: string): Promise<LookupResponse> {
  const trimmed = document.trim()
  if (!/^\d{8}$|^\d{11}$/.test(trimmed)) {
    throw new Error("Ingresa un DNI (8 dígitos) o RUC (11 dígitos)")
  }

  const isRuc = trimmed.length === 11
  const endpoint = isRuc
    ? `${BACKEND_URL}/api/lookups/decolecta/ruc/${trimmed}`
    : `${BACKEND_URL}/api/lookups/dni/${trimmed}`

  const res = await authFetch(endpoint)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message =
      (typeof data === "object" && data && "message" in data ? (data as any).message : null) ||
      "No se pudo consultar el documento"
    throw new Error(message)
  }

  const data = await res.json()
  if (isRuc) {
  return {
    identifier: trimmed,
    name: data?.razon_social ?? data?.nombre ?? "—",
    address: data?.direccion ?? null,
    status: data?.estado ?? null,
    condition: data?.condicion ?? null,
    type: "RUC",
      raw: data,
    }
  }

  const nombres = [data?.nombres, data?.apellidoPaterno, data?.apellidoMaterno]
    .filter((value: string | undefined) => !!value && value.trim().length > 0)
    .join(" ")
    .trim()

  return {
    identifier: trimmed,
    name: nombres || data?.nombreCompleto || "—",
    address: data?.direccion ?? null,
    type: "DNI",
    raw: data,
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
  const { orgId, companyId } = await getTenantSelection();
  const payload = {
    ...data,
    organizationId: orgId ?? undefined,
    companyId: companyId ?? undefined,
  };
  const response = await authFetch(`${BACKEND_URL}/api/web-sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al crear la venta web: ${errorText}`);
  }
  return await response.json();
}

export async function createWebOrder(data: any) {
  const response = await authFetch(`${BACKEND_URL}/api/web-sales/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al crear la orden web: ${errorText}`);
  }
  return await response.json();
}

export async function payWithCulqi(token: string, amount: number, order: any) {
  const res = await authFetch(`${BACKEND_URL}/api/payments/culqi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await authFetch(`${BACKEND_URL}/api/web-sales/order/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data ?? {}),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al completar la orden: ${errorText}`);
  }
  return await response.json();
}

export async function rejectWebOrder(id: number) {
  const response = await authFetch(`${BACKEND_URL}/api/web-sales/order/${id}/reject`, {
    method: 'POST',
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

  const res = await authFetch(`${BACKEND_URL}/api/web-sales/order/${id}/proofs`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Error al subir las pruebas de pago');
  }

  return res.json();
}

export async function getWebOrderById(id: number | string) {
  const res = await authFetch(`${BACKEND_URL}/api/web-sales/order/${id}`);
  if (!res.ok) throw new Error('Error al obtener la orden web');
  return res.json();
}

export async function getWebOrderByCode(code: string) {
  const res = await authFetch(
    `${BACKEND_URL}/api/web-sales/order/by-code/${encodeURIComponent(code)}`,
  );
  if (!res.ok) throw new Error('Error al obtener la orden web');
  return res.json();
}

export async function getOrdersByUser(id: number | string) {
  const res = await authFetch(`${BACKEND_URL}/api/web-sales/order/by-user/${id}`);
  if (!res.ok) throw new Error('Error al obtener las ordenes del usuario');
  return res.json();
}

export async function getOrdersByEmail(email: string) {
  const res = await authFetch(
    `${BACKEND_URL}/api/web-sales/order/by-email/${encodeURIComponent(email)}`,
  );
  if (!res.ok) throw new Error('Error al obtener las ordenes por email');
  return res.json();
}

export async function getOrdersByDni(dni: string) {
  const res = await authFetch(
    `${BACKEND_URL}/api/web-sales/order/by-dni/${encodeURIComponent(dni)}`,
  );
  if (!res.ok) throw new Error('Error al obtener las ordenes por DNI');
  return res.json();
}

export async function getSales() {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/sales`, {
      credentials: "include",
    })
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Unauthorized')
      }
      throw new Error('Error al obtener las ventas')
    }
    return await response.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    console.error('Error al obtener las ventas:', error)
    throw error
  }
}

export async function getMySales() {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/sales/my`, {
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Unauthorized')
      }
      throw new Error('Error al obtener las ventas')
    }
    return await response.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    console.error('Error al obtener las ventas:', error)
    throw error
  }
}

export async function getMonthlySalesTotal() {
  try {
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
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { total: 0, growth: null };
    }
    throw error;
  }
}
export async function getMonthlySalesProfit() {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/sales/monthly-profit`, {
      credentials: "include",
    });

    if (response.status === 403) {
      return { profit: 0, growth: null };
    }

    if (!response.ok) {
      throw new Error("Error al obtener utilidades mensuales");
    }

    return response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { profit: 0, growth: null };
    }
    throw error;
  }
}
export async function getSalesTotalByDateRange(from: string, to: string) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/sales/total/from/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`, {
      credentials: "include",
    });

    if (response.status === 403) {
      return { total: 0, growth: null };
    }

    if (!response.ok) {
      throw new Error("Error al obtener ventas por rango");
    }

    return response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { total: 0, growth: null };
    }
    throw error;
  }
}
export async function getSalesCountByDateRange(from: string, to: string) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/sales/count/from/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`, {
      credentials: "include",
    });

    if (response.status === 403) {
      return { count: 0, growth: null };
    }

    if (!response.ok) {
      throw new Error("Error al obtener cantidad de ventas por rango");
    }

    return response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { count: 0, growth: null };
    }
    throw error;
  }
}
export async function getClientStatsByDateRange(from: string, to: string) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/sales/clients/from/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`, {
      credentials: "include",
    });

    if (response.status === 403) {
      return { total: 0, growth: null };
    }

    if (!response.ok) {
      throw new Error("Error al obtener clientes por rango");
    }

    return response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { total: 0, growth: null };
    }
    throw error;
  }
}
export async function getSalesProfitByDateRange(from: string, to: string) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/sales/profit/from/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`, {
      credentials: "include",
    });

    if (response.status === 403) {
      return 0;
    }

    if (!response.ok) {
      throw new Error("Error al obtener utilidades por rango");
    }

    return response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return 0;
    }
    throw error;
  }
}
export async function getProductsByStore(storeId: number) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/inventory/products-by-store/${storeId}`, {
      credentials: 'include',
    });
    if (response.status === 404 || response.status === 403) {
      return [];
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al obtener los productos por tienda: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    console.warn('No se pudieron cargar productos por tienda:', error);
    return [];
  }
}

export async function getStockByProductAndStore(storeId: number, productId: number) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/inventory/stock-by-product-and-store/${storeId}/${productId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Error al obtener el stock del producto en la tienda');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return 0;
    }
    console.error('Error al obtener el stock del producto en la tienda:', error);
    throw error;
  }
}

export async function fetchSeriesByProductAndStore(storeId: number, productId: number) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/inventory/series-by-product-and-store/${storeId}/${productId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error("Error al obtener las series del producto en la tienda");
    }
    const data = await response.json();
    return data; // Devuelve las series disponibles
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    console.error("Error al obtener las series:", error);
    return [];
  }
}

export async function getSeriesByProductAndStore(storeId: number, productId: number) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/inventory/series-by-product-and-store/${storeId}/${productId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error("Error al obtener las series del producto en la tienda");
    }
    const data = await response.json();
    return data; // Devuelve las series disponibles
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    console.error("Error al obtener las series:", error);
    return [];
  }
}

export async function sendInvoiceToSunat(invoiceData: any) {
  const response = await authFetch(`${BACKEND_URL}/api/sunat/send-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoiceData),
  });

  if (!response.ok) {
    throw new Error('Error al enviar la factura a la SUNAT');
  }

  return await response.json();
}

export async function generarYEnviarDocumento(data: { documentType: string; [key: string]: any }) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/sunat/generar-y-enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  try {
    const response = await authFetch(`${BACKEND_URL}/api/paymentmethods`);
    if (!response.ok) {
      throw new Error('Error al obtener los metodos de pago');
    }
    return await response.json();
  } catch (error) {
    console.error('Error al obtener los metodos de pago:', error);
    throw error;
  }
}

export async function getRevenueByCategoryByRange(from: string, to: string) {
  try {
    const response = await authFetch(
      `${BACKEND_URL}/api/sales/revenue-by-category/from/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`,
    );
    if (!response.ok) {
      if (response.status === 403) {
        return []
      }
      throw new Error("Error al obtener los ingresos por categoria");
    }
    return response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export async function getSalesTaxByRange(from: string, to: string) {
  try {
    const res = await authFetch(
      `${BACKEND_URL}/api/sales/taxes/from/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}`,
    );
    if (!res.ok) {
      if (res.status === 403) {
        return {
          total: 0,
          taxableTotal: 0,
          exemptTotal: 0,
          unaffectedTotal: 0,
          igvTotal: 0,
        };
      }
      throw new Error('Error al obtener impuestos de ventas');
    }
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return {
        total: 0,
        taxableTotal: 0,
        exemptTotal: 0,
        unaffectedTotal: 0,
        igvTotal: 0,
      };
    }
    throw error;
  }
}

export async function getSalesByDateParams(from: string, to: string) {
  try {
    const response = await authFetch(
      `${BACKEND_URL}/api/sales/chart/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
    );
    if (!response.ok) {
      if (response.status === 403) {
        return []
      }
      throw new Error('Error al obtener grafico de ventas');
    }
    return response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export async function getTopProducts(params: { from?: string; to?: string; type?: string }) {
  let endpoint = "";

  if (params.type) {
    endpoint = `/api/sales/top-products/type/${params.type}`;
  } else if (params.from && params.to) {
    endpoint = `/api/sales/top-products/from/${encodeURIComponent(params.from)}/to/${encodeURIComponent(params.to)}`;
  } else {
    throw new Error("Faltan parametros: se requiere 'type' o 'from' y 'to'");
  }

  try {
    const response = await authFetch(`${BACKEND_URL}${endpoint}`);

    if (!response.ok) {
      if (response.status === 403) {
        return []
      }
      throw new Error("Error al obtener top de productos");
    }

    // [{ productId, name, sales, revenue, lastSale }]
    return await response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export async function getMonthlySalesCount() {
  try {
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
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { count: 0, growth: null };
    }
    throw error;
  }
}
export async function getMonthlyClientsStats() {
  try {
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
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { total: 0, growth: null };
    }
    throw error;
  }
}
export async function getTopClients(params: { from?: string; to?: string }) {
  let query = '';
  if (params.from && params.to) {
    query = `?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;
  }
  try {
    const res = await authFetch(`${BACKEND_URL}/api/sales/top-clients${query}`);
    if (!res.ok) {
      if (res.status === 403) {
        return []
      }
      throw new Error('Error al obtener top clientes');
    }
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export async function getProductSalesReport(
  productId: number,
  params: { from?: string; to?: string } = {},
) {
  try {
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

    const res = await authFetch(endpoint);

    if (!res.ok) {
      if (res.status === 403) {
        return null;
      }
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
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    throw error;
  }
}

export async function getProductReportOptions() {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/sales/product-report-options`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 403) {
        return [];
      }
      throw new Error(`Error al obtener productos: ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
}

export async function getRecentSales(limit = 10) {
  const to = new Date().toISOString()
  const fromDate = new Date()
  fromDate.setMonth(fromDate.getMonth() - 1)
  const from = fromDate.toISOString()
  try {
    const res = await authFetch(
      `${BACKEND_URL}/api/sales/recent/${encodeURIComponent(from)}/${encodeURIComponent(to)}`
    )
    if (res.status === 403) {
      return []
    }
    if (!res.ok) throw new Error("Error al obtener ventas recientes")
    const data = await res.json()
    return Array.isArray(data) ? data.slice(0, limit) : []
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}
export async function deleteSale(id: number) {
  const response = await authFetch(`${BACKEND_URL}/api/sales/${id}`, {
    method: 'DELETE',
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
  try {
    const res = await authFetch(`${BACKEND_URL}/api/sales/${id}`);
    if (!res.ok) {
      if (res.status === 403) {
        return null;
      }
      throw new Error('Error al obtener la venta');
    }
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    throw error;
  }
}

export async function getRecentSalesByRange(from: string, to: string) {
  try {
    const res = await authFetch(
      `${BACKEND_URL}/api/sales/recent/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
    )
    if (res.status === 403) {
      return []
    }
    if (!res.ok) throw new Error("Error al obtener ventas recientes")
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
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
  try {
    const res = await authFetch(
      `${BACKEND_URL}/api/sales/transactions${qs.toString() ? `?${qs.toString()}` : ''}`,
    )
    if (!res.ok) {
      if (res.status === 403) {
        return []
      }
      throw new Error('Error al obtener las transacciones')
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export async function getProductsProfitByRange(from: string, to: string, q?: string, page = 1, pageSize = 25) {
  const qs = new URLSearchParams()
  qs.append('from', from)
  qs.append('to', to)
  if (q) qs.append('q', q)
  qs.append('page', String(page))
  qs.append('pageSize', String(pageSize))
  try {
    const res = await authFetch(`${BACKEND_URL}/api/sales/profit/products?${qs.toString()}`)
    if (!res.ok) {
      if (res.status === 403) {
        return { items: [], total: 0 }
      }
      throw new Error('Error al obtener utilidades por producto')
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { items: [], total: 0 }
    }
    throw error
  }
}

export async function getProfitByDate(from: string, to: string) {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/sales/profit/chart/${encodeURIComponent(from)}/${encodeURIComponent(to)}`)
    if (!res.ok) {
      if (res.status === 403) {
        return []
      }
      throw new Error('Error al obtener utilidades por fecha')
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}
