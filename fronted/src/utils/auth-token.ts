const TOKEN_KEY = 'token'

/**
 * Retrieves the JWT token used for authenticated requests. The token is
 * stored exactly as in the current login flow: first we attempt to read it
 * from an HttpOnly cookie, falling back to localStorage on the client.
 */
export async function getAuthToken(): Promise<string | null> {
  // Server-side: read cookies via next/headers
  if (typeof window === 'undefined') {
    try {
      const { cookies } = await import('next/headers')
      // In Next.js 14.3+ the dynamic API is async; await the store
      const store = await cookies()
      return store.get(TOKEN_KEY)?.value ?? null
    } catch {
      return null
    }
  }

  // Client-side: prefer cookie when accessible
  try {
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + TOKEN_KEY + '=([^;]*)')
    )
    if (match) return decodeURIComponent(match[1])
  } catch {
    /* ignore */
  }

  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

import { getTenantSelection } from "./tenant-preferences"
import { parseTenantCookie, TENANT_COOKIE_NAME } from "@/lib/tenant/tenant-shared"

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null
  }

  const pattern = new RegExp(`(?:^|; )${name}=([^;]*)`)
  const match = document.cookie.match(pattern)
  return match ? decodeURIComponent(match[1]) : null
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  const headers: Record<string, string> = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const { orgId, companyId } = await getTenantSelection()
    if (orgId != null) {
      headers["x-org-id"] = String(orgId)
    }
    if (companyId != null) {
      headers["x-company-id"] = String(companyId)
    }
  } catch {
    /* ignore tenant header failures */
  }

  let resolvedSlug: string | null = null

  if (typeof window === "undefined") {
    try {
      const { headers: nextHeaders, cookies: nextCookies } = await import("next/headers")
      const headerStore = await nextHeaders()
      const slugHeader = headerStore.get("x-tenant-slug")
      const orgIdHeader = headerStore.get("x-org-id")

      if (orgIdHeader && !headers["x-org-id"]) {
        headers["x-org-id"] = orgIdHeader
      }
      if (slugHeader) {
        resolvedSlug = slugHeader
      }

      if (!resolvedSlug || !headers["x-org-id"]) {
        const cookieStore = await nextCookies()
        const cookiePayload = parseTenantCookie(cookieStore.get(TENANT_COOKIE_NAME)?.value ?? null)
        if (cookiePayload) {
          if (!headers["x-org-id"]) {
            headers["x-org-id"] = String(cookiePayload.organizationId)
          }
          if (!resolvedSlug) {
            resolvedSlug = cookiePayload.slug
          }
        }
      }
    } catch {
      /* ignore */
    }
  } else {
    const cookiePayload = parseTenantCookie(readCookieValue(TENANT_COOKIE_NAME))
    if (cookiePayload) {
      if (!headers["x-org-id"]) {
        headers["x-org-id"] = String(cookiePayload.organizationId)
      }
      resolvedSlug = cookiePayload.slug
    }
  }

  if (resolvedSlug && !headers["x-tenant-slug"]) {
    headers["x-tenant-slug"] = resolvedSlug
  }

  return headers
}
