import { jwtDecode } from "jwt-decode"
import type { JwtPayload } from "jsonwebtoken"

import type { SiteSettings } from "@/context/site-settings-schema"
import { refreshAuthToken } from "@/utils/auth-refresh"
import { getAuthToken } from "@/utils/auth-token"

type ModulePermissionKey = keyof SiteSettings["permissions"]
export type UserPermissionsMap = Partial<Record<ModulePermissionKey, boolean>>
const MODULE_PERMISSION_KEYS: ModulePermissionKey[] = [
  "dashboard",
  "catalog",
  "store",
  "inventory",
  "sales",
  "purchases",
  "accounting",
  "marketing",
  "providers",
  "settings",
  "hidePurchaseCost",
  "hideDeleteActions",
]

function normalizeUserPermissions(value: unknown): UserPermissionsMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const source = value as Record<string, unknown>
  const normalized: UserPermissionsMap = {}
  for (const key of MODULE_PERMISSION_KEYS) {
    const raw = source[key]
    if (typeof raw === "boolean") {
      normalized[key] = raw
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : null
}

export interface CurrentUser {
  /**
   * Display name of the user. This may originate from the `username`
   * field if the API does not provide a `name` property.
   */
  id: number
  name: string
  role?: string
  isPublicSignup?: boolean
  userPermissions?: UserPermissionsMap | null
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

function getTokenExpirationTimestamp(token: string): number | null {
  try {
    const decoded: { exp?: number } = jwtDecode(token)
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}

function isExpired(token: string): boolean {
  const expiresAt = getTokenExpirationTimestamp(token)
  return !expiresAt || expiresAt < Date.now()
}

export async function getAuthTokenExpirationDate(): Promise<Date | null> {
  const token = await getAuthToken()
  if (!token) return null
  const expiresAt = getTokenExpirationTimestamp(token)
  return expiresAt ? new Date(expiresAt) : null
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
    const data = (await res.json()) as Partial<
      CurrentUser & {
        userId?: number | string
        username?: string
        sub?: number | string
        error?: unknown
      }
    >

    const rawId = data.id ?? data.userId ?? data.sub
    const id = typeof rawId === 'number' ? rawId : Number(rawId)
    const name = data.name ?? data.username
    if (!Number.isInteger(id) || !name || !data.role || data.error) {
      return null
    }

    const userPermissions = normalizeUserPermissions(
      (data as Record<string, unknown> | undefined)?.["userPermissions"],
    )

    return {
      id,
      name,
      role: data.role,
      isPublicSignup: Boolean((data as any)?.isPublicSignup),
      userPermissions,
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
    if (!res.ok) return false
    try {
      const data = (await res.json()) as {
        id?: number
        name?: string
        username?: string
        role?: string
        error?: unknown
      }
      return !!data.id && !!(data.name ?? data.username) && !!data.role && !data.error
    } catch {
      return false
    }
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

export { refreshAuthToken }
