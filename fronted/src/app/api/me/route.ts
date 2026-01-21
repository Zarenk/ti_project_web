import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

export async function getCurrentUser(request: Request) {
  let token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    token =
      (await cookies()).get('token')?.value ||
      request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1]
  }
  if (!token) return null

  const res = await fetch(`${BACKEND_URL}/api/users/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  return NextResponse.json(user, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
