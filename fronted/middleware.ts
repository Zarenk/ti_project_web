import { NextResponse, NextRequest } from 'next/server'
import { decodeJwt } from 'jose'

import {
  TENANT_COOKIE_NAME,
  parseTenantCookie,
  resolveTenantSlugFromHost,
  serializeTenantCookie,
  type TenantCookiePayload,
} from '@/lib/tenant/tenant-shared'

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000').replace(/\/$/, '')
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next()
  }

  if (pathname === '/favicon.ico' || pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/dashboard')) {
    return handleDashboardGuard(request)
  }

  return await handlePublicTenant(request)
}

function handleDashboardGuard(request: NextRequest): NextResponse {
  const token = request.cookies.get('token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}

async function handlePublicTenant(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get('host') ?? ''
  const slug = resolveTenantSlugFromHost(host)

  if (!slug) {
    return NextResponse.next()
  }

  const cached = parseTenantCookie(request.cookies.get(TENANT_COOKIE_NAME)?.value)
  let tenant: TenantCookiePayload | null = null

  if (cached && cached.slug === slug) {
    tenant = cached
  } else {
    tenant = await resolveTenantFromApi(slug, host)
  }

  if (!tenant) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenant.slug)
  requestHeaders.set('x-org-id', String(tenant.organizationId))

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('x-tenant-slug', tenant.slug)
  response.headers.set('x-org-id', String(tenant.organizationId))

  response.cookies.set(TENANT_COOKIE_NAME, serializeTenantCookie(tenant), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TENANT_COOKIE_MAX_AGE,
    path: '/',
  })

  return response
}

async function resolveTenantFromApi(slug: string, host: string): Promise<TenantCookiePayload | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/tenancy/resolve/slug/${encodeURIComponent(slug)}`, {
      headers: {
        'x-tenant-slug': slug,
        'x-forwarded-host': host,
      },
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as { id?: number }
    const orgId = Number(data?.id)
    if (!Number.isFinite(orgId) || orgId <= 0) {
      return null
    }

    return { slug, organizationId: orgId }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
