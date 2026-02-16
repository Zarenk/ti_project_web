"use client"

import { useEffect, useRef, useState, type ReactElement } from "react"

import { useSiteSettings } from "@/context/site-settings-context"
import { getCurrentTenant } from "@/app/dashboard/tenancy/tenancy.api"
import { setTenantSelection } from "@/utils/tenant-preferences"
import { useTenantSelection } from "@/context/tenant-selection-context"

export function DashboardCompanyName(): ReactElement {
  const { settings } = useSiteSettings()
  const { selection, version } = useTenantSelection()
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const lastRequestIdRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    const resolveTenantDisplay = async () => {
      lastRequestIdRef.current += 1
      const requestId = lastRequestIdRef.current

      try {
        const summary = await getCurrentTenant()
        if (cancelled || requestId !== lastRequestIdRef.current) {
          return
        }

        const resolvedOrg = summary.organization ?? null
        const resolvedCompany = summary.company ?? null

        const normalizedOrgName = resolvedOrg?.name?.trim() ?? ""
        const normalizedCompanyName = resolvedCompany?.name?.trim() ?? ""

        setOrganizationName(normalizedOrgName.length > 0 ? normalizedOrgName : null)
        setCompanyName(normalizedCompanyName.length > 0 ? normalizedCompanyName : null)

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
      } catch {
        if (cancelled || requestId !== lastRequestIdRef.current) {
          return
        }
        setOrganizationName(null)
        setCompanyName(null)
      }
    }

    void resolveTenantDisplay()

    return () => {
      cancelled = true
    }
  }, [selection.orgId, selection.companyId, version])

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
