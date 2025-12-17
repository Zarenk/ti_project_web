import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const res = await fetch(`${BACKEND_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const contentType = res.headers.get('content-type') || ''
    let data: any = null
    try {
      data = contentType.includes('application/json') ? await res.json() : await res.text()
    } catch (e) {
      // Backend returned empty body or invalid JSON
      data = null
    }

    if (!res.ok) {
      const message = typeof data === 'string' && data ? data : data?.message || 'Error en autenticación'
      const errorPayload =
        data && typeof data === 'object'
          ? data
          : { message }
      return NextResponse.json(errorPayload, { status: res.status || 500 })
    }

    // Ensure we have a JSON object to return
    const payload = typeof data === 'string' ? { message: data } : data

    const response = NextResponse.json(payload)
    if (payload?.access_token) {
      response.cookies.set('token', payload.access_token, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }
    return response
  } catch (error: any) {
    const message = error?.message || 'Error interno en login'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    let token = request.headers
      .get('authorization')
      ?.replace(/^Bearer\s+/i, '')

    if (!token) {
      token =
        (await cookies()).get('token')?.value ||
        request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1]
    }
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    const contentType = res.headers.get('content-type') || ''
    let data: any = null
    try {
      data = contentType.includes('application/json') ? await res.json() : await res.text()
    } catch (e) {
      data = null
    }

    if (!res.ok) {
      const message = typeof data === 'string' && data ? data : data?.message || 'Error al obtener perfil'
      return NextResponse.json({ message }, { status: res.status || 500 })
    }

    const payload = typeof data === 'string' ? {} : data
    return NextResponse.json({ ...payload, access_token: token })
  } catch (error: any) {
    const message = error?.message || 'Error interno en perfil'
    return NextResponse.json({ message }, { status: 500 })
  }
}
