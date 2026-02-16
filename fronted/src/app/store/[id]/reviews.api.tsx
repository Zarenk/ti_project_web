import { BACKEND_URL } from '@/lib/utils'
import { authFetch } from '@/utils/auth-fetch'

export async function getReviews(productId: number) {
  const res = await fetch(`${BACKEND_URL}/api/products/${productId}/reviews`)
  if (!res.ok) {
    throw new Error('Failed to fetch reviews')
  }
  return res.json()
}

export async function submitReview(
  productId: number,
  rating: number,
  comment: string,
) {
  const res = await authFetch(`${BACKEND_URL}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, rating, comment }),
  })
  if (!res.ok) {
    throw new Error('Failed to submit review')
  }
  return res.json()
}