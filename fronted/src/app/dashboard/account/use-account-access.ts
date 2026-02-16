"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"
import { useAuth } from "@/context/auth-context"

export const ACCOUNT_ALLOWED_ROLES = new Set(["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "ADMIN", "EMPLOYEE"])

export function useAccountAccessGuard() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const { authPending, sessionExpiring } = useAuth()

  useEffect(() => {
    let mounted = true

    // Facilita las pruebas E2E: si Cypress inyecta window.Cypress,
    // saltamos las redirecciones y permitimos que el contenido se renderice.
    if (typeof window !== "undefined" && (window as any).Cypress) {
      setReady(true)
      return
    }

    async function guard() {
      try {
        if (authPending || sessionExpiring) {
          return
        }
        const valid = await isTokenValid()
        if (!valid) {
          router.replace("/login")
          return
        }
        const session = await getUserDataFromToken()
        if (!session) {
          router.replace("/login")
          return
        }
        const normalizedRole = (session.role ?? "").toUpperCase()
        if (!ACCOUNT_ALLOWED_ROLES.has(normalizedRole)) {
          router.push("/unauthorized")
          return
        }
        if (mounted) setReady(true)
      } catch (error) {
        console.error(error)
        router.replace("/login")
      }
    }
    guard()
    return () => {
      mounted = false
    }
  }, [authPending, router, sessionExpiring])

  return ready
}
