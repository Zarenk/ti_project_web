"use client"

import { useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useFeatureFlag } from "@/app/hooks/use-feature-flags"
import { useRBAC } from "@/app/hooks/use-rbac"

export default function AccountingLayout({ children }: { children: ReactNode }) {
  const enabled = useFeatureFlag("ACCOUNTING_ENABLED")
  const canRead = useRBAC(["admin", "accountant", "auditor"])
  const router = useRouter()

  useEffect(() => {
    if (!enabled || !canRead) {
      router.push("/unauthorized")
    }
  }, [enabled, canRead, router])

  if (!enabled || !canRead) return null

  return (
    <main className="flex flex-col min-h-screen gap-4 p-4 md:p-6">
      {children}
    </main>
  )
}