import { jwtDecode } from 'jwt-decode'
import type { JwtPayload } from 'jsonwebtoken'
import { getAuthToken, getAuthHeaders } from '@/utils/auth-token'

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

  const headers = await getAuthHeaders()
  if (Object.keys(headers).length === 0) return null

  try {
    const res = await fetch('/api/me', {
      credentials: 'include',
      cache: 'no-store',
      headers,
    })
    if (!res.ok) return null
    const data: any = await res.json()
    if (
      !data ||
      typeof data.id !== 'number' ||
      typeof data.role !== 'string' ||
      typeof data.name !== 'string' ||
      data.error
    ) {
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
 
  const headers = await getAuthHeaders()
  if (Object.keys(headers).length === 0) return false
  
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