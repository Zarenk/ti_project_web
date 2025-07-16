const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

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
  token: string,
) {
  const res = await fetch(`${BACKEND_URL}/api/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, rating, comment }),
  })
  if (!res.ok) {
    throw new Error('Failed to submit review')
  }
  return res.json()
}