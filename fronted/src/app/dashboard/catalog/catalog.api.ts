import { getAuthHeaders } from "@/utils/auth-token";
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.1.40:4000";

async function authorizedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
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

  return fetch(url, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
}

export async function exportCatalog(
  format: "pdf" | "excel",
  params: Record<string, any> = {},
): Promise<Blob> {
  const qs = new URLSearchParams({ format });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      const serialized = Array.isArray(value) ? value.join(",") : String(value);
      qs.append(key, serialized);
    }
  }

  const res = await authorizedFetch(
    `${BACKEND_URL}/api/catalog/export?${qs.toString()}`,
  );

  if (!res.ok) {
    throw new Error("Error al exportar el catalogo");
  }

  return res.blob();
}

export async function getCategories(): Promise<any[]> {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/category`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Error al obtener las categorias");
    }

    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
}
