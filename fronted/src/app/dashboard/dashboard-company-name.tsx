"use client"

import { type ReactElement } from "react"

import { useQuery } from "@tanstack/react-query"
import { useSiteSettings } from "@/context/site-settings-context"
import { getCurrentTenant } from "@/app/dashboard/tenancy/tenancy.api"
import { setTenantSelection } from "@/utils/tenant-preferences"
import { useTenantSelection } from "@/context/tenant-selection-context"

export function DashboardCompanyName(): ReactElement {
  const { settings } = useSiteSettings()
  const { selection } = useTenantSelection()

  const { data: tenantSummary } = useQuery({
    queryKey: ["tenant", selection.orgId, selection.companyId, "currentTenant"],
    queryFn: async () => {
      const summary = await getCurrentTenant()
      const resolvedOrg = summary.organization ?? null
      const resolvedCompany = summary.company ?? null

      const resolvedSelection = {
        orgId: resolvedOrg?.id ?? null,
        companyId: resolvedCompany?.id ?? null,
      }
      if (
        resolvedSelection.orgId !== (selection.orgId ?? null) ||
        resolvedSelection.companyId !== (selection.companyId ?? null)
      ) {
        setTenantSelection(resolvedSelection)
      }

      return {
        organizationName: resolvedOrg?.name?.trim() || null,
        companyName: resolvedCompany?.name?.trim() || null,
      }
    },
    enabled: selection.orgId !== null,
  })

  const organizationName = tenantSummary?.organizationName ?? null
  const companyName = tenantSummary?.companyName ?? null

  const siteCompanyName = settings.company?.name?.trim() ?? null
  const displayCompanyName =
    companyName && companyName.length > 0
      ? companyName
      : siteCompanyName && siteCompanyName.length > 0
        ? siteCompanyName
        : "Nombre de la empresa"

  const displayOrganizationName =
    organizationName && organizationName.length > 0 ? organizationName : null

  const displayName = displayOrganizationName
    ? `${displayOrganizationName} - ${displayCompanyName}`
    : displayCompanyName

  return <span title={displayName}>{displayName}</span>
}
