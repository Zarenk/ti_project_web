export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function buildAuthHeaders(base?: HeadersInit): Promise<Headers> {
  const { getAuthHeaders } = await import('@/utils/auth-token');
  const authHeaders = await getAuthHeaders();
  const headers = new Headers(base ?? {});
  for (const [key, value] of Object.entries(authHeaders)) {
    if (value != null) {
      headers.set(key, value);
    }
  }
  return headers;
}

async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = await buildAuthHeaders(init.headers);
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}

export async function getBrands(page = 1, limit = 10) {
  const res = await fetchWithAuth(
    `${BACKEND_URL}/api/brands?page=${page}&limit=${limit}`,
    { cache: 'no-store' },
  );
  if (!res.ok) {
    throw new Error('Error al obtener las marcas');
  }
  return res.json();
}

export async function getKeywords() {
  const res = await fetchWithAuth(`${BACKEND_URL}/api/keywords`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Error al obtener las palabras clave');
  }
  return res.json();
}

export async function createBrand(data: {
  name: string;
  logoSvg?: File;
  logoPng?: File;
}) {
  const formData = new FormData();
  formData.append('name', data.name);
  if (data.logoSvg) {
    formData.append('logoSvg', data.logoSvg);
  }
  if (data.logoPng) {
    formData.append('logoPng', data.logoPng);
  }

  const res = await fetchWithAuth(`${BACKEND_URL}/api/brands`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Error al crear la marca');
  }

  return res.json();
}

export async function updateBrand(
  id: number,
  data: { name?: string; logoSvg?: File; logoPng?: File },
) {
  const formData = new FormData();
  if (data.name) formData.append('name', data.name);
  if (data.logoSvg) formData.append('logoSvg', data.logoSvg);
  if (data.logoPng) formData.append('logoPng', data.logoPng);

  const res = await fetchWithAuth(`${BACKEND_URL}/api/brands/${id}`, {
    method: 'PATCH',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Error al actualizar la marca');
  }
  return res.json();
}

export async function deleteBrand(id: number) {
  const res = await fetchWithAuth(`${BACKEND_URL}/api/brands/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Error al eliminar la marca');
  }

  return res.json();
}

export async function convertBrandPngToSvg(id: number) {
  const res = await fetchWithAuth(`${BACKEND_URL}/api/brands/${id}/convert-png`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Error al convertir la imagen');
  }
  return res.json();
}
