export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getBrands() {
  const res = await fetch(`${BACKEND_URL}/api/brands`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Error al obtener las marcas');
  }
  return res.json();
}

export async function createBrand(data: { name: string; svgLogo?: string; pngLogo?: string }) {
  const res = await fetch(`${BACKEND_URL}/api/brands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Error al crear la marca');
  }

  return res.json();
}

export async function uploadLogo(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BACKEND_URL}/api/upload-logo`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Error al subir el logo');
  }

  return res.json();
}