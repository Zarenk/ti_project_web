const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function createSale(data: {
  userId: number;
  storeId: number;
  clientId: number;
  total: number;
  description?: string;
  details: { productId: number; quantity: number; price: number }[];
}) {
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

export async function getSales() {
  const response = await fetch(`${BACKEND_URL}/api/sales`);
  if (!response.ok) {
    throw new Error('Error al obtener las ventas');
  }
  return await response.json();
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
  const response = await fetch(`${BACKEND_URL}/api/inventory/stock-by-product-and-store/${storeId}/${productId}`);
  if (!response.ok) {
    throw new Error('Error al obtener el stock del producto en la tienda');
  }
  return await response.json();
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
  const response = await fetch(`${BACKEND_URL}/api/sunat/send-invoice`, {
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