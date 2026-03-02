import { QueryClient } from "@tanstack/react-query"
import { UnauthenticatedError } from "@/utils/auth-fetch"

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 2 minutes — no refetch if navigating back quickly
        staleTime: 2 * 60 * 1000,
        // Keep unused data in memory for 5 minutes before garbage collecting
        gcTime: 5 * 60 * 1000,
        // authFetch already handles 401 + token refresh internally,
        // so only retry on transient network errors
        retry: (failureCount, error) => {
          if (error instanceof UnauthenticatedError) return false
          return failureCount < 2
        },
        // Silently refetch when user returns to the tab
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Mutations should not auto-retry (side effects)
        retry: false,
      },
    },
  })
}

// Singleton for the browser — server always gets a new instance
let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
