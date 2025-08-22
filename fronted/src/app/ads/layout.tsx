"use client"

import { useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useRBAC } from "../hooks/use-rbac"
import { useFeatureFlag } from "../hooks/use-feature-flags"

export default function AdsLayout({ children }: { children: ReactNode }) {
  const enabled = useFeatureFlag("ads")
  const allowed = useRBAC(["admin", "marketing"])
  const router = useRouter()

  useEffect(() => {
    if (!enabled || allowed === false) {
      router.push("/unauthorized")
    }
  }, [enabled, allowed, router])

  if (!enabled || allowed === undefined) return null
  if (allowed === false) return null

  return <div className="flex flex-col min-h-screen p-4">{children}</div>
}