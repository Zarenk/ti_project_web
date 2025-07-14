const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

import { DateRange } from "react-day-picker"

export async function createSale(data: {
  userId: number;
  storeId: number;
  clientId: number;
  total: number;
  description?: string;
  details: { productId: number; quantity: number; price: number }[];
  tipoComprobante?: string; // Tipo de comprobante (factura, boleta, etc.)
  tipoMoneda: string;
  payments: { paymentMethodId: number; amount: number; currency: string }[];
}) {
  try{
    const response = await fetch(`${BACKEND_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  
    if (!response.ok) {
      throw new Error('Error al crear la venta');
    }
  
    return await response.json();
  }
  catch(error){
    console.error('Error al crear la venta:', error);
  }
}

export async function getSales() {
  try{
    const response = await fetch(`${BACKEND_URL}/api/sales`);
    if (!response.ok) {
      throw new Error('Error al obtener las ventas');
    }
    return await response.json();
  }
  catch(error){
    console.error('Error al obtener las ventas:', error);
  }
}

export async function getMonthlySalesTotal() {
  const response = await fetch(`${BACKEND_URL}/api/sales/monthly-total`);
  if (!response.ok) throw new Error("Error al obtener ventas mensuales");
  return await response.json(); // { total, growth }
}

export async function getProductsByStore(storeId: number) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory/products-by-store/${storeId}`);
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
    const response = await fetch(`${BACKEND_URL}/api/inventory/stock-by-product-and-store/${storeId}/${productId}`);
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
    const response = await fetch(`${BACKEND_URL}/api/inventory/series-by-product-and-store/${storeId}/${productId}`);
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
    const response = await fetch(`${BACKEND_URL}/api/inventory/series-by-product-and-store/${storeId}/${productId}`);
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
  const response = await fetch(`${BACKEND_URL}/api/sunat/send-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceData),
  });

  if (!response.ok) {
    throw new Error('Error al enviar la factura a la SUNAT');
  }

  return await response.json();
}

export async function generarYEnviarDocumento(data: { documentType: string; [key: string]: any }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/sunat/generar-y-enviar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`${BACKEND_URL}/api/paymentmethods`);
    if (!response.ok) {
      throw new Error('Error al obtener los métodos de pago');
    }
    return await response.json();
  }
  catch(error){
    console.error('Error al obtener los métodos de pago:', error);
    throw error;
  }
}

export async function getRevenueByCategoryByRange(from: string, to: string) {
  const response = await fetch(`${BACKEND_URL}/api/sales/revenue-by-category/from/${from}/to/${to}`);
  if (!response.ok) {
    throw new Error("Error al obtener los ingresos por categoría");
  }
  return response.json();
}

export async function getSalesByDateParams(from: string, to: string) {
  const response = await fetch(`${BACKEND_URL}/api/sales/chart/${from}/${to}`);
  if (!response.ok) throw new Error('Error al obtener gráfico de ventas');
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
    throw new Error("Faltan parámetros: se requiere 'type' o 'from' y 'to'");
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error("Error al obtener top de productos");
  }

  return await response.json(); // [{ name: string, sales: number }]
}

export async function getMonthlySalesCount() {
  const response = await fetch(`${BACKEND_URL}/api/sales/monthly-count`);
  if (!response.ok) throw new Error("Error al obtener el conteo mensual de ventas");
  return await response.json(); // { count: number, growth: number | null }
}

export async function getMonthlyClientsStats() {
  const response = await fetch(`${BACKEND_URL}/api/sales/monthly-clients`);
  if (!response.ok) throw new Error("Error al obtener estadísticas de clientes");
  return response.json(); // { total: number, growth: number | null }
}

export async function getRecentSalesByRange(from: string, to: string) {
  const res = await fetch(`${BACKEND_URL}/api/sales/recent/${from}/${to}`);
  if (!res.ok) throw new Error("Error al obtener ventas recientes");
  return res.json();
}

export async function getSaleById(id: number | string) {
  const res = await fetch(`${BACKEND_URL}/api/sales/${id}`);
  if (!res.ok) throw new Error('Error al obtener la venta');
  return res.json();
}

