import { getUnansweredMessages } from "@/app/dashboard/messages/messages.api"
import { getCurrentTenant, listOrganizations } from "@/app/dashboard/tenancy/tenancy.api"

export async function prefetchTenantData(options: {
  includeMessages?: boolean
  includeOrganizations?: boolean
} = {}) {
  const tasks: Array<Promise<unknown>> = [getCurrentTenant()]

  if (options.includeMessages) {
    tasks.push(getUnansweredMessages().catch(() => null))
  }

  if (options.includeOrganizations) {
    tasks.push(listOrganizations().catch(() => null))
  }

  await Promise.allSettled(tasks)
}
