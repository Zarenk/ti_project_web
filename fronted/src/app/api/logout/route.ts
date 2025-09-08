import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'no-store' },
  })
  const cookieOptions = {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
  // Clear custom auth token
  response.cookies.set('token', '', cookieOptions)
  // Clear refresh token issued by backend
  response.cookies.set('refresh_token', '', cookieOptions)
  // Clear NextAuth session cookies
  response.cookies.set('next-auth.session-token', '', cookieOptions)
  response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions)
  return response
}
