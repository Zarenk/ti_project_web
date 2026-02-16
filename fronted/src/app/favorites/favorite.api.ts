import { getAuthHeaders } from '@/utils/auth-token'

export async function getFavorites() {
  const headers = await getAuthHeaders()
  // If there is no auth token, treat as no favorites without calling the API
  if (!('Authorization' in headers)) return []
  const res = await fetch('/api/favorites', {
    headers,
    credentials: 'include',
    cache: 'no-store',
  })
  if (res.status === 401) return []
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
