"use client"

import { useMemo } from "react"

import { useAuth } from "@/context/auth-context"
import { useSiteSettings } from "@/context/site-settings-context"

import { useModulePermission, type ModulePermissionKey } from "./use-module-permission"

export const MODULE_PERMISSION_LABELS: Record<ModulePermissionKey, string> = {
  dashboard: "Panel principal",
  catalog: "Catálogo",
  store: "Tienda en línea",
  inventory: "Inventario",
  sales: "Ventas",
  salesHistory: "Historial de ventas",
  purchases: "Compras",
  accounting: "Contabilidad",
  marketing: "Marketing",
  ads: "Publicidad",
  settings: "Configuraciones",
}

export function useEnforcedModulePermission(module: ModulePermissionKey) {
  const checkPermission = useModulePermission()
  const { role, authPending, sessionExpiring } = useAuth()
  const { isLoading } = useSiteSettings()

  const { allowed, loading } = useMemo(() => {
    const isAuthReady = typeof role === "string" && role.length > 0
    if (!isAuthReady) {
      return { allowed: false, loading: true }
    }

    if (authPending || sessionExpiring) {
      return { allowed: false, loading: true }
    }

    return {
      allowed: checkPermission(module),
      loading: isLoading,
    }
  }, [checkPermission, module, role, isLoading, authPending, sessionExpiring])

  return { allowed, loading }
}
