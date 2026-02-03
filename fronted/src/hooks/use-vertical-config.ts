'use client'

import { useCallback, useEffect, useState } from "react"
import { fetchCompanyVerticalInfo, type OrganizationVerticalInfo } from "@/app/dashboard/tenancy/tenancy.api"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { useAuth } from "@/context/auth-context"

type CachedEntry = {
  data: OrganizationVerticalInfo
  expiresAt: number
}

const CACHE = new Map<number, CachedEntry>()
const CACHE_TTL_MS = 60 * 1000 // 1 minuto
export const VERTICAL_CONFIG_INVALIDATE_EVENT = "vertical-config:invalidate"

export function useVerticalConfig() {
  const { selection } = useTenantSelection()
  const { role } = useAuth()
  const companyId = selection.companyId
  const [info, setInfo] = useState<OrganizationVerticalInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [migration, setMigration] = useState<OrganizationVerticalInfo["migration"] | null>(null)
  const normalizedRole = role?.toString().trim().toUpperCase() ?? ""
  const disallowedRoles = new Set(["EMPLOYEE", "ADMIN", "SUPER_ADMIN_ORG"])

  const loadConfig = useCallback(
    async (force?: boolean) => {
      // Evita llamadas mientras el rol no está resuelto o si el rol no tiene permiso.
      if (!normalizedRole || disallowedRoles.has(normalizedRole)) {
        setInfo(null)
        setError(null)
        setMigration(null)
        return
      }
      if (!companyId) {
        setInfo(null)
        setError(null)
        setMigration(null)
        return
      }

      if (!force) {
        const cached = CACHE.get(companyId)
        if (cached && cached.expiresAt > Date.now()) {
          setInfo(cached.data)
          setError(null)
          setMigration(cached.data.migration ?? null)
          return
        }
      }

      setIsLoading(true)
      try {
        const payload = await fetchCompanyVerticalInfo(companyId)
        if (payload) {
          CACHE.set(companyId, { data: payload, expiresAt: Date.now() + CACHE_TTL_MS })
        }
        setInfo(payload)
        setMigration(payload?.migration ?? null)
        setError(null)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo obtener la configuración del vertical"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [companyId, disallowedRoles, normalizedRole],
  )

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  useEffect(() => {
    const handler = () => {
      void loadConfig(true)
    }
    window.addEventListener(VERTICAL_CONFIG_INVALIDATE_EVENT, handler)
    return () => {
      window.removeEventListener(VERTICAL_CONFIG_INVALIDATE_EVENT, handler)
    }
  }, [loadConfig])

  return {
    info,
    migration,
    isLoading,
    error,
    refresh: () => loadConfig(true),
  }
}
