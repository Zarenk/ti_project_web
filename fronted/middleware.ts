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
const TENANT_ORG_COOKIE = 'tenant_org_id'
const TENANT_COMPANY_COOKIE = 'tenant_company_id'

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

async function handleDashboardGuard(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('token')?.value
  if (!token) {
    return redirectToLogin(request, 'missing-token')
  }

  if (isTokenExpired(token)) {
    return redirectToLogin(request, 'expired-token')
  }

  const tokenValid = await verifyTokenWithBackend(token)
  if (!tokenValid) {
    return redirectToLogin(request, 'invalid-token')
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
  const companyCookie = request.cookies.get(TENANT_COMPANY_COOKIE)?.value ?? null
  const parsedCompany = companyCookie ? Number(companyCookie) : null
  let tenant: (TenantCookiePayload & { companyId?: number | null }) | null = null

  if (cached && cached.slug === slug) {
    tenant = { ...cached, companyId: Number.isFinite(parsedCompany) ? parsedCompany : null }
  } else {
    tenant = await resolveTenantFromApi(slug, host)
  }

  if (!tenant) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenant.slug)
  requestHeaders.set('x-org-id', String(tenant.organizationId))
  if (tenant.companyId) {
    requestHeaders.set('x-company-id', String(tenant.companyId))
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('x-tenant-slug', tenant.slug)
  response.headers.set('x-org-id', String(tenant.organizationId))
  if (tenant.companyId) {
    response.headers.set('x-company-id', String(tenant.companyId))
  }

  response.cookies.set(TENANT_COOKIE_NAME, serializeTenantCookie(tenant), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TENANT_COOKIE_MAX_AGE,
    path: '/',
  })
  response.cookies.set(TENANT_ORG_COOKIE, String(tenant.organizationId), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TENANT_COOKIE_MAX_AGE,
    path: '/',
  })
  if (tenant.companyId) {
    response.cookies.set(TENANT_COMPANY_COOKIE, String(tenant.companyId), {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: TENANT_COOKIE_MAX_AGE,
      path: '/',
    })
  }


  return response
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwt(token) as { exp?: number }
    if (!payload?.exp) return true
    const expiresAt = payload.exp * 1000
    const now = Date.now()
    const skewMs = 10_000
    return expiresAt <= now + skewMs
  } catch {
    return true
  }
}

async function verifyTokenWithBackend(token: string): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3_000)
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      return false
    }
    const data = (await response.json().catch(() => null)) as {
      id?: number | string
      role?: string
      error?: unknown
    } | null
    if (!data || data.error) {
      return false
    }
    const id = typeof data.id === 'number' ? data.id : Number(data.id)
    if (!Number.isFinite(id) || !data.role) {
      return false
    }
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

function redirectToLogin(request: NextRequest, reason: string): NextResponse {
  const loginUrl = new URL('/login', request.url)
  const returnTo =
    request.nextUrl.pathname === '/login'
      ? '/'
      : `${request.nextUrl.pathname}${request.nextUrl.search}` || '/'
  loginUrl.searchParams.set('reason', reason)
  if (returnTo) {
    loginUrl.searchParams.set('returnTo', returnTo)
  }
  const response = NextResponse.redirect(loginUrl)
  response.cookies.set('token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
  return response
}

async function resolveTenantFromApi(slug: string, host: string): Promise<(TenantCookiePayload & { companyId?: number | null }) | null> {
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

    const data = (await response.json()) as { id?: number; companies?: Array<{ id?: number; status?: string }> }
    const orgId = Number(data?.id)
    if (!Number.isFinite(orgId) || orgId <= 0) {
      return null
    }

    const companies = Array.isArray(data?.companies) ? data.companies : []
    const activeCompany = companies.find((c) => (c?.status ?? '').toString().toUpperCase() === 'ACTIVE')
    const fallbackCompany = activeCompany ?? companies[0] ?? null
    const companyId = fallbackCompany?.id ? Number(fallbackCompany.id) : null

    return { slug, organizationId: orgId, companyId: Number.isFinite(companyId) ? companyId : null }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
