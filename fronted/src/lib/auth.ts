import 'server-only'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export interface CurrentUser {
  id: number
  name: string
  role?: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get('auth_token')?.value
  if (!token) return null

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (!payload || !payload.id || !payload.name) {
      return null
    }
    return { id: payload.id, name: payload.name, role: payload.role }
  } catch {
    return null
  }
}