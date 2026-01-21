import { getAuthHeaders } from "@/utils/auth-token";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

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

export async function createProvider(providerData: any) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/providers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(providerData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw { response: { status: res.status, data: errorData } };
  }

  return res.json();
}

export async function getProviders() {
  const res = await authorizedFetch(`${BACKEND_URL}/api/providers`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Error al obtener proveedores: ${res.status}`);
  }

  return res.json();
}

export async function getProvider(id: string) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/providers/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Error al obtener el proveedor ${id}: ${res.status}`);
  }

  const json = await res.json();
  const formatted = {
    ...json,
    createAt: new Date(json.createdAt),
  };
  console.log("Proveedor formateado:", formatted);
  return formatted;
}

export async function checkProviderExists(documentNumber: string): Promise<boolean> {
  try {
    const response = await authorizedFetch(`${BACKEND_URL}/api/providers/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentNumber }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || "Error al verificar el proveedor.");
    }

    const data = await response.json();
    return Boolean(data?.exists);
  } catch (error) {
    console.error("Error en checkProviderExists:", error);
    throw error;
  }
}

export async function deleteProvider(id: string) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/providers/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Error al eliminar el proveedor.");
  }

  return res.json();
}

export async function deleteProviders(ids: string[]) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/providers/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Error eliminando proveedores.");
  }
}

export async function updateProvider(id: string, newProvider: any) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/providers/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newProvider),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw { response: { status: res.status, data: errorData } };
  }

  return res.json();
}

export async function updateManyProviders(providers: any[]) {
  console.log("Enviando proveedores al backend para actualizacion masiva:", providers);

  try {
    const response = await authorizedFetch(`${BACKEND_URL}/api/providers`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(providers),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Error al actualizar proveedores:", errorData);
      throw { response: { status: response.status, data: errorData } };
    }

    const data = await response.json();
    console.log("Respuesta del backend:", data);
    return data;
  } catch (error) {
    console.error("Error en updateManyProviders:", error);
    throw error;
  }
}

export async function uploadProviderImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await authorizedFetch(`${BACKEND_URL}/api/clients/upload-image`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Error al subir la imagen");
  }

  return res.json() as Promise<{ url: string }>;
}

export async function importProvidersExcelFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await authorizedFetch(`${BACKEND_URL}/api/providers/import-excel`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Error al subir el archivo Excel.");
  }

  return res.json() as Promise<{ message: string; preview: any[] }>;
}

export async function commitProvidersExcelData(previewData: any[]) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/providers/import-excel/commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: previewData }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message =
      errorData?.message ||
      errorData?.error ||
      "Error al guardar los proveedores importados.";
    throw new Error(Array.isArray(errorData?.errors) ? errorData.errors.join(" | ") : message);
  }

  return res.json() as Promise<{ message: string; count: number }>;
}
