import { BACKEND_URL } from '@/lib/utils';
import { authFetch } from '@/utils/auth-fetch';

export async function getProductFeatures(productId: number) {
  const res = await authFetch(`${BACKEND_URL}/api/products/${productId}/features`, { cache: 'no-store' });
  return res.json();
}

export async function createProductFeature(productId: number, data: any) {
  const res = await authFetch(`${BACKEND_URL}/api/products/${productId}/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProductFeature(productId: number, featureId: number, data: any) {
  const res = await authFetch(`${BACKEND_URL}/api/products/${productId}/features/${featureId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProductFeature(productId: number, featureId: number) {
  const res = await authFetch(`${BACKEND_URL}/api/products/${productId}/features/${featureId}`, {
    method: 'DELETE',
  });
  return res.json();
}
