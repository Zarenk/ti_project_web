import { getAuthHeaders } from "@/utils/auth-token";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.1.40:4000";

async function authorizedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const auth = await getAuthHeaders();
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
  const res = await authorizedFetch(`${BACKEND_URL}/api/category`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Error al obtener las categorias");
  }

  return res.json();
}
