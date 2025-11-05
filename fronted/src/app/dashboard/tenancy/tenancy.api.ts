import { getAuthHeaders } from "@/utils/auth-token"
import { clearTenantSelection, getTenantSelection, setTenantSelection } from "@/utils/tenant-preferences"

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

export interface OrganizationCompaniesOverview {
  id: number
  name: string
  code: string | null
  status: string
  createdAt: string
  updatedAt: string
  membershipCount: number
  superAdmin: OrganizationSuperAdmin | null
  units: OrganizationResponse["units"]
  companies: CompanyResponse[]
}

export interface CompanyDetail extends CompanyResponse {
  organization: { id: number; name: string; code: string | null; status: string }
}

export interface UpdateCompanyPayload {
  name?: string
  legalName?: string | null
  taxId?: string | null
  status?: string
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

    try {
      const organizations = await listOrganizations()
      const firstOrg =
        organizations.find((org) => org.companies && org.companies.length > 0) ??
        organizations[0] ??
        null

      if (firstOrg) {
        const firstCompany = firstOrg.companies?.[0] ?? null
        const nextSelection = {
          orgId: firstOrg.id ?? null,
          companyId: firstCompany?.id ?? null,
        }
        const currentSelection = await getTenantSelection()
        if (
          currentSelection.orgId !== nextSelection.orgId ||
          currentSelection.companyId !== nextSelection.companyId
        ) {
          setTenantSelection(nextSelection)
        }
        return {
          organization: firstOrg
            ? {
                id: firstOrg.id,
                name: firstOrg.name,
              }
            : null,
          company: firstCompany
            ? {
                id: firstCompany.id,
                name: firstCompany.name,
              }
            : null,
          companies:
            (firstOrg.companies ?? []).map((company) => ({
              id: company.id,
              name: company.name,
            })) ?? [],
        }
      }
    } catch {
      /* ignore fallback failure */
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

  const company = data as any
  return {
    id: Number(company.id),
    organizationId: Number(company.organizationId),
    name: String(company.name ?? ""),
    legalName: company.legalName ?? null,
    taxId: company.taxId ?? null,
    status: String(company.status ?? ""),
    createdAt: new Date(company.createdAt).toISOString(),
    updatedAt: new Date(company.updatedAt).toISOString(),
  }
}

export async function listOrganizationsWithCompanies(): Promise<OrganizationCompaniesOverview[]> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return []
  }

  const response = await fetch(`${BACKEND_URL}/api/companies`, {
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    if (response.status === 403) {
      return []
    }
    throw new Error("No se pudieron obtener las empresas")
  }

  const data = (await response.json()) as unknown
  if (!Array.isArray(data)) {
    return []
  }

  return data.map((item: any) => ({
    id: Number(item.id),
    name: String(item.name ?? ""),
    code: item.code ?? null,
    status: String(item.status ?? ""),
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
    membershipCount: Number(item.membershipCount ?? 0),
    superAdmin: item.superAdmin ?? null,
    units: Array.isArray(item.units) ? item.units : [],
    companies: Array.isArray(item.companies)
      ? item.companies.map((company: any) => ({
          id: Number(company.id),
          organizationId: Number(company.organizationId),
          name: String(company.name ?? ""),
          legalName: company.legalName ?? null,
          taxId: company.taxId ?? null,
          status: String(company.status ?? ""),
          createdAt: new Date(company.createdAt).toISOString(),
          updatedAt: new Date(company.updatedAt).toISOString(),
        }))
      : [],
  }))
}

export async function getCompanyDetail(id: number): Promise<CompanyDetail | null> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return null
  }

  const response = await fetch(`${BACKEND_URL}/api/companies/${id}`, {
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error("No se pudo obtener la empresa")
  }

  const data = (await response.json()) as CompanyDetail
  return {
    id: Number(data.id),
    organizationId: Number(data.organizationId),
    name: String(data.name ?? ""),
    legalName: data.legalName ?? null,
    taxId: data.taxId ?? null,
    status: String(data.status ?? ""),
    createdAt: new Date(data.createdAt).toISOString(),
    updatedAt: new Date(data.updatedAt).toISOString(),
    organization: {
      id: Number(data.organization.id),
      name: String(data.organization.name ?? ""),
      code: data.organization.code ?? null,
      status: String(data.organization.status ?? ""),
    },
  }
}

export async function updateCompany(
  id: number,
  payload: UpdateCompanyPayload,
): Promise<CompanyResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(`${BACKEND_URL}/api/companies/${id}`, {
    method: "PATCH",
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
        : undefined) || "No se pudo actualizar la empresa"
    throw new Error(message)
  }

  return data as CompanyResponse
}

