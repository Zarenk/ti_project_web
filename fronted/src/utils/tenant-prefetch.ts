import { getUnansweredMessages } from "@/app/dashboard/messages/messages.api"
import { getCurrentTenant, listOrganizations } from "@/app/dashboard/tenancy/tenancy.api"
import type { TenantSelection } from "@/utils/tenant-preferences"
import { authFetch } from "@/utils/auth-fetch"

type PrefetchTenantOptions = {
  includeMessages?: boolean
  includeOrganizations?: boolean
  includeActivity?: boolean
  includePermissions?: boolean
}

export async function prefetchTenantData(
  selection: TenantSelection,
  options: PrefetchTenantOptions = {},
) {
  const tasks: Array<Promise<unknown>> = [getCurrentTenant().catch(() => null)]

  const shouldPrefetchActivity = options.includeActivity === true
  if (shouldPrefetchActivity) {
    tasks.push(prefetchRecentActivity().catch(() => null))
  }

  const shouldPrefetchPermissions = options.includePermissions ?? true
  if (shouldPrefetchPermissions) {
    tasks.push(prefetchSiteSettings(selection).catch(() => null))
  }

  if (options.includeMessages) {
    tasks.push(getUnansweredMessages().catch(() => null))
  }

  if (options.includeOrganizations) {
    tasks.push(listOrganizations().catch(() => null))
  }

  await Promise.allSettled(tasks)
}

async function prefetchRecentActivity() {
  const params = new URLSearchParams({
    page: "1",
    pageSize: "10",
  })
  await authFetch(`/account/activity?${params.toString()}`, {
    cache: "no-store",
  })
}

async function prefetchSiteSettings(selection: TenantSelection) {
  const tenantVersion = `${selection.orgId ?? "none"}::${selection.companyId ?? "none"}`
  const qs = new URLSearchParams({
    tenantVersion,
    ts: String(Date.now()),
  })
  await authFetch(`/site-settings?${qs.toString()}`, {
    cache: "no-store",
  })
}
