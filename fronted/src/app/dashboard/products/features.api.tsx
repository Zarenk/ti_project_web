export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getProductFeatures(productId: number) {
  const res = await fetch(`${BACKEND_URL}/api/products/${productId}/features`, { cache: 'no-store' });
  return res.json();
}

export async function createProductFeature(productId: number, data: any) {
  const res = await fetch(`${BACKEND_URL}/api/products/${productId}/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProductFeature(productId: number, featureId: number, data: any) {
  const res = await fetch(`${BACKEND_URL}/api/products/${productId}/features/${featureId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProductFeature(productId: number, featureId: number) {
  const res = await fetch(`${BACKEND_URL}/api/products/${productId}/features/${featureId}`, {
    method: 'DELETE',
  });
  return res.json();
}