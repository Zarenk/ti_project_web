export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

import { getAuthHeaders } from '@/utils/auth-token'

export async function getFavorites() {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/favorites', {
    headers,
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Error')
  return res.json()
}

export async function toggleFavorite(productId: number) {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) throw new Error('Unauthorized')
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    credentials: 'include',
    body: JSON.stringify({ productId }),
  })
  if (!res.ok) throw new Error('Error')
  return res.json()
}

export async function removeFavorite(productId: number) {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) throw new Error('Unauthorized')
  const res = await fetch(`/api/favorites/${productId}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Error')
  return res.json()
}