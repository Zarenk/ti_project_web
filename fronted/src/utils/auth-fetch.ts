import { refreshAuthToken } from "@/utils/auth-refresh"
import { getAuthHeaders } from "@/utils/auth-token"
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
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || ''
    if (/^https?:\/\//i.test(input)) {
      return input
    }
    const slash = input.startsWith('/') ? '' : '/'
    return base + slash + input
  }
  return input
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  if (wasManualLogoutRecently()) {
    throw new UnauthenticatedError()
  }
  const url = resolveUrl(input)
  const headers = new Headers(init.headers || {})
  const auth = await getAuthHeaders()
  if (Object.keys(auth).length === 0) {
    throw new UnauthenticatedError()
  }
  Object.entries(auth).forEach(([k, v]) => headers.set(k, v as string))

  let res = await fetch(url, { ...init, headers })
  if (res.status !== 401) return res

  if (wasManualLogoutRecently()) {
    throw new UnauthenticatedError()
  }

  const refreshed = await refreshAuthToken()
  if (!refreshed) {
    notifySessionExpired()
    throw new UnauthenticatedError()
  }
  const retryHeaders = new Headers(init.headers || {})
  const newAuth = await getAuthHeaders()
  Object.entries(newAuth).forEach(([k, v]) => retryHeaders.set(k, v as string))
  res = await fetch(url, { ...init, headers: retryHeaders })
  if (res.status === 401) {
    notifySessionExpired()
    throw new UnauthenticatedError()
  }
  return res
}

export { getAuthHeaders }
