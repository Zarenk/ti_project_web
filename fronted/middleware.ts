import { NextResponse, NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (payload.role !== 'ADMIN' && payload.role !== 'EMPLOYEE') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  } catch (e) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}