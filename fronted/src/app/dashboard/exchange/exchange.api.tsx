import { getAuthHeaders } from "@/utils/auth-token";
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

async function authorizedFetch(url: string, init: RequestInit = {}) {
  let auth: Record<string, string> = {};
  try {
    auth = await getAuthHeaders();
  } catch (error: any) {
    if (
      error instanceof UnauthenticatedError ||
      error?.message?.includes("No se encontro un token")
    ) {
      throw new UnauthenticatedError();
    }
    throw error;
  }
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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Error al crear el tipo de cambio");
  }

  return response.json();
}

export async function getAllTipoCambio() {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/exchange`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Error al obtener los tipos de cambio");
    }

    return response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
}

export async function getLatestExchangeRateByCurrency(moneda: string): Promise<number | null> {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/exchange/latest/${moneda}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404 || response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `No se pudo obtener el tipo de cambio mas reciente. (HTTP ${response.status})`,
      );
    }

    const raw = await response.text();
    if (!raw || raw.trim().length === 0) {
      return null;
    }

    const data = JSON.parse(raw) as { valor?: number | null };
    return data.valor ?? null;
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    console.error("Error al obtener el tipo de cambio mas reciente:", error);
    throw error;
  }
}
