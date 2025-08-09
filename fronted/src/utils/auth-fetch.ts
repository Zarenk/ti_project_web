import { getAuthHeaders } from "@/utils/auth-token"

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

async function refreshToken(): Promise<boolean> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || ''
  try {
    const res = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    try {
      const data = await res.json()
      if (data?.access_token && typeof window !== 'undefined') {
        localStorage.setItem('token', data.access_token)
      }
    } catch {
      // ignore body parse errors
    }
    return true
  } catch {
    return false
  }
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const url = resolveUrl(input)
  const headers = new Headers(init.headers || {})
  const auth = await getAuthHeaders()
  Object.entries(auth).forEach(([k, v]) => headers.set(k, v as string))

  let res = await fetch(url, { ...init, headers })
  if (res.status !== 401) return res

  const refreshed = await refreshToken()
  if (!refreshed) {
    throw new UnauthenticatedError()
  }
  const retryHeaders = new Headers(init.headers || {})
  const newAuth = await getAuthHeaders()
  Object.entries(newAuth).forEach(([k, v]) => retryHeaders.set(k, v as string))
  res = await fetch(url, { ...init, headers: retryHeaders })
  if (res.status === 401) {
    throw new UnauthenticatedError()
  }
  return res
}

export { getAuthHeaders }