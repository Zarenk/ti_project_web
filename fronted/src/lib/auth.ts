import { jwtDecode } from 'jwt-decode'

export interface UserTokenPayload {
  userId: number
  name: string
  role?: string
}

export async function getUserDataFromToken(): Promise<UserTokenPayload | null> {
  try {
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
    const res = await fetch('/api/login')
    return res.ok
  } catch {
    return false
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('token')
  if (stored) return stored
  const match = document.cookie.match(/(?:^|; )token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function getLastAccessFromToken(): Date | null {
  const token = getAuthToken()
  if (!token) return null
  try {
    const decoded: { iat?: number } = jwtDecode(token)
    if (!decoded.iat) return null
    return new Date(decoded.iat * 1000)
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}