import { jwtDecode } from 'jwt-decode'
import type { JwtPayload } from 'jsonwebtoken'
import { getAuthToken } from '@/utils/auth-token'

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
      sub?: number
      username?: string
    }
    const id = payload.id ?? (typeof payload.sub === 'number' ? payload.sub : undefined)
    const name = payload.name ?? payload.username
    if (!id || typeof name !== 'string') {
      return null
    }
    return { id, name, role: payload.role }
  } catch {
    return null
  }
}

function isExpired(token: string): boolean {
  try {
    const decoded: { exp?: number } = jwtDecode(token)
    return !decoded.exp || decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export async function getUserDataFromToken(): Promise<CurrentUser | null> {
  const token = await getAuthToken()
  if (!token || isExpired(token)) return null
  const headers: HeadersInit = { Authorization: `Bearer ${token}` }

  try {
    const res = await fetch('/api/me', {
      credentials: 'include',
      cache: 'no-store',
      headers,
    })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<CurrentUser> & {
      error?: unknown
    }
    if (!data.id || !data.name || !data.role || data.error) {
      return null
    }
    return {
      id: data.id,
      name: data.name,
      role: data.role,
    }
  } catch {
    return null
  }
}

export async function isTokenValid(): Promise<boolean> {
 
  const token = await getAuthToken()
  if (!token || isExpired(token)) return false
  const headers: HeadersInit = { Authorization: `Bearer ${token}` }
  
  try {
    const res = await fetch('/api/me', {
      credentials: 'include',
      cache: 'no-store',
      headers,
    })
    return res.ok
  } catch {
    return false
  }
}

export async function getLastAccessFromToken(): Promise<Date | null> {
  const token = await getAuthToken()
  if (!token) return null
  try {
    const decoded: { iat?: number } = jwtDecode(token)
    if (!decoded.iat) return null
    return new Date(decoded.iat * 1000)
  } catch {
    return null
  }
}