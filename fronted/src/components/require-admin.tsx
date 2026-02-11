"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"
import { useAuth } from "@/context/auth-context"

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()
  const { authPending, sessionExpiring } = useAuth()
  const allowedRoles = new Set(["ADMIN", "SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG"])

  useEffect(() => {
    async function check() {
      if (authPending || sessionExpiring) {
        return
      }
      const data = await getUserDataFromToken()
      const normalizedRole = (data?.role ?? "").toUpperCase()
      const validRole = allowedRoles.has(normalizedRole)
      if (!data || !(await isTokenValid()) || !validRole) {
        router.replace("/unauthorized")
      } else {
        setAuthorized(true)
      }
    }
    check()
  }, [authPending, router, sessionExpiring])

  if (!authorized) {
    return null
  }

  return <>{children}</>
}
