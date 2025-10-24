import { getAuthHeaders } from "@/utils/auth-token"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:4000"

export interface OrganizationUnitInput {
  name: string
  code?: string | null
  status?: string
}

export interface CreateOrganizationPayload {
  name: string
  code?: string
  status?: string
  units: OrganizationUnitInput[]
}

export interface OrganizationSuperAdmin {
  id: number
  username: string
  email: string
}

export interface OrganizationResponse {
  id: number
  name: string
  code: string | null
  status: string
  createdAt: string
  updatedAt: string
  units: Array<{
    id: number
    name: string
    code: string | null
    status: string
    organizationId: number
    parentUnitId: number | null
    createdAt: string
    updatedAt: string
  }>
  membershipCount: number
  superAdmin: OrganizationSuperAdmin | null
}

export async function createOrganization(
  payload: CreateOrganizationPayload,
): Promise<OrganizationResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontró un token de autenticación")
  }

  const response = await fetch(`${BACKEND_URL}/api/tenancy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  })

  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (typeof data === "object" && data && "message" in data
        ? (data as { message?: string }).message
        : undefined) || "No se pudo crear la organización"
    throw new Error(message)
  }

  return data as OrganizationResponse
}

export interface UserSummary {
  id: number
  username: string
  email: string
  role: string
}

export async function getOrganization(
  id: number | string,
): Promise<OrganizationResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontró un token de autenticación")
  }

  const response = await fetch(`${BACKEND_URL}/api/tenancy/${id}`, {
    headers,
    cache: "no-store",
  })

  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (typeof data === "object" && data && "message" in data
        ? (data as { message?: string }).message
        : undefined) || "No se pudo obtener la organización"
    throw new Error(message)
  }

  return data as OrganizationResponse
}

export async function assignOrganizationSuperAdmin(
  organizationId: number,
  userId: number,
): Promise<OrganizationResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontró un token de autenticación")
  }

  const response = await fetch(`${BACKEND_URL}/api/tenancy/${organizationId}/super-admin`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ userId }),
  })

  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (typeof data === "object" && data && "message" in data
        ? (data as { message?: string }).message
        : undefined) || "No se pudo asignar el super admin"
    throw new Error(message)
  }

  return data as OrganizationResponse
}

export async function searchUsers(search: string): Promise<UserSummary[]> {
  const trimmed = search.trim()
  if (!trimmed) {
    return []
  }

  const headers = await getAuthHeaders()
  if (!headers.Authorization) {
    return []
  }

  const params = new URLSearchParams({ search: trimmed })

  const response = await fetch(`${BACKEND_URL}/api/users?${params.toString()}`, {
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as unknown

  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map((item) => ({
      id: Number(item.id),
      username: String(item.username ?? ""),
      email: String(item.email ?? ""),
      role: String(item.role ?? ""),
    }))
    .filter((user) => {
      const username = user.username.toLowerCase()
      const email = user.email.toLowerCase()
      const isGenericUser = username.startsWith("generic_")
      const isGuestEmail = email.endsWith("@guest.local")
      return !isGenericUser && !isGuestEmail
    })
}