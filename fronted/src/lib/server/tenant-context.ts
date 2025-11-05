import { headers, cookies } from 'next/headers'

import { TENANT_COOKIE_NAME, parseTenantCookie } from '@/lib/tenant/tenant-shared'

export type RequestTenantContext = {
  slug: string | null
  organizationId: number | null
}

export async function getRequestTenant(): Promise<RequestTenantContext> {
  const incomingHeaders = await headers()
  const slugHeader = incomingHeaders.get('x-tenant-slug')
  const orgIdHeader = incomingHeaders.get('x-org-id')

  let slug = slugHeader ?? null
  let organizationId: number | null =
    orgIdHeader !== null ? Number(orgIdHeader) : null

  if (!organizationId || Number.isNaN(organizationId)) {
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get(TENANT_COOKIE_NAME)?.value ?? null
    const cookiePayload = parseTenantCookie(cookieValue)
    if (cookiePayload) {
      slug = slug ?? cookiePayload.slug
      organizationId = cookiePayload.organizationId
    }
  }

  if (!slug) {
    slug = null
  }

  if (!organizationId || Number.isNaN(organizationId)) {
    organizationId = null
  }

  return { slug, organizationId }
}

export async function requireRequestTenant(): Promise<Required<RequestTenantContext>> {
  const tenant = await getRequestTenant()
  if (!tenant.slug || !tenant.organizationId) {
    throw new Error('Tenant context is not available for this request')
  }
  return {
    slug: tenant.slug,
    organizationId: tenant.organizationId,
  }
}
