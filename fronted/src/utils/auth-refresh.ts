import { wasManualLogoutRecently } from "@/utils/manual-logout"

// Always go through the frontend proxy so cookies are sent same-origin.
// The proxy at /api/auth/refresh reads the httpOnly refresh_token cookie,
// forwards it to the backend, and sets the rotated cookies on the response.
const REFRESH_URL = '/api/auth/refresh'

let refreshPromise: Promise<boolean> | null = null

export async function refreshAuthToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = doRefresh()
  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function doRefresh(): Promise<boolean> {
  if (wasManualLogoutRecently()) {
    return false
  }
  try {
    const res = await fetch(REFRESH_URL, {
      method: 'POST',
      credentials: 'include',
    })

    if (res.status === 404) {
      return false
    }

    // Token is managed exclusively via httpOnly cookies set by the proxy.
    // Never store tokens in localStorage as that exposes them to XSS attacks.
    if (res.ok && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('authchange'))
    }

    return res.ok
  } catch {
    return false
  }
}
