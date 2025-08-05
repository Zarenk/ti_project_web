import { getAuthToken } from '@/lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.40:4000';

export async function exportCatalog(format: 'pdf' | 'excel', params: Record<string, any> = {}) {
  const qs = new URLSearchParams({ format });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      const serialized = Array.isArray(value) ? value.join(',') : String(value);
      qs.append(key, serialized);
    }
  }

  const token = getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/catalog/export?${qs.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Error al exportar el catálogo');
  }

  return res.blob();
}

export async function getCategories() {
  const res = await fetch(`${BACKEND_URL}/api/category`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Error al obtener las categorías');
  }
  return res.json();
}