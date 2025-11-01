"use client"

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react"

import { useSiteSettings } from "@/context/site-settings-context"
import { getCurrentTenant } from "@/app/dashboard/tenancy/tenancy.api"
import {
  TENANT_SELECTION_EVENT,
  getTenantSelection,
  type TenantSelection,
} from "@/utils/tenant-preferences"

export function DashboardCompanyName(): ReactElement {
  const { settings } = useSiteSettings()
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)

  const lastResolvedOrgIdRef = useRef<number | null>(null)
  const lastResolvedCompanyIdRef = useRef<number | null>(null)
  const lastRequestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    [],
  )

  const resolveTenantDisplay = useCallback(
    async (providedSelection?: TenantSelection) => {
      lastRequestIdRef.current += 1
      const requestId = lastRequestIdRef.current

      try {
        const selection = providedSelection ?? (await getTenantSelection())
        const orgId = selection.orgId ?? null

        if (orgId === null) {
          lastResolvedOrgIdRef.current = null
          lastResolvedCompanyIdRef.current = null
          if (isMountedRef.current && requestId === lastRequestIdRef.current) {
            setOrganizationName(null)
            setCompanyName(null)
          }
          return
        }

        const summary = await getCurrentTenant()

        if (!isMountedRef.current || requestId !== lastRequestIdRef.current) {
          return
        }

        const resolvedOrg = summary.organization ?? null
        const resolvedCompany = summary.company ?? null

        lastResolvedOrgIdRef.current = resolvedOrg?.id ?? null
        lastResolvedCompanyIdRef.current = resolvedCompany?.id ?? null

        const normalizedOrgName = resolvedOrg?.name?.trim() ?? ""
        const normalizedCompanyName = resolvedCompany?.name?.trim() ?? ""

        setOrganizationName(normalizedOrgName.length > 0 ? normalizedOrgName : null)
        setCompanyName(normalizedCompanyName.length > 0 ? normalizedCompanyName : null)
      } catch {
        if (!isMountedRef.current || requestId !== lastRequestIdRef.current) {
          return
        }

        lastResolvedOrgIdRef.current = null
        lastResolvedCompanyIdRef.current = null
        setOrganizationName(null)
        setCompanyName(null)
      }
    },
    [],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    void resolveTenantDisplay()

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TenantSelection>).detail
      void resolveTenantDisplay(detail)
    }

    window.addEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    }
  }, [resolveTenantDisplay])

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
