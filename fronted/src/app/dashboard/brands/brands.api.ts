export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getBrands() {
  const res = await fetch(`${BACKEND_URL}/api/brands`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Error al obtener las marcas');
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

  const res = await fetch(`${BACKEND_URL}/api/brands`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Error al crear la marca');
  }

  return res.json();
}