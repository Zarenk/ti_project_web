'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserDataFromToken, isTokenValid } from '@/lib/auth'

export function useDashboardAuth(allowedRoles: string[] = []) {
  const router = useRouter()

  useEffect(() => {
    async function check() {
      const user = await getUserDataFromToken()
      if (!user || !(await isTokenValid())) {
        router.replace('/login')
        return
      }
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role ?? '')) {
        router.push('/unauthorized')
      }
    }
    check()
  }, [router, allowedRoles])
}