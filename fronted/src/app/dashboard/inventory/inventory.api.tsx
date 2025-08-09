import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";


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
    cache: 'no-store',
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

// Obtener el inventario con desglose por moneda
export async function getInventoryWithCurrency() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory/with-currency`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener el inventario con desglose por moneda');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error al obtener el inventario con desglose por moneda:', error.message || error);
    throw error;
  } 
}

export async function getStockDetailsByStoreAndCurrency() {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/inventory/stock-details-by-store-and-currency`,
      { cache: 'no-store' }
    );
    if (!response.ok) {
      throw new Error('Error al obtener los detalles de stock por tienda y moneda');
    }
    return await response.json();
  }
  catch(error: any) {
    console.error('Error al obtener los detalles de stock por tienda y moneda:', error.message || error);
    throw error;
  }
}

export async function getProductEntries(productId: number) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/inventory/product-entries/${productId}`,
      { cache: 'no-store' }
    );
    if (!response.ok) {
      throw new Error('Error al obtener las entradas del producto');
    }
    return response.json();
  }
  catch(error: any) {
    console.error('Error al obtener las entradas del producto:', error.message || error);
  }
}

export async function getSeriesByProductAndStore(storeId: number, productId: number) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/inventory/series-by-product-and-store/${storeId}/${productId}`,
      { cache: "no-store" }
    );
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

export async function updateProductPriceSell(productId: number, priceSell: number) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/products/${productId}/price-sell`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ priceSell }),
    });

    if (!response.ok) {
      throw new Error("Error al actualizar el precio de venta");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al actualizar el precio de venta:", error);
    throw error;
  }
}

export async function updateProductCategory(productId: number, categoryId: number) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/products/${productId}/category`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categoryId }),
    });

    if (!response.ok) {
      throw new Error('Error al actualizar la categoría del producto');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al actualizar la categoría del producto:', error);
    throw error;
  }
}

export async function getProductByInventoryId(inventoryId: number) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory/product-by-inventory/${inventoryId}`);
    if (!response.ok) {
      throw new Error(`Error al obtener el producto por inventoryId: ${response.statusText}`);
    }
    const data = await response.json();
    return data; // Devuelve { productId, productName }
  } catch (error) {
    console.error("Error al obtener el producto por inventoryId:", error);
    throw error;
  }
} 

export async function getProductSales(productId: number) {
  const response = await fetch(`${BACKEND_URL}/api/inventory/product-sales/${productId}`);
  if (!response.ok) {
    throw new Error('Error al obtener las salidas del producto');
  }
  return response.json();
}

export async function getCategoriesFromInventory(): Promise<string[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory/categories`);
    if (!response.ok) {
      throw new Error('Error al obtener las categorías');
    }
    return await response.json();
  } catch (error) {
    console.error('Error al cargar las categorías:', error);
    return [];
  }
}

export async function getProductsByStore(storeId: number, queryParams: string = "") {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory/products-by-store/${storeId}?${queryParams}`);
    if (!response.ok) {
      throw new Error("Error al obtener los productos por tienda");
    }
    return await response.json();
  } catch (error) {
    console.error("Error al obtener los productos por tienda:", error);
    throw error;
  }
}

export async function getAllProductsByStore(storeId: number, queryParams: string = "") {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory/all-products-by-store/${storeId}?${queryParams}`);
    if (!response.ok) {
      throw new Error("Error al obtener los productos por tienda");
    }
    return await response.json();
  } catch (error) {
    console.error("Error al obtener los productos por tienda:", error);
    throw error;
  }
}

export async function getTotalInventory() {
  try {
    const response = await authFetch(
      `${BACKEND_URL}/api/inventory/total-inventory`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    )

    if (!response.ok) {
      throw new Error('Error al obtener el inventario total');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) throw error
    console.error('Error al obtener el inventario total:', error)
    throw error
  }
}

export async function getLowStockItems() {
  try {
    const response = await authFetch(
      `${BACKEND_URL}/api/inventory/low-stock-items`,
    )
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Unauthorized');
      }
      throw new Error('Error al obtener los productos sin stock');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) throw error
    console.error('Error al obtener los productos sin stock:', error);
    return [];
  }
}

export async function importExcelFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BACKEND_URL}/api/inventory/import-excel`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Error al subir el archivo Excel');
  }

  return await response.json(); // { message, preview }
}

export async function commitImportedExcelData(previewData: any[], storeId: number, userId: number, providerId: number | null) {
  const response = await fetch(`${BACKEND_URL}/api/inventory/import-excel/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: previewData, storeId, userId, providerId }),
  })

  if (!response.ok) {
    throw new Error('Error al guardar datos importados')
  }

  return await response.json()
}

export function exportInventoryExcel(storeId: number, categoryId?: number) {
  const params = categoryId && categoryId !== 0 ? `?categoryId=${categoryId}` : '';
  const url = `${BACKEND_URL}/api/inventory/export/${storeId}${params}`;

  // Abre directamente en nueva pestaña para que el navegador descargue el archivo
  window.open(url, '_blank');
}