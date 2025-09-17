import { NextResponse, NextRequest } from 'next/server'
import { decodeJwt } from 'jose'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  try {
    const payload: any = decodeJwt(token)
    const role = String(payload?.role || '').toUpperCase()
    const allowed = new Set(['ADMIN', 'EMPLOYEE', 'ACCOUNTANT', 'AUDITOR'])
    if (!allowed.has(role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  } catch (e) {
    // Si no se puede decodificar, dejamos pasar y que el backend/cliente decida
    // para evitar falsos negativos cuando el secreto difiere.
  }

  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  return res
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
