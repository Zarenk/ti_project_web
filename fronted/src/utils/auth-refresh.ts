import { wasManualLogoutRecently } from "@/utils/manual-logout"

const REFRESH_ENDPOINT = '/api/auth/refresh'

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || ''
}

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
  const base = getBaseUrl()
  try {
    const res = await fetch(`${base}${REFRESH_ENDPOINT}`, {
      method: 'POST',
      credentials: 'include',
    })

    if (res.status === 404) {
      return false
    }

    let refreshed = res.ok

    if (typeof window !== 'undefined') {
      try {
        const data = await res.json()
        if (data && typeof data === 'object' && 'access_token' in data) {
          const token = (data as { access_token?: string }).access_token
          if (token) {
            localStorage.setItem('token', token)
            window.dispatchEvent(new Event('authchange'))
            refreshed = true
          }
        }
      } catch {
        // ignore body parse errors; some APIs may not return JSON here
      }
    }

    return refreshed
  } catch {
    return false
  }
}
