import { jwtDecode } from 'jwt-decode'
import type { JwtPayload } from 'jsonwebtoken'

export interface CurrentUser {
  id: number
  name: string
  role?: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { cookies } = await import('next/headers')
  const { verify } = await import('jsonwebtoken')
  const token = (await cookies()).get('token')?.value
  if (!token) return null

  try {
    const payload = verify(token, process.env.JWT_SECRET!) as JwtPayload & {
      id?: number
      name?: string
      role?: string
    }
    if (!payload?.id || !payload?.name) {
      return null
    }
    return { id: payload.id, name: payload.name, role: payload.role }
  } catch {
    return null
  }
}

export async function getUserDataFromToken(): Promise<CurrentUser | null> {

  const token = getAuthToken()
  if (!token) return null

  try {
    const res = await fetch('/api/me', {
      credentials: 'include',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return (await res.json()) as CurrentUser
  } catch {
    return null
  }
}

export async function isTokenValid(): Promise<boolean> {
 
  const token = getAuthToken()
  if (!token) return false
  
  try {
    const res = await fetch('/api/me', {
      credentials: 'include',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const match = document.cookie.match(/(?:^|; )token=([^;]+)/)
    if (match) return decodeURIComponent(match[1])
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem('token')
  } catch {
    return null
  }
}

export function getLastAccessFromToken(): Date | null {
  const token = getAuthToken()
  if (!token) return null
  try {
    const decoded: { iat?: number } = jwtDecode(token)
    if (!decoded.iat) return null
    return new Date(decoded.iat * 1000)
  } catch {
    return null
  }
}