export interface UserTokenPayload {
  userId: number
  name: string
  role?: string
}

export async function getUserDataFromToken(): Promise<UserTokenPayload | null> {
  try {
    // Avoid a request if the cookie is missing on the client
    if (typeof document !== 'undefined') {
      const hasToken = document.cookie
        .split('; ')
        .some((c) => c.startsWith('token='))
      if (!hasToken) return null
    }
    const res = await fetch('/api/login')
    if (!res.ok) return null
    const data = await res.json()
    return {
      userId: data.id ?? data.userId ?? data.user?.id,
      name: data.username ?? data.name ?? data.user?.username,
      role: data.role ?? data.user?.role,
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

export async function isTokenValid(): Promise<boolean> {
  try {
    // Skip the request if we know the cookie doesn't exist on the client
    if (typeof document !== 'undefined') {
      const hasToken = document.cookie
        .split('; ')
        .some((c) => c.startsWith('token='))
      if (!hasToken) return false
    }
    const res = await fetch('/api/login')
    return res.ok
  } catch {
    return false
  }
}

export function getLastAccessFromToken(): Date | null {
  return null
}