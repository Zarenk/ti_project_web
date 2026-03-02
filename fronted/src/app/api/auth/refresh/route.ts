import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL } from '@/lib/utils'

export async function POST() {
  const refreshToken = (await cookies()).get('refresh_token')?.value
  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 })
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Send refresh token in header since we can't forward cookies cross-origin
        'x-refresh-token': refreshToken,
      },
    })

    if (!res.ok) {
      // If backend says token is invalid/reused, clear all cookies
      const response = NextResponse.json(
        { message: 'Refresh failed' },
        { status: 401 },
      )
      response.cookies.set('token', '', { maxAge: 0, path: '/' })
      response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' })
      return response
    }

    const data = (await res.json()) as {
      access_token?: string
      accessToken?: string
      refreshToken?: string
    }
    const newAccessToken = data.access_token ?? data.accessToken
    const newRefreshToken = data.refreshToken

    if (!newAccessToken) {
      return NextResponse.json({ message: 'No access token in response' }, { status: 500 })
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.json({ ok: true })

    response.cookies.set('token', newAccessToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: isProduction,
    })

    if (newRefreshToken) {
      response.cookies.set('refresh_token', newRefreshToken, {
        httpOnly: true,
        path: '/',
        sameSite: 'strict',
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60, // 7 days
      })
    }

    return response
  } catch {
    return NextResponse.json({ message: 'Refresh request failed' }, { status: 500 })
  }
}
