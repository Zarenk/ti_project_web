"use client"

import { type ReactNode, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MODULE_PERMISSION_LABELS, useEnforcedModulePermission } from "@/hooks/use-enforced-module-permission"
import { useRBAC } from "../hooks/use-rbac"
import { useFeatureFlag } from "../hooks/use-feature-flags"
import { useAuth } from "@/context/auth-context"

const MODULE_KEY = "ads"

export default function AdsLayout({ children }: { children: ReactNode }) {
  const { allowed: moduleAllowed, loading } = useEnforcedModulePermission(MODULE_KEY)
  const enabled = useFeatureFlag("ads")
  const roleAllowed = useRBAC(["admin", "marketing"])
  const hasWarnedRef = useRef(false)
  const { authPending, sessionExpiring } = useAuth()

  const isPending = loading || roleAllowed === undefined || authPending || sessionExpiring
  const allowed = moduleAllowed && enabled && roleAllowed === true
  const router = useRouter()

  useEffect(() => {
    if (isPending) return

    if (!allowed) {
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true
        const message = !enabled
          ? "La sección de publicidad está deshabilitada actualmente."
          : `No tienes permisos para acceder a ${MODULE_PERMISSION_LABELS[MODULE_KEY]}.`
        try {
          toast.error(message)
        } catch {
          // Ignorar errores al mostrar la notificación
        }
      }
      router.replace("/unauthorized")
    } else {
      hasWarnedRef.current = false
    }
  }, [allowed, enabled, isPending, router])

  if (isPending || !allowed) {
    return null
  }

  return <div className="flex flex-col min-h-screen p-4">{children}</div>
}
