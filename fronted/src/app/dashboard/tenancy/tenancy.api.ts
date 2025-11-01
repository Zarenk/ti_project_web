import { getAuthHeaders } from "@/utils/auth-token"
import { clearTenantSelection, setTenantSelection } from "@/utils/tenant-preferences"

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

export interface CompanyResponse {
  id: number
  organizationId: number
  name: string
  legalName: string | null
  taxId: string | null
  status: string
  createdAt: string
  updatedAt: string
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
  companies?: CompanyResponse[]
  membershipCount: number
  superAdmin: OrganizationSuperAdmin | null
}

export interface CurrentTenantResponse {
  organization: { id: number; name: string } | null
  company: { id: number; name: string } | null
  companies: Array<{ id: number; name: string }>
}

export async function createOrganization(
  payload: CreateOrganizationPayload,
): Promise<OrganizationResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
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
        : undefined) || "No se pudo crear la organizacion"
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
    throw new Error("No se encontro un token de autenticacion")
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
        : undefined) || "No se pudo obtener la organizacion"
    throw new Error(message)
  }

  return data as OrganizationResponse
}

export async function getCurrentTenant(): Promise<CurrentTenantResponse> {
  const performRequest = async () => {
    const headers = await getAuthHeaders()

    if (!headers.Authorization) {
      throw new Error("No se encontro un token de autenticacion")
    }

    const response = await fetch(`${BACKEND_URL}/api/tenancy/current`, {
      headers,
      cache: "no-store",
    })

    const contentType = response.headers.get("content-type") || ""
    const isJson = contentType.includes("application/json")
    const data = isJson ? await response.json() : await response.text()
    return { response, data }
  }

  const asMessage = (data: unknown, fallback: string) => {
    if (typeof data === "object" && data && "message" in data) {
      const message = (data as { message?: string }).message
      if (typeof message === "string" && message.trim().length > 0) {
        return message
      }
    }
    if (typeof data === "string" && data.trim().length > 0) {
      return data
    }
    return fallback
  }

  let { response, data } = await performRequest()

  if (response.ok) {
    return data as CurrentTenantResponse
  }

  if (response.status === 400) {
    clearTenantSelection()
    ;({ response, data } = await performRequest())

    if (response.ok) {
      const payload = data as CurrentTenantResponse
      setTenantSelection({
        orgId: payload.organization?.id ?? null,
        companyId: payload.company?.id ?? null,
      })
      return payload
    }
  }

  const message = asMessage(data, "No se pudo obtener la seleccion de tenant")
  throw new Error(message)
}

export async function assignOrganizationSuperAdmin(
  organizationId: number,
  userId: number,
): Promise<OrganizationResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
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

export async function listOrganizations(): Promise<OrganizationResponse[]> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(`${BACKEND_URL}/api/tenancy`, {
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
        : undefined) || "No se pudo obtener la lista de organizaciones"
    throw new Error(message)
  }

  if (!Array.isArray(data)) {
    return []
  }

  return data as OrganizationResponse[]
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

export interface CreateCompanyPayload {
  name: string
  legalName?: string | null
  taxId?: string | null
  status?: string
  organizationId?: number
}

export async function createCompany(
  payload: CreateCompanyPayload,
): Promise<CompanyResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(`${BACKEND_URL}/api/companies`, {
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
        : undefined) || "No se pudo crear la empresa"
    throw new Error(message)
  }

  return data as CompanyResponse
}




