import { refreshAuthToken } from "@/utils/auth-refresh"
import { getAuthHeaders, type TenantOverride } from "@/utils/auth-token"
import { wasManualLogoutRecently } from "@/utils/manual-logout"
import { notifySessionExpired } from "@/utils/session-expired-event"

export class UnauthenticatedError extends Error {
  constructor(message = 'Unauthenticated') {
    super(message)
    this.name = 'UnauthenticatedError'
  }
}

export type ApiError = Error | UnauthenticatedError

function resolveUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === 'string') {
    const rawBase =
      process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || 'http://localhost:4000'
    if (/^https?:\/\//i.test(input)) {
      return input
    }
    const normalizedBase = normalizeBackendBase(rawBase)
    const slash = input.startsWith('/') ? '' : '/'
    return normalizedBase + slash + input
  }
  return input
}

function normalizeBackendBase(base: string): string {
  const trimmed = base.endsWith('/') ? base.slice(0, -1) : base
  if (/\/api$/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed}/api`
}

type AuthFetchInit = RequestInit & {
  tenantOverrides?: TenantOverride
}

export async function authFetch(
  input: RequestInfo | URL,
  init: AuthFetchInit = {}
): Promise<Response> {
  if (wasManualLogoutRecently()) {
    throw new UnauthenticatedError()
  }
  const url = resolveUrl(input)
  const { tenantOverrides, ...requestInit } = init
  const headers = new Headers(requestInit.headers || {})
  const auth = await getAuthHeaders(tenantOverrides)
  if (Object.keys(auth).length === 0) {
    throw new UnauthenticatedError()
  }
  Object.entries(auth).forEach(([k, v]) => headers.set(k, v as string))

  if (process.env.NEXT_PUBLIC_DEBUG_HEADERS === 'true') {
    console.debug('authFetch headers', {
      url: typeof input === 'string' ? input : input.toString(),
      headers: Object.fromEntries(headers.entries()),
    })
  }

  let res = await fetch(url, { ...requestInit, headers })
  if (res.status !== 401) return res

  if (wasManualLogoutRecently()) {
    throw new UnauthenticatedError()
  }

  const refreshed = await refreshAuthToken()
  if (!refreshed) {
    notifySessionExpired()
    throw new UnauthenticatedError()
  }
  const retryHeaders = new Headers(requestInit.headers || {})
  const newAuth = await getAuthHeaders(tenantOverrides)
  Object.entries(newAuth).forEach(([k, v]) => retryHeaders.set(k, v as string))
  res = await fetch(url, { ...requestInit, headers: retryHeaders })
  if (res.status === 401) {
    notifySessionExpired()
    throw new UnauthenticatedError()
  }
  return res
}

export { getAuthHeaders }
