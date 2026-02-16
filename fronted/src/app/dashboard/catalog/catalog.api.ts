import { BACKEND_URL } from "@/lib/utils";
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";

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

  const res = await authFetch(
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
