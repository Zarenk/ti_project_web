"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  TENANT_SELECTION_EVENT,
  getTenantSelection,
  type TenantSelection,
} from "@/utils/tenant-preferences"

type TenantSelectionContextValue = {
  selection: TenantSelection
  version: number
  loading: boolean
  refresh: () => Promise<void>
}

const DEFAULT_SELECTION: TenantSelection = { orgId: null, companyId: null }

const TenantSelectionContext = createContext<TenantSelectionContextValue | null>(null)

export function TenantSelectionProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [selection, setSelection] = useState<TenantSelection>(DEFAULT_SELECTION)
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const applySelection = useCallback((next: TenantSelection) => {
    setSelection((prev) => {
      const changed = prev.orgId !== next.orgId || prev.companyId !== next.companyId
      if (changed) {
        setVersion((current) => current + 1)
      }
      return changed ? next : prev
    })
  }, [])

  const resolveSelection = useCallback(
    async (provided?: TenantSelection) => {
      try {
        setLoading(true)
        const nextSelection = provided ?? (await getTenantSelection())
        applySelection(nextSelection)
      } finally {
        setLoading(false)
      }
    },
    [applySelection],
  )

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      await resolveSelection()
    })()

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TenantSelection>).detail
      void resolveSelection(detail ?? undefined)
    }

    window.addEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    return () => {
      cancelled = true
      window.removeEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    }
  }, [resolveSelection])

  const value = useMemo<TenantSelectionContextValue>(
    () => ({
      selection,
      version,
      loading,
      refresh: () => resolveSelection(),
    }),
    [selection, version, loading, resolveSelection],
  )

  return <TenantSelectionContext.Provider value={value}>{children}</TenantSelectionContext.Provider>
}

export function useTenantSelection(): TenantSelectionContextValue {
  const context = useContext(TenantSelectionContext)
  if (!context) {
    throw new Error("useTenantSelection debe usarse dentro de TenantSelectionProvider")
  }
  return context
}
