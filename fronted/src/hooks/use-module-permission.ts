"use client"

import { useCallback } from "react"

import { useAuth } from "@/context/auth-context"
import { useSiteSettings } from "@/context/site-settings-context"
import type { SiteSettings } from "@/context/site-settings-schema"

export type ModulePermissionKey = keyof SiteSettings["permissions"]

export function useModulePermission() {
  const { role } = useAuth()
  const { settings } = useSiteSettings()

  return useCallback(
    (module?: ModulePermissionKey) => {
      if (!module) return true

      if (role?.toLowerCase() === "admin") {
        return true
      }

      return settings.permissions?.[module] ?? false
    },
    [role, settings.permissions]
  )
}