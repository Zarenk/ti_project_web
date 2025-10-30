import { getAuthHeaders } from "@/utils/auth-token";
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function authorizedFetch(url: string, init: RequestInit = {}) {
  const auth = await getAuthHeaders();
  const headers = new Headers(init.headers ?? {});

  for (const [key, value] of Object.entries(auth)) {
    if (value != null && value !== "") {
      headers.set(key, value);
    }
  }

  return fetch(url, { ...init, headers });
}


export async function createTipoCambio(data: { fecha: string; moneda: string; valor: number }) {
    const response = await authorizedFetch(`${BACKEND_URL}/api/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  
    if (!response.ok) {
      throw new Error('Error al crear el tipo de cambio');
    }
  
    return await response.json();
}

export async function getAllTipoCambio() {
    const response = await authorizedFetch(`${BACKEND_URL}/api/exchange`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  
    if (!response.ok) {
      throw new Error('Error al obtener los tipos de cambio');
    }
  
    return await response.json();
  }

export async function getLatestExchangeRateByCurrency(moneda: string): Promise<number | null> {
    try {
      const response = await authorizedFetch(`${BACKEND_URL}/api/exchange/latest/${moneda}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        throw new Error("No se pudo obtener el tipo de cambio más reciente.");
      }
  
      const data = await response.json();
      return data?.valor || null; // Devuelve el valor del tipo de cambio o null si no existe
    } catch (error) {
      console.error("Error al obtener el tipo de cambio más reciente:", error);
      throw error;
    }
} 
