import { headers, cookies } from 'next/headers'

import { TENANT_COOKIE_NAME, parseTenantCookie } from '@/lib/tenant/tenant-shared'

const ORG_COOKIE = 'tenant_org_id'
const COMPANY_COOKIE = 'tenant_company_id'

export type RequestTenantContext = {
  slug: string | null
  organizationId: number | null
  companyId: number | null
}

export async function getRequestTenant(): Promise<RequestTenantContext> {
  const incomingHeaders = await headers()
  const slugHeader = incomingHeaders.get('x-tenant-slug')
  const orgIdHeader = incomingHeaders.get('x-org-id')
  const companyIdHeader = incomingHeaders.get('x-company-id')

  let slug = slugHeader ?? null
  let organizationId: number | null =
    orgIdHeader !== null ? Number(orgIdHeader) : null
  let companyId: number | null =
    companyIdHeader !== null ? Number(companyIdHeader) : null

  if (
    !organizationId ||
    Number.isNaN(organizationId) ||
    !companyId ||
    Number.isNaN(companyId)
  ) {
    const cookieStore = await cookies()

    if (!organizationId || Number.isNaN(organizationId)) {
      const cookieValue = cookieStore.get(TENANT_COOKIE_NAME)?.value ?? null
      const cookiePayload = parseTenantCookie(cookieValue)
      if (cookiePayload) {
        slug = slug ?? cookiePayload.slug
        organizationId = cookiePayload.organizationId
      }
    }

    if (!organizationId || Number.isNaN(organizationId)) {
      const rawOrg = cookieStore.get(ORG_COOKIE)?.value ?? null
      const parsedOrg = rawOrg ? Number(rawOrg) : null
      if (parsedOrg && Number.isFinite(parsedOrg)) {
        organizationId = parsedOrg
      }
    }

    if (!companyId || Number.isNaN(companyId)) {
      const rawCompany = cookieStore.get(COMPANY_COOKIE)?.value ?? null
      const parsedCompany = rawCompany ? Number(rawCompany) : null
      if (parsedCompany && Number.isFinite(parsedCompany)) {
        companyId = parsedCompany
      }
    }
  }

  if (!slug) {
    slug = null
  }

  if (!organizationId || Number.isNaN(organizationId)) {
    organizationId = null
  }

  if (!companyId || Number.isNaN(companyId)) {
    companyId = null
  }

  return { slug, organizationId, companyId }
}

export async function requireRequestTenant(): Promise<Required<RequestTenantContext>> {
  const tenant = await getRequestTenant()
  if (!tenant.slug || !tenant.organizationId || !tenant.companyId) {
    throw new Error('Tenant context is not available for this request')
  }
  return {
    slug: tenant.slug,
    organizationId: tenant.organizationId,
    companyId: tenant.companyId,
  }
}
