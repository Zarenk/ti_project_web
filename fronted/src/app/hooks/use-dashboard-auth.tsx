'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserDataFromToken, isTokenValid } from '@/lib/auth'
import { useAuth } from "@/context/auth-context"

export function useDashboardAuth(allowedRoles: string[] = []) {
  const router = useRouter()
  const { authPending, sessionExpiring } = useAuth()

  useEffect(() => {
    async function check() {
      if (authPending || sessionExpiring) {
        return
      }
      const user = await getUserDataFromToken()
      if (!user || !(await isTokenValid())) {
        let returnTo = '/dashboard'
        if (typeof window !== 'undefined') {
          const { pathname, search, hash } = window.location
          if (pathname) {
            returnTo = `${pathname}${search}${hash}` || returnTo
          }
        }
        router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`)
        return
      }
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role ?? '')) {
        router.push('/unauthorized')
      }
    }
    check()
  }, [router, allowedRoles, authPending, sessionExpiring])
}
