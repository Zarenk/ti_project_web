import { NextResponse, NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    const role = (payload as any).role
    if (role !== 'ADMIN' && role !== 'EMPLOYEE') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  } catch (e) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  return res
}

export const config = {
  matcher: ['/dashboard/:path*'],
}