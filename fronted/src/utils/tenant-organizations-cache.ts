import type { OrganizationResponse } from "@/app/dashboard/tenancy/tenancy.api"

type CacheEntry = {
  organizations: OrganizationResponse[]
  timestamp: number
}

let organizationsCache: CacheEntry | null = null
const CACHE_TTL_MS = 60 * 1000

export function setOrganizationsCache(data: OrganizationResponse[]) {
  organizationsCache = {
    organizations: data,
    timestamp: Date.now(),
  }
}

export function getOrganizationsCache(
  maxAgeMs = CACHE_TTL_MS,
): OrganizationResponse[] | null {
  if (!organizationsCache) {
    return null
  }

  if (Date.now() - organizationsCache.timestamp > maxAgeMs) {
    organizationsCache = null
    return null
  }

  return organizationsCache.organizations
}

export async function warmOrganizationsCache(
  fetcher: () => Promise<OrganizationResponse[]>,
  maxAgeMs = CACHE_TTL_MS,
) {
  const cached = getOrganizationsCache(maxAgeMs)
  if (cached) {
    return cached
  }
  const organizations = await fetcher()
  setOrganizationsCache(organizations)
  return organizations
}
