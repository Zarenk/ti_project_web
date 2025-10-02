"use client"

import { type ReactNode, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MODULE_PERMISSION_LABELS, useEnforcedModulePermission } from "@/hooks/use-enforced-module-permission"
import type { ModulePermissionKey } from "@/hooks/use-module-permission"

interface GuardOptions {
  moduleLabel?: string
  redirectTo?: string
  showToast?: boolean
}

interface ModulePermissionGateProps extends GuardOptions {
  module: ModulePermissionKey
  children: ReactNode
}

export function ModulePermissionGate({
  module,
  children,
  moduleLabel,
  redirectTo = "/unauthorized",
  showToast = true,
}: ModulePermissionGateProps) {
  const router = useRouter()
  const { allowed, loading } = useEnforcedModulePermission(module)
  const label = useMemo(() => moduleLabel ?? MODULE_PERMISSION_LABELS[module], [module, moduleLabel])
  const hasWarnedRef = useRef(false)

  useEffect(() => {
    if (loading) {
      return
    }

    if (!allowed) {
      if (showToast && !hasWarnedRef.current) {
        hasWarnedRef.current = true
        try {
          toast.error(`No tienes permisos para acceder a ${label}.`)
        } catch {
          // Ignorar errores al mostrar la notificación
        }
      }
      router.replace(redirectTo)
    } else {
      hasWarnedRef.current = false
    }
  }, [allowed, loading, label, redirectTo, router, showToast])

  if (loading || !allowed) {
    return null
  }

  return <>{children}</>
}

export function createModuleLayout(
  module: ModulePermissionKey,
  options: GuardOptions & { wrapperClassName?: string } = {},
) {
  const { wrapperClassName, ...guardOptions } = options

  return function ModuleLayout({ children }: { children: ReactNode }) {
    return (
      <ModulePermissionGate module={module} {...guardOptions}>
        {wrapperClassName ? <div className={wrapperClassName}>{children}</div> : children}
      </ModulePermissionGate>
    )
  }
}