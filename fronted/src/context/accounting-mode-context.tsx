"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import { authFetch } from "@/utils/auth-fetch"

export type AccountingMode = "simple" | "contador"

interface AccountingModeContextType {
  mode: AccountingMode
  isSimpleMode: boolean
  isContadorMode: boolean
  setMode: (mode: AccountingMode) => Promise<void>
  toggleMode: () => Promise<void>
  isLoading: boolean
}

const AccountingModeContext = createContext<AccountingModeContextType | undefined>(undefined)

const STORAGE_KEY = "accounting-mode"
const DEFAULT_MODE: AccountingMode = "simple"

export function AccountingModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AccountingMode>(DEFAULT_MODE)
  const [isLoading, setIsLoading] = useState(true)

  // Load mode from localStorage on mount
  useEffect(() => {
    const loadMode = async () => {
      try {
        // First try localStorage for instant load
        const stored = localStorage.getItem(STORAGE_KEY) as AccountingMode | null
        if (stored === "simple" || stored === "contador") {
          setModeState(stored)
        }

        // Then sync with backend preference
        try {
          const res = await authFetch("/users/me")
          if (res.ok) {
            const userData = await res.json()
            const serverMode = userData.accountingMode as AccountingMode | undefined
            if (serverMode === "simple" || serverMode === "contador") {
              setModeState(serverMode)
              localStorage.setItem(STORAGE_KEY, serverMode)
            }
          }
        } catch {
          // Backend unavailable, use localStorage value
        }
      } catch {
        // localStorage unavailable, use default
      } finally {
        setIsLoading(false)
      }
    }

    void loadMode()
  }, [])

  const setMode = useCallback(async (newMode: AccountingMode) => {
    setModeState(newMode)

    // Persist to localStorage immediately
    try {
      localStorage.setItem(STORAGE_KEY, newMode)
    } catch {
      // localStorage not available
    }

    // Persist to backend (fire and forget)
    try {
      await authFetch("/users/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountingMode: newMode }),
      })
    } catch {
      // Backend persistence failed, but localStorage still works
    }

    // Dispatch event for components that need to react
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("accountingModeChange", { detail: { mode: newMode } }))
    }
  }, [])

  const toggleMode = useCallback(async () => {
    const newMode: AccountingMode = mode === "simple" ? "contador" : "simple"
    await setMode(newMode)
  }, [mode, setMode])

  const value = useMemo<AccountingModeContextType>(
    () => ({
      mode,
      isSimpleMode: mode === "simple",
      isContadorMode: mode === "contador",
      setMode,
      toggleMode,
      isLoading,
    }),
    [mode, setMode, toggleMode, isLoading]
  )

  return (
    <AccountingModeContext.Provider value={value}>
      {children}
    </AccountingModeContext.Provider>
  )
}

export function useAccountingMode() {
  const context = useContext(AccountingModeContext)
  if (!context) {
    throw new Error("useAccountingMode must be used within AccountingModeProvider")
  }
  return context
}
