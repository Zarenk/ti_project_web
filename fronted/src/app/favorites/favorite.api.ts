export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export async function getFavorites() {
  const token = getToken()
  const res = await fetch('/favorites', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Error')
  return res.json()
}

export async function toggleFavorite(productId: number) {
  const token = getToken()
  if (!token) throw new Error('Unauthorized')
  const res = await fetch('/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId }),
  })
  if (!res.ok) throw new Error('Error')
  return res.json()
}

export async function removeFavorite(productId: number) {
  const token = getToken()
  if (!token) throw new Error('Unauthorized')
  const res = await fetch(`/favorites/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error')
  return res.json()
}