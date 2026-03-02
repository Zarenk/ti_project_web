import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL } from '@/lib/utils'

export async function POST() {
  // 1. Invalidate tokens server-side (increment tokenVersion)
  const token = (await cookies()).get('token')?.value
  if (token) {
    try {
      await fetch(`${BACKEND_URL}/api/users/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // If backend is unreachable we still clear cookies below
    }
  }

  // 2. Clear all auth cookies
  const response = NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'no-store' },
  })
  const cookieOptions = {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
  }
  response.cookies.set('token', '', cookieOptions)
  response.cookies.set('refresh_token', '', cookieOptions)
  response.cookies.set('next-auth.session-token', '', cookieOptions)
  response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions)
  return response
}
