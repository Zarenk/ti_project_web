"use client"

import { useEffect, useState } from "react"
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"
import {
  userContextStorage,
  type StoredUserContext,
} from "@/utils/user-context-storage"
import { shouldRememberContext } from "@/utils/context-preferences"

export function useUserContextSync(
  currentUserId: number | null,
  role?: string | null,
) {
  const [rememberEnabled, setRememberEnabled] = useState(() => shouldRememberContext())

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handlePreferenceChange = () => {
      setRememberEnabled(shouldRememberContext())
    }
    window.addEventListener("context-preferences-change", handlePreferenceChange)
    window.addEventListener("storage", handlePreferenceChange)
    return () => {
      window.removeEventListener("context-preferences-change", handlePreferenceChange)
      window.removeEventListener("storage", handlePreferenceChange)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !currentUserId || !rememberEnabled) {
      return
    }
    const normalizedRole = role?.toString().trim().toUpperCase() ?? ""
    const disallowedRoles = new Set(["EMPLOYEE", "ADMIN", "SUPER_ADMIN_ORG"])
    if (disallowedRoles.has(normalizedRole)) {
      return
    }

    let cancelled = false
    let lastKey: string | null = null
    let pendingContext: StoredUserContext | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let lastSyncedSelection: { orgId: number; companyId: number | null } | null = null
    let throttleUntil: number | null = null

    const isThrottled = () =>
      throttleUntil !== null && Date.now() < throttleUntil

    const flush = async () => {
      const context = pendingContext
      if (!context || cancelled || !currentUserId) {
        return
      }

      const normalizedCompany = context.companyId ?? null
      const fingerprint = `${context.orgId}:${normalizedCompany}:${context.updatedAt}`
      const alreadySynced =
        lastSyncedSelection &&
        lastSyncedSelection.orgId === context.orgId &&
        lastSyncedSelection.companyId === normalizedCompany
      if (lastKey === fingerprint || alreadySynced) {
        return
      }
      lastKey = fingerprint
      pendingContext = null

      try {
        const res = await authFetch("/users/me/last-context", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: context.orgId,
            companyId: context.companyId,
          }),
        })

        if (res.status === 429) {
          throttleUntil = Date.now() + 60_000
          console.warn("[user-context] backend rate limit reached, delaying sync")
          return
        }
        if (res.status === 403) {
          // Usuario sin permisos para sincronizar contexto: limpiar cache local y parar reintentos.
          userContextStorage.clearContext({ silent: true })
          throttleUntil = Date.now() + 5 * 60_000
          return
        }

        if (!res.ok) {
          const raw = await res.text().catch(() => "")
          throw new Error(
            raw && raw.trim().length > 0 ? raw : "No se pudo sincronizar el contexto del usuario",
          )
        }
        lastSyncedSelection = { orgId: context.orgId, companyId: normalizedCompany }
      } catch (error) {
        if (error instanceof UnauthenticatedError) {
          return
        }
        console.warn("[user-context] sync error", error)
      }
    }

    const scheduleSync = (context: StoredUserContext | null) => {
      if (!context || cancelled || !currentUserId || isThrottled()) {
        return
      }

      const normalizedCompany = context.companyId ?? null
      const alreadySynced =
        lastSyncedSelection &&
        lastSyncedSelection.orgId === context.orgId &&
        lastSyncedSelection.companyId === normalizedCompany
      if (alreadySynced) {
        return
      }

      pendingContext = context
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      const delay = isThrottled()
        ? Math.max((throttleUntil ?? Date.now()) - Date.now(), 0)
        : 500
      debounceTimer = window.setTimeout(() => {
        void flush()
      }, delay)
    }

    const unsubscribe = userContextStorage.subscribe(scheduleSync)
    const initial = userContextStorage.getLocalContext()
    if (initial) {
      scheduleSync(initial)
    }

    return () => {
      cancelled = true
      unsubscribe()
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [currentUserId, rememberEnabled])
}
