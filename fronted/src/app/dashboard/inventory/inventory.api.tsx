const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Obtener todo el inventario
export async function getInventory() {
  const response = await fetch(`${BACKEND_URL}/api/inventory`, {
    cache: 'no-store',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener el inventario');
  }

  return await response.json();
}

export async function getAllPurchasePrices() {
  const response = await fetch(`${BACKEND_URL}/api/inventory/purchase-prices`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener los precios de compra');
  }

  return await response.json();
}


export async function transferProduct(data: {
  sourceStoreId: number;
  destinationStoreId: number;
  productId: number;
  quantity: number;
  description?: string;
  userId: number;
}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al realizar la transferencia');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error al realizar la transferencia:', error.message || error);
    throw error;
  }
}

// Obtener las tiendas con stock del producto
export async function getStoresWithProduct(productId: number) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory/stores-with-product/${productId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener las tiendas con stock del producto');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error al obtener las tiendas con stock del producto:', error.message || error);
    throw error;
  }
}

// Obtener todas las tiendas
export async function getAllStores() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stores`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener todas las tiendas');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error al obtener todas las tiendas:', error.message || error);
    throw error;
  }
}