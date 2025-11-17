"use client"

import { useCallback } from "react"

import { useAuth } from "@/context/auth-context"
import { useSiteSettings } from "@/context/site-settings-context"
import type { SiteSettings } from "@/context/site-settings-schema"

export type ModulePermissionKey = keyof SiteSettings["permissions"]

export function useModulePermission() {
  const { role } = useAuth()
  const { settings } = useSiteSettings()
  const normalizedRole = role ? role.trim().toUpperCase() : null
  const comparableRole = normalizedRole ? normalizedRole.replace(/\s+/g, "_") : null
  const isSuperAdmin = comparableRole ? comparableRole.includes("SUPER_ADMIN") : false
  const bypassRoles = new Set(["ADMIN", "SUPER_ADMIN", "SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG"])

  return useCallback(
    (module?: ModulePermissionKey) => {
      if (!module) return true

      if (comparableRole && (bypassRoles.has(comparableRole) || isSuperAdmin)) {
        return true
      }

      return settings.permissions?.[module] ?? false
    },
    [comparableRole, isSuperAdmin, settings.permissions]
  )
}
