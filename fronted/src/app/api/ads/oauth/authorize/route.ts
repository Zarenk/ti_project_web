import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

/**
 * Proxy to backend OAuth authorize endpoint.
 * Returns { url, state } for the frontend to open in a popup.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const platform = request.nextUrl.searchParams.get('platform')
    if (!platform) {
      return NextResponse.json({ error: 'Missing platform parameter' }, { status: 400 })
    }

    const res = await fetch(
      `${BACKEND_URL}/api/ads/oauth/authorize?platform=${encodeURIComponent(platform)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to get authorization URL' },
        { status: res.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
