"use client"

import { type ReactNode, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useFeatureFlag } from "@/app/hooks/use-feature-flags"
import { useRBAC } from "@/app/hooks/use-rbac"
import { MODULE_PERMISSION_LABELS, useEnforcedModulePermission } from "@/hooks/use-enforced-module-permission"

const MODULE_KEY = "accounting"

export default function AccountingLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { allowed: moduleAllowed, loading } = useEnforcedModulePermission(MODULE_KEY)
  const enabled = useFeatureFlag("ACCOUNTING_ENABLED")
  const canRead = useRBAC(["admin", "accountant", "auditor"])
  const hasWarnedRef = useRef(false)

  const isPending = loading || canRead === undefined
  const allowed = moduleAllowed && enabled && canRead === true

  useEffect(() => {
    if (isPending) return

    if (!allowed) {
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true
        const message = !enabled
          ? "La contabilidad está deshabilitada actualmente."
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

  return <main className="flex flex-col min-h-screen gap-4 p-4 md:p-6">{children}</main>
}