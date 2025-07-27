import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  const target = url.startsWith('http')
    ? url
    : `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`

  const res = await fetch(target)

  if (!res.ok) {
    return new NextResponse(null, { status: res.status })
  }

  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'application/octet-stream'

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: { 'Content-Type': contentType }
  })
}