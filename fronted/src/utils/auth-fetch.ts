import { refreshAuthToken } from "@/utils/auth-refresh"
import { getAuthHeaders, type TenantOverride, getAuthToken } from "@/utils/auth-token"
import { wasManualLogoutRecently } from "@/utils/manual-logout"
import { notifySessionExpired } from "@/utils/session-expired-event"
import { clearTenantSelection } from "@/utils/tenant-preferences"
import { jwtDecode } from "jwt-decode"

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

  if (res.status === 403 || res.status === 404 || res.status === 400) {
    const shouldHandleTenantError = () => {
      if (typeof window === "undefined") return false
      try {
        const last = window.sessionStorage.getItem("tenant-error-lock")
        const lastTs = last ? Number(last) : 0
        if (Number.isFinite(lastTs) && Date.now() - lastTs < 10_000) {
          return false
        }
      } catch {
        /* ignore */
      }
      return true
    }

    if (shouldHandleTenantError()) {
      try {
        const cloned = res.clone()
        const text = await cloned.text()
        if (
          /no se encontr[oó] la empresa|contexto de tenant no disponible|org_access_revoked|company_not_found|org_not_found|no tienes permisos para acceder a esta organizaci[oó]n/i.test(
            text,
          )
        ) {
          clearTenantSelection({ silent: true })
          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.setItem("tenant-error-lock", String(Date.now()))
            } catch {
              /* ignore */
            }
            try {
              const path = window.location?.pathname ?? ""
              if (path.startsWith("/dashboard") && !path.startsWith("/dashboard/tenancy")) {
                let target = "/dashboard"
                try {
                  const token = await getAuthToken()
                  if (token) {
                    const decoded = jwtDecode<{ role?: string }>(token)
                    const role = decoded?.role?.toString().toUpperCase() ?? ""
                    const canSeeTenancy = new Set([
                      "SUPER_ADMIN_GLOBAL",
                      "SUPER_ADMIN_ORG",
                      "SUPER_ADMIN",
                    ]).has(role)
                    if (canSeeTenancy) {
                      target = "/dashboard/tenancy"
                    }
                  }
                } catch {
                  /* ignore */
                }
                window.location.assign(target)
              }
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

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
