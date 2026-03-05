import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { fetchSubscriptionSummary } from "@/lib/subscription-summary"
import type { SubscriptionSummary } from "@/types/subscription"
import { listOrganizationsWithCompanies } from "@/app/dashboard/tenancy/tenancy.api"
import { buildGlobalPlanUsage, type GlobalPlanUsage } from "./plan-utils"

// ── Input ──────────────────────────────────────────────────────

interface UseGlobalUsageInput {
  accessReady: boolean
  isGlobalSuperAdmin: boolean
  requestedOrgId: number | null
  shouldAutoFocus: boolean
  planSectionRef: React.RefObject<HTMLDivElement | null>
}

// ── Hook ───────────────────────────────────────────────────────

export function useGlobalUsage({
  accessReady,
  isGlobalSuperAdmin,
  requestedOrgId,
  shouldAutoFocus,
  planSectionRef,
}: UseGlobalUsageInput) {
  const [globalUsage, setGlobalUsage] = useState<GlobalPlanUsage[]>([])
  const [globalUsageLoading, setGlobalUsageLoading] = useState(false)
  const [globalUsageError, setGlobalUsageError] = useState<string | null>(null)
  const [globalSearch, setGlobalSearch] = useState("")
  const [globalPageSize, setGlobalPageSize] = useState(10)
  const [globalPage, setGlobalPage] = useState(1)
  const [globalSelectedOrgId, setGlobalSelectedOrgId] = useState<number | null>(null)
  const [globalSelectedSummary, setGlobalSelectedSummary] = useState<SubscriptionSummary | null>(null)
  const cleanedQueryRef = useRef(false)

  // ── Fetch all orgs ───────────────────────────────────────────
  const refreshGlobalUsage = useCallback(async () => {
    if (!isGlobalSuperAdmin) return
    setGlobalUsageLoading(true)
    try {
      const organizations = await listOrganizationsWithCompanies()
      const rows = await Promise.all(
        organizations.map(async (org) => {
          try {
            const summary = await fetchSubscriptionSummary(org.id)
            return buildGlobalPlanUsage(org, summary)
          } catch (error) {
            console.error("[plan] resumen global", org.id, error)
            return buildGlobalPlanUsage(org, null)
          }
        }),
      )
      rows.sort((a, b) => a.orgName.localeCompare(b.orgName, "es", { sensitivity: "base" }))
      setGlobalUsage(rows)
      setGlobalUsageError(null)
    } catch (error) {
      console.error("[plan] listado global", error)
      setGlobalUsage([])
      setGlobalUsageError("No pudimos consultar las organizaciones.")
    } finally {
      setGlobalUsageLoading(false)
    }
  }, [isGlobalSuperAdmin])

  // ── Auto-load on mount ───────────────────────────────────────
  useEffect(() => {
    if (!accessReady || !isGlobalSuperAdmin) return
    void refreshGlobalUsage()
  }, [accessReady, isGlobalSuperAdmin, refreshGlobalUsage])

  // ── Auto-focus requested org ─────────────────────────────────
  useEffect(() => {
    if (!accessReady || !isGlobalSuperAdmin) return
    if (!requestedOrgId) return
    if (globalSelectedOrgId !== requestedOrgId) {
      setGlobalSelectedOrgId(requestedOrgId)
      setGlobalSelectedSummary(null)
    }
  }, [accessReady, isGlobalSuperAdmin, requestedOrgId, globalSelectedOrgId])

  // ── Scroll to plan section ───────────────────────────────────
  useEffect(() => {
    if (!accessReady || !isGlobalSuperAdmin) return
    if (!shouldAutoFocus && !requestedOrgId) return
    const target = planSectionRef.current
    if (!target) return
    const raf = requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    })
    if (!cleanedQueryRef.current && (requestedOrgId || shouldAutoFocus)) {
      cleanedQueryRef.current = true
      setTimeout(() => {
        if (typeof window !== "undefined") {
          const cleanPath = window.location.pathname
          window.history.replaceState(null, "", cleanPath)
        }
      }, 350)
    }
    return () => cancelAnimationFrame(raf)
  }, [accessReady, isGlobalSuperAdmin, shouldAutoFocus, requestedOrgId, planSectionRef])

  // ── Reset on role change ─────────────────────────────────────
  useEffect(() => {
    if (!isGlobalSuperAdmin) {
      setGlobalUsage([])
      setGlobalUsageLoading(false)
      setGlobalUsageError(null)
      setGlobalSearch("")
      setGlobalSelectedOrgId(null)
      setGlobalSelectedSummary(null)
    }
  }, [isGlobalSuperAdmin])

  // ── Filtering & pagination ───────────────────────────────────
  const filteredGlobalUsage = useMemo(() => {
    const needle = globalSearch.trim().toLowerCase()
    if (!needle) return globalUsage
    return globalUsage.filter(
      (row) =>
        row.orgName.toLowerCase().includes(needle) ||
        row.planName.toLowerCase().includes(needle) ||
        row.planCode.toLowerCase().includes(needle),
    )
  }, [globalUsage, globalSearch])

  useEffect(() => {
    setGlobalPage(1)
  }, [globalSearch, globalPageSize])

  useEffect(() => {
    setGlobalPage(1)
  }, [filteredGlobalUsage.length])

  const totalPages = Math.max(1, Math.ceil(Math.max(filteredGlobalUsage.length, 1) / globalPageSize))

  useEffect(() => {
    if (globalPage > totalPages) {
      setGlobalPage(totalPages)
    }
  }, [totalPages, globalPage])

  const startIndex = filteredGlobalUsage.length === 0 ? 0 : (globalPage - 1) * globalPageSize
  const paginatedRows = filteredGlobalUsage.slice(startIndex, startIndex + globalPageSize)

  // ── Row selection ────────────────────────────────────────────
  const handleRowSelect = useCallback((row: GlobalPlanUsage) => {
    setGlobalSelectedOrgId(row.orgId)
    setGlobalSelectedSummary(row.summary)
  }, [])

  // ── Sync selected summary from global usage data ─────────────
  useEffect(() => {
    if (!isGlobalSuperAdmin) return
    if (!globalSelectedOrgId) return
    if (globalUsageLoading) return
    const match = globalUsage.find((row) => row.orgId === globalSelectedOrgId)
    if (!match) {
      if (requestedOrgId && globalSelectedOrgId === requestedOrgId) {
        return
      }
      setGlobalSelectedOrgId(null)
      setGlobalSelectedSummary(null)
      return
    }
    if (match.summary !== globalSelectedSummary) {
      setGlobalSelectedSummary(match.summary)
    }
  }, [
    globalUsage,
    globalUsageLoading,
    globalSelectedOrgId,
    globalSelectedSummary,
    isGlobalSuperAdmin,
    requestedOrgId,
  ])

  return {
    loading: globalUsageLoading,
    error: globalUsageError,
    search: globalSearch,
    setSearch: setGlobalSearch,
    page: globalPage,
    setPage: setGlobalPage,
    pageSize: globalPageSize,
    setPageSize: setGlobalPageSize,
    filteredRows: filteredGlobalUsage,
    paginatedRows,
    totalPages,
    totalRows: filteredGlobalUsage.length,
    selectedOrgId: globalSelectedOrgId,
    selectedSummary: globalSelectedSummary,
    onSelect: handleRowSelect,
    refresh: refreshGlobalUsage,
  }
}
