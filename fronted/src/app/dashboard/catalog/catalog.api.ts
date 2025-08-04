export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function exportCatalog(format: 'pdf' | 'excel', filters: Record<string, any> = {}) {
  const params = new URLSearchParams({ format, ...filters });
  const res = await fetch(`${BACKEND_URL}/catalog/export?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Error al exportar el catálogo');
  }
  return res.blob();
}