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
  companies?: Array<{
    name: string
    legalName?: string | null
    taxId?: string | null
    status?: string
  }>
}

export interface UpdateOrganizationPayload {
  name?: string
  code?: string | null
  status?: string
  slug?: string | null
  units?: OrganizationUnitInput[]
  companies?: CompanyResponse[]
}

export interface OrganizationSuperAdmin {
  id: number
  username: string
  email: string
}

export type SunatEnvironment = "BETA" | "PROD"

export interface CompanyDocumentSequence {
  id: number
  documentType: string
  serie: string
  nextCorrelative: number
  correlativeLength: number
  createdAt: string
  updatedAt: string
}

export interface CompanyDocumentSequenceInput {
  documentType: string
  serie: string
  nextCorrelative: string
  correlativeLength?: number
}

export interface CompanyResponse {
  id: number
  organizationId: number
  name: string
  businessVertical?: string | null
  legalName: string | null
  taxId: string | null
  status: string
  defaultQuoteMargin?: number | null
  sunatEnvironment: SunatEnvironment
  sunatRuc: string | null
  sunatBusinessName: string | null
  sunatAddress: string | null
  sunatPhone: string | null
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  sunatSolUserBeta: string | null
  sunatSolPasswordBeta: string | null
  sunatCertPathBeta: string | null
  sunatKeyPathBeta: string | null
  sunatSolUserProd: string | null
  sunatSolPasswordProd: string | null
  sunatCertPathProd: string | null
  sunatKeyPathProd: string | null
  createdAt: string
  updatedAt: string
  documentSequences: CompanyDocumentSequence[]
}

export interface OrganizationResponse {
  id: number
  name: string
  code: string | null
  status: string
  slug?: string | null
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
  company: { id: number; name: string; businessVertical?: string | null } | null
  companies: Array<{ id: number; name: string; businessVertical?: string | null }>
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
  sunatEnvironment?: SunatEnvironment
  sunatRuc?: string | null
  sunatBusinessName?: string | null
  sunatAddress?: string | null
  sunatPhone?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  defaultQuoteMargin?: number | null
  sunatSolUserBeta?: string | null
  sunatSolPasswordBeta?: string | null
  sunatSolUserProd?: string | null
  sunatSolPasswordProd?: string | null
  documentSequences?: CompanyDocumentSequenceInput[]
}

export interface SunatTransmission {
  id: number
  companyId: number
  organizationId: number | null
  saleId: number | null
  environment: SunatEnvironment
  documentType: string
  serie: string | null
  correlativo: string | null
  zipFilePath: string | null
  ticket: string | null
  status: string
  response: unknown
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface SunatStoredPdf {
  id: number
  organizationId: number
  companyId: number
  type: string
  filename: string
  relativePath: string
  createdBy: number | null
  createdAt: string
}

function mapCompanyResponse(data: any): CompanyResponse {
  return {
    id: Number(data.id),
    organizationId: Number(data.organizationId),
    name: String(data.name ?? ""),
    legalName: data.legalName ?? null,
    taxId: data.taxId ?? null,
    status: String(data.status ?? ""),
    defaultQuoteMargin:
      typeof data.defaultQuoteMargin === "number" ? data.defaultQuoteMargin : null,
    sunatEnvironment: (data.sunatEnvironment === "PROD" ? "PROD" : "BETA") as SunatEnvironment,
    sunatRuc: data.sunatRuc ?? null,
    sunatBusinessName: data.sunatBusinessName ?? null,
    sunatAddress: data.sunatAddress ?? null,
    sunatPhone: data.sunatPhone ?? null,
    logoUrl: data.logoUrl ?? null,
    primaryColor: data.primaryColor ?? null,
    secondaryColor: data.secondaryColor ?? null,
    sunatSolUserBeta: data.sunatSolUserBeta ?? null,
    sunatSolPasswordBeta: data.sunatSolPasswordBeta ?? null,
    sunatCertPathBeta: data.sunatCertPathBeta ?? null,
    sunatKeyPathBeta: data.sunatKeyPathBeta ?? null,
    sunatSolUserProd: data.sunatSolUserProd ?? null,
    sunatSolPasswordProd: data.sunatSolPasswordProd ?? null,
    sunatCertPathProd: data.sunatCertPathProd ?? null,
    sunatKeyPathProd: data.sunatKeyPathProd ?? null,
    createdAt: new Date(data.createdAt).toISOString(),
    updatedAt: new Date(data.updatedAt).toISOString(),
    documentSequences: Array.isArray(data.documentSequences)
      ? data.documentSequences.map((sequence: any) => {
          const length =
            typeof sequence?.correlativeLength === "number"
              ? sequence.correlativeLength
              : typeof sequence?.nextCorrelative === "number"
                ? String(sequence.nextCorrelative).length
                : 3
          return {
            id: Number(sequence.id),
            documentType: String(sequence.documentType ?? "").toUpperCase(),
            serie: String(sequence.serie ?? ""),
            nextCorrelative: Number(sequence.nextCorrelative ?? 1),
            correlativeLength: length,
            createdAt: new Date(sequence.createdAt ?? data.createdAt ?? new Date()).toISOString(),
            updatedAt: new Date(sequence.updatedAt ?? data.updatedAt ?? new Date()).toISOString(),
          }
        })
      : [],
  }
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

export async function updateOrganization(
  id: number,
  payload: UpdateOrganizationPayload,
): Promise<OrganizationResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const body: Record<string, unknown> = {}
  if (typeof payload.name === "string") {
    body.name = payload.name
  }
  if (payload.code !== undefined) {
    body.code = payload.code
  }
  if (payload.status !== undefined) {
    body.status = payload.status
  }
  if (payload.slug !== undefined) {
    body.slug = payload.slug
  }
  if (payload.units !== undefined) {
    body.units = payload.units
  }
  if (payload.companies !== undefined) {
    body.companies = payload.companies
  }

  headers["Content-Type"] = "application/json"

  const response = await fetch(`${BACKEND_URL}/api/tenancy/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (typeof data === "object" && data && "message" in data
        ? (data as { message?: string }).message
        : undefined) || "No se pudo actualizar la organizacion"
    throw new Error(message)
  }

  return data as OrganizationResponse
}

export async function getCurrentTenant(): Promise<CurrentTenantResponse> {
  const headers = await getAuthHeaders()
  if (!headers.Authorization) {
    return { organization: null, company: null, companies: [] }
  }

  const performRequest = async () => {
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

  if (response.status === 401) {
    return { organization: null, company: null, companies: [] }
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
    return []
  }

  const response = await fetch(`${BACKEND_URL}/api/tenancy`, {
    headers,
    cache: "no-store",
  })

  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    if (response.status === 401) {
      return []
    }
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

export async function searchUsers(
  search: string,
  orgId?: number | null,
  companyId?: number | null,
): Promise<UserSummary[]> {
  const trimmed = search.trim()
  if (!trimmed) {
    return []
  }

  const headers = await getAuthHeaders({
    orgId: orgId ?? undefined,
    companyId: companyId ?? undefined,
  })
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

export interface ValidateCompanyPayload {
  organizationId?: number | null
  companyId?: number | null
  legalName?: string | null
  taxId?: string | null
}

export async function validateCompanyFields(
  payload: ValidateCompanyPayload,
): Promise<{ legalNameAvailable: boolean; taxIdAvailable: boolean }> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(`${BACKEND_URL}/api/companies/validate`, {
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
        : undefined) || "No se pudo validar la empresa"
    throw new Error(message)
  }

  return {
    legalNameAvailable: Boolean((data as any).legalNameAvailable),
    taxIdAvailable: Boolean((data as any).taxIdAvailable),
  }
}

export interface ValidateOrganizationNamePayload {
  name: string
}

export async function validateOrganizationName(
  payload: ValidateOrganizationNamePayload,
): Promise<{ nameAvailable: boolean }> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(`${BACKEND_URL}/api/tenancy/validate-name`, {
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
        : undefined) || "No se pudo validar la organizacion"
    throw new Error(message)
  }

  return {
    nameAvailable: Boolean((data as any).nameAvailable),
  }
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
      ? item.companies.map((company: any) => mapCompanyResponse(company))
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

  const data = await response.json()
  const normalized = mapCompanyResponse(data)
  return {
    ...normalized,
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

  return mapCompanyResponse(data)
}

export type SunatUploadEnv = "beta" | "prod"
export type SunatUploadType = "cert" | "key"

export async function uploadCompanySunatFile(
  companyId: number,
  params: { env: SunatUploadEnv; type: SunatUploadType; file: File },
): Promise<CompanyResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const formData = new FormData()
  formData.append("file", params.file)

  const uploadHeaders: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      uploadHeaders[key] = value
    }
  }
  delete uploadHeaders["Content-Type"]

  const response = await fetch(
    `${BACKEND_URL}/api/companies/${companyId}/sunat/upload?env=${params.env}&type=${params.type}`,
    {
      method: "POST",
      headers: uploadHeaders,
      body: formData,
    },
  )

  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (typeof data === "object" && data && "message" in data
        ? (data as { message?: string }).message
        : undefined) || "No se pudo subir el archivo"
    throw new Error(message)
  }

  return mapCompanyResponse(data)
}

export async function uploadCompanyLogo(
  companyId: number,
  file: File,
): Promise<CompanyResponse> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const formData = new FormData()
  formData.append("file", file)

  const uploadHeaders: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      uploadHeaders[key] = value
    }
  }
  delete uploadHeaders["Content-Type"]

  const response = await fetch(`${BACKEND_URL}/api/companies/${companyId}/logo`, {
    method: "POST",
    headers: uploadHeaders,
    body: formData,
  })

  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (typeof data === "object" && data && "message" in data
        ? (data as { message?: string }).message
        : undefined) || "No se pudo actualizar el logo"
    throw new Error(message)
  }

  return mapCompanyResponse(data)
}

export async function getCompanySunatTransmissions(
  id: number,
): Promise<SunatTransmission[]> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return []
  }

  const response = await fetch(
    `${BACKEND_URL}/api/companies/${id}/sunat/transmissions`,
    {
      headers,
      cache: "no-store",
    },
  )

  if (!response.ok) {
    if (response.status === 401) {
      return []
    }
    throw new Error("No se pudieron obtener los envios SUNAT")
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    return []
  }

  return data.map((item: any) => ({
    id: Number(item.id),
    companyId: Number(item.companyId),
    organizationId: item.organizationId ? Number(item.organizationId) : null,
    saleId: item.saleId ? Number(item.saleId) : null,
    environment: (item.environment === "PROD" ? "PROD" : "BETA") as SunatEnvironment,
    documentType: String(item.documentType ?? ""),
    serie: item.serie ?? null,
    correlativo: item.correlativo ?? null,
    zipFilePath: item.zipFilePath ?? null,
    ticket: item.ticket ?? null,
    status: String(item.status ?? "PENDING"),
    response: item.response ?? null,
    errorMessage: item.errorMessage ?? null,
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
  }))
}

export async function getSunatStoredPdfs(): Promise<SunatStoredPdf[]> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return []
  }

  const response = await fetch(`${BACKEND_URL}/api/sunat/pdfs`, {
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    if (response.status === 401) {
      return []
    }
    throw new Error("No se pudieron obtener los PDFs almacenados")
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    return []
  }

  return data.map((item: any) => ({
    id: Number(item.id),
    organizationId: Number(item.organizationId),
    companyId: Number(item.companyId),
    type: String(item.type ?? "factura"),
    filename: String(item.filename ?? ""),
    relativePath: item.relativePath ?? "",
    createdBy:
      typeof item.createdBy === "number" ? item.createdBy : item.createdBy ? Number(item.createdBy) : null,
    createdAt: new Date(item.createdAt ?? new Date()).toISOString(),
  }))
}

export async function retrySunatTransmission(transmissionId: number) {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(
    `${BACKEND_URL}/api/sunat/transmissions/${transmissionId}/retry`,
    {
      method: "POST",
      headers,
    },
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = typeof data === "object" && data && "message" in data ? (data as any).message : null
    throw new Error(message || "No se pudo reintentar el envío")
  }

  return response.json().catch(() => ({}))
}

export interface CompanyVerticalMigrationStats {
  total: number
  migrated: number
  legacy: number
  percentage: number
}

export type OrganizationVerticalMigrationStats = CompanyVerticalMigrationStats

export type VerticalProductFieldType =
  | "text"
  | "number"
  | "select"
  | "multi-select"
  | "color"
  | "textarea"
  | "date"
  | "json"

export interface VerticalProductSchemaField {
  key: string
  label: string
  type: VerticalProductFieldType
  options?: string[]
  required?: boolean
  group?: string
  generated?: boolean
}

export interface VerticalProductSchema {
  inventoryTracking: "by_product" | "by_variant" | "by_ingredient" | "lot_tracking"
  pricingModel: "uniform" | "by_variant" | "by_modifiers"
  fields: VerticalProductSchemaField[]
}

export interface VerticalFeatures {
  sales: boolean
  inventory: boolean
  production: boolean
  reservations: boolean
  appointments: boolean
  multiWarehouse: boolean
  lotTracking: boolean
  serialNumbers: boolean
  tableManagement: boolean
  kitchenDisplay: boolean
  workOrders: boolean
  projectTracking: boolean
  posIntegration: boolean
  ecommerceIntegration: boolean
  deliveryPlatforms: boolean
}

export interface VerticalUIConfig {
  theme?: "default" | "restaurant" | "retail" | "services"
  dashboardLayout: "standard" | "sales-focused" | "production-focused"
  primaryColor?: string
  templates: {
    invoice: string
    receipt: string
    report: string
  }
  customMenuItems?: Array<{
    label: string
    path: string
    icon: string
  }>
}

export interface VerticalConfigPayload {
  name: string
  displayName: string
  description: string
  features: VerticalFeatures
  ui: VerticalUIConfig
  productSchema: VerticalProductSchema
  alternateSchemas?: Record<string, VerticalProductSchema>
  version: string
}

export interface CompanyVerticalInfo {
  companyId: number
  organizationId: number
  businessVertical: VerticalName
  productSchemaEnforced: boolean
  migration: CompanyVerticalMigrationStats | null
  config: VerticalConfigPayload | null
}

export type OrganizationVerticalInfo = CompanyVerticalInfo

export type VerticalName =
  | "GENERAL"
  | "COMPUTERS"
  | "RETAIL"
  | "RESTAURANTS"
  | "SERVICES"
  | "MANUFACTURING"

export interface VerticalCompatibilityResult {
  isCompatible: boolean
  errors: string[]
  warnings: string[]
  requiresMigration: boolean
  affectedModules: string[]
  estimatedDowntime: number
  dataImpact: {
    tables: Array<{
      name: string
      recordCount: number
      willBeHidden: boolean
      willBeMigrated: boolean
      backupRecommended: boolean
    }>
    customFields: Array<{
      entity: string
      field: string
      willBeRemoved: boolean
    }>
    integrations: string[]
  }
}

export interface UpdateVerticalPayloadRequest {
  vertical: VerticalName
  reason: string
  force?: boolean
}

export interface UpdateCompanyVerticalResponse {
  companyId: number
  organizationId: number | null
  businessVertical: VerticalName
  warnings: string[]
}

export async function fetchCompanyVerticalInfo(
  companyId: number,
): Promise<CompanyVerticalInfo | null> {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return null
  }

  const response = await fetch(`${BACKEND_URL}/api/companies/${companyId}/vertical`, {
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json().catch(() => null)) as
    | {
        companyId?: number
        organizationId?: number
        businessVertical?: string
        productSchemaEnforced?: boolean
        migration?: Partial<CompanyVerticalMigrationStats> | null
        config?: VerticalConfigPayload | null
      }
    | null

  if (
    !data ||
    typeof data.companyId !== "number" ||
    typeof data.organizationId !== "number" ||
    typeof data.businessVertical !== "string"
  ) {
    return null
  }

  const migration =
    data.migration && typeof data.migration === "object"
      ? {
          total: Number(data.migration.total ?? 0),
          migrated: Number(data.migration.migrated ?? 0),
          legacy: Number(data.migration.legacy ?? 0),
          percentage: Number.isFinite(Number(data.migration.percentage))
            ? Number(data.migration.percentage)
            : 0,
        }
      : null

  return {
    companyId: data.companyId ?? companyId,
    organizationId: data.organizationId,
    businessVertical: (data.businessVertical as VerticalName) ?? "GENERAL",
    productSchemaEnforced: Boolean(data.productSchemaEnforced),
    migration,
    config: data.config ?? null,
  }
}

export async function setCompanyProductSchemaEnforced(
  companyId: number,
  enforced: boolean,
): Promise<{ organizationId: number | null; companyId: number; productSchemaEnforced: boolean }> {
  const headers = await getAuthHeaders()
  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(
    `${BACKEND_URL}/api/companies/${companyId}/vertical/enforce-product-schema`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ enforced }),
    },
  )

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    const message =
      (errorPayload && typeof errorPayload === "object" && "message" in errorPayload
        ? (errorPayload as { message?: string }).message
        : undefined) || "No se pudo actualizar la validación estricta"
    throw new Error(message)
  }

  const payload = (await response.json().catch(() => null)) as
    | { organizationId?: number; companyId?: number; productSchemaEnforced?: boolean }
    | null

  return {
    organizationId: payload?.organizationId ?? null,
    companyId: payload?.companyId ?? companyId,
    productSchemaEnforced: Boolean(payload?.productSchemaEnforced ?? enforced),
  }
}

export async function checkCompanyVerticalCompatibility(
  companyId: number,
  targetVertical: VerticalName,
): Promise<VerticalCompatibilityResult> {
  const headers = await getAuthHeaders()
  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(
    `${BACKEND_URL}/api/companies/${companyId}/vertical/compatibility-check`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ targetVertical }),
    },
  )

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? (payload as { message?: string }).message
        : undefined) || "No se pudo validar la compatibilidad del vertical"
    throw new Error(message)
  }

  const data = (await response.json().catch(() => null)) as VerticalCompatibilityResult | null
  if (!data) {
    throw new Error("Respuesta inesperada del servicio de compatibilidad")
  }
  return data
}

export async function updateCompanyVertical(
  companyId: number,
  payload: UpdateVerticalPayloadRequest,
): Promise<UpdateCompanyVerticalResponse> {
  const headers = await getAuthHeaders()
  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(`${BACKEND_URL}/api/companies/${companyId}/vertical`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  })

  const contentType = response.headers.get("content-type") || ""
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "message" in data
        ? (data as { message?: string }).message
        : undefined) || "No se pudo actualizar el vertical"
    throw new Error(message)
  }

  const organizationId =
    data && typeof data === "object" && "organizationId" in data
      ? Number((data as { organizationId?: number }).organizationId ?? NaN)
      : NaN

  const companyFromPayload =
    data && typeof data === "object" && "companyId" in data
      ? Number((data as { companyId: number }).companyId)
      : companyId

  return {
    companyId: companyFromPayload,
    organizationId: Number.isFinite(organizationId) ? organizationId : null,
    businessVertical:
      (data && typeof data === "object" && "businessVertical" in data
        ? ((data as { businessVertical: string }).businessVertical as VerticalName)
        : payload.vertical) ?? payload.vertical,
    warnings:
      (data && typeof data === "object" && Array.isArray((data as { warnings?: unknown }).warnings)
        ? ((data as { warnings?: string[] }).warnings ?? [])
        : []),
  }
}

export async function rollbackCompanyVertical(
  companyId: number,
): Promise<{ organizationId: number | null; companyId: number; businessVertical: VerticalName }> {
  const headers = await getAuthHeaders()
  if (!headers.Authorization) {
    throw new Error("No se encontro un token de autenticacion")
  }

  const response = await fetch(`${BACKEND_URL}/api/companies/${companyId}/vertical/rollback`, {
    method: "POST",
    headers,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? (payload as { message?: string }).message
        : undefined) || "No se pudo revertir el vertical"
    throw new Error(message)
  }

  const data = (await response.json().catch(() => null)) as
    | { organizationId?: number; companyId?: number; businessVertical?: string }
    | null

  return {
    organizationId: data?.organizationId ?? null,
    companyId: data?.companyId ?? companyId,
    businessVertical: (data?.businessVertical as VerticalName) ?? "GENERAL",
  }
}

