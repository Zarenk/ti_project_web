'use client'

import { useCallback, useEffect, useState } from 'react'

export interface AuthUser {
  id?: number
  name?: string
  username?: string
  email?: string
  image?: string
  avatar?: string
  role?: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      setUser(data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    fetchUser()
    if (typeof window !== 'undefined') {
      window.addEventListener('authchange', fetchUser)
      return () => window.removeEventListener('authchange', fetchUser)
    }
  }, [fetchUser])

  return { user }
}