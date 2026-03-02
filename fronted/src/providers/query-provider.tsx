"use client"

import { type ReactNode, useEffect, useRef } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import { getQueryClient } from "@/lib/query-client"
import { useTenantSelection } from "@/context/tenant-selection-context"

/**
 * Wraps children with TanStack Query's QueryClientProvider.
 *
 * Must be placed INSIDE TenantSelectionProvider so it can watch
 * tenant changes and clear the query cache when the user switches
 * organization or company — preventing cross-tenant data leaks.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()
  const { selection } = useTenantSelection()

  // Track previous tenant to detect changes (skip the first render)
  const prevTenantRef = useRef<string | null>(null)

  useEffect(() => {
    const key = `${selection.orgId ?? "null"}-${selection.companyId ?? "null"}`

    // On first render just record the key, don't clear
    if (prevTenantRef.current === null) {
      prevTenantRef.current = key
      return
    }

    // If the tenant changed, nuclear-clear all cached queries
    if (prevTenantRef.current !== key) {
      prevTenantRef.current = key
      queryClient.clear()
    }
  }, [selection.orgId, selection.companyId, queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}
