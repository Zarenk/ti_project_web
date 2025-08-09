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
      const store = cookies()
      return (await store).get(TOKEN_KEY)?.value ?? null
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

export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}