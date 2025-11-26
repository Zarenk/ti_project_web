"use client"

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react"
import { Clock3, History, Laptop2 } from "lucide-react"
import { toast } from "sonner"

import {
  fetchContextHistory,
  restoreContextHistoryEntry,
  type ContextHistoryEntry,
} from "./context-history.api"
import { warmOrganizationsCache } from "@/utils/tenant-organizations-cache"
import { listOrganizations, type OrganizationResponse } from "@/app/dashboard/tenancy/tenancy.api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { trackEvent } from "@/lib/analytics"

const PAGE_SIZE = 10

type LookupMaps = {
  orgs: Record<number, string>
  companies: Record<number, string>
}

export function ContextHistoryList(): ReactElement {
  const [entries, setEntries] = useState<ContextHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [cursorStack, setCursorStack] = useState<Array<number | null>>([])
  const [currentCursor, setCurrentCursor] = useState<number | null>(null)
  const [restoringId, setRestoringId] = useState<number | null>(null)
  const [{ orgs, companies }, setLookup] = useState<LookupMaps>({
    orgs: {},
    companies: {},
  })
  const { refresh } = useTenantSelection()

  const loadHistory = useCallback(
    async (cursor: number | null, silent = false) => {
      setError(null)
      silent ? setRefreshing(true) : setLoading(true)
      try {
        const response = await fetchContextHistory({
          limit: PAGE_SIZE,
          cursor: cursor ?? undefined,
        })
        setEntries(response.items)
        setNextCursor(response.nextCursor)
        setCurrentCursor(cursor ?? null)
      } catch (err) {
        console.error("[context-history] fetch failed", err)
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el historial de contexto",
        )
      } finally {
        silent ? setRefreshing(false) : setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    loadHistory(null).catch(() => {
      /* handled */
    })
    warmOrganizationsCache(listOrganizations)
      .then((orgsList?: OrganizationResponse[] | null) => {
        if (cancelled || !Array.isArray(orgsList)) {
          return
        }
        const orgMap: Record<number, string> = {}
        const companyMap: Record<number, string> = {}
        for (const org of orgsList) {
          orgMap[org.id] = org.name
          if (Array.isArray(org.companies)) {
            for (const company of org.companies) {
              companyMap[company.id] = company.name
            }
          }
        }
        setLookup({ orgs: orgMap, companies: companyMap })
      })
      .catch(() => {
        /* ignore */
      })
    return () => {
      cancelled = true
    }
  }, [loadHistory])

  const pageNumber = cursorStack.length + 1
  const hasPrevious = cursorStack.length > 0
  const hasNext = nextCursor !== null

  const resolveOrgLabel = useCallback(
    (entry: ContextHistoryEntry) =>
      orgs[entry.orgId] ? `${orgs[entry.orgId]} (ID ${entry.orgId})` : `Organización #${entry.orgId}`,
    [orgs],
  )

  const resolveCompanyLabel = useCallback(
    (entry: ContextHistoryEntry) => {
      if (!entry.companyId) {
        return "Sin empresa"
      }
      return companies[entry.companyId]
        ? `${companies[entry.companyId]} (ID ${entry.companyId})`
        : `Empresa #${entry.companyId}`
    },
    [companies],
  )

  const formattedEntries = useMemo(
    () =>
      entries.map((entry) => ({
        entry,
        label: new Date(entry.createdAt).toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      })),
    [entries],
  )

  const handleRestore = useCallback(
    async (entry: ContextHistoryEntry) => {
      setRestoringId(entry.id)
      try {
        await restoreContextHistoryEntry(entry.id)
        toast.success("Contexto restaurado correctamente.")
        trackEvent("context_history_restore", {
          entryId: entry.id,
          orgId: entry.orgId,
          companyId: entry.companyId ?? null,
        })
        await refresh()
        await loadHistory(currentCursor ?? null, true)
      } catch (err) {
        console.error("[context-history] restore failed", err)
        toast.error(
          err instanceof Error
            ? err.message
            : "No se pudo restaurar el contexto seleccionado.",
        )
      } finally {
        setRestoringId(null)
      }
    },
    [currentCursor, loadHistory, refresh],
  )

  const handleNext = useCallback(() => {
    if (!hasNext || nextCursor == null) {
      return
    }
    setCursorStack((prev) => [...prev, currentCursor ?? null])
    void loadHistory(nextCursor, true)
  }, [currentCursor, hasNext, loadHistory, nextCursor])

  const handlePrevious = useCallback(() => {
    if (!hasPrevious) {
      return
    }
    const previousCursor = cursorStack[cursorStack.length - 1] ?? null
    setCursorStack((prev) => prev.slice(0, -1))
    void loadHistory(previousCursor, true)
  }, [cursorStack, hasPrevious, loadHistory])

  const handleManualRefresh = useCallback(() => {
    void loadHistory(currentCursor ?? null, true)
  }, [currentCursor, loadHistory])

  return (
    <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <CardHeader className="flex flex-col gap-2 border-b border-sky-50/70 dark:border-slate-700/60">
        <div className="flex flex-wrap items-center gap-2 text-slate-800 dark:text-slate-100">
          <History className="size-4 text-sky-600 dark:text-slate-200" />
          <CardTitle className="text-base sm:text-lg">
            Historial completo de contextos
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>Página {pageNumber}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={handleManualRefresh}
            disabled={loading || refreshing}
          >
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 py-6">
        {loading ? (
          <ListSkeleton />
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : formattedEntries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aún no registramos cambios recientes de organización.
          </p>
        ) : (
          <div className="space-y-3">
            {formattedEntries.map(({ entry, label }) => (
              <div
                key={entry.id}
                className="rounded-xl border border-sky-100/80 bg-white/80 p-4 shadow-xs transition hover:border-sky-200 dark:border-slate-700/70 dark:bg-slate-900/40"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {resolveOrgLabel(entry)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Empresa: {resolveCompanyLabel(entry)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
                    disabled={restoringId === entry.id}
                    onClick={() => handleRestore(entry)}
                  >
                    {restoringId === entry.id ? "Restaurando..." : "Restaurar"}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3.5" />
                    {label}
                  </span>
                  {entry.device && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Laptop2 className="size-3.5" />
                      {entry.device}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Página {pageNumber} · {entries.length} registros
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!hasPrevious || loading || refreshing}
              onClick={handlePrevious}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={!hasNext || loading || refreshing}
              onClick={handleNext}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ListSkeleton(): ReactElement {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="rounded-xl border border-sky-100/80 bg-white/70 p-4 shadow-xs dark:border-slate-700/60 dark:bg-slate-900/40"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
          <div className="mt-3 flex gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
