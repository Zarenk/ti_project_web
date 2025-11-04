"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react"
import {
  getAuthTokenExpirationDate,
  getUserDataFromToken,
  isTokenValid,
  refreshAuthToken,
} from "@/lib/auth"
import { toast } from 'sonner'
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { clearManualLogout, markManualLogout } from "@/utils/manual-logout"

type AuthContextType = {
  userId: number | null
  userName: string | null
  role: string | null
  authPending: boolean
  refreshUser: () => Promise<void>
  logout: (options?: { silent?: boolean }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [authPending, setAuthPending] = useState<boolean>(false)
  const sessionTimerRef = useRef<number | null>(null)
  const autoLogoutTriggeredRef = useRef(false)
  const lastInteractionRef = useRef<number>(Date.now())
  const refreshFailureNotifiedRef = useRef(false)

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current !== null) {
      clearTimeout(sessionTimerRef.current)
      sessionTimerRef.current = null
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const data = await getUserDataFromToken()
    if (data) {
      setUserName(data.name ?? null)
      setUserId(data.id ?? null)
      setRole(data.role ?? null)
      autoLogoutTriggeredRef.current = false
      clearManualLogout()
    } else {
      setUserName(null)
      setUserId(null)
      setRole(null)
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("authchange"))
    }
  }, [])
    const logout = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      clearSessionTimer()
      setAuthPending(true)
      try {
        if (!silent) {
          markManualLogout()
        }
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const logoutReq = fetch('/api/logout', {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
        })
        const nextAuth = signOut({ redirect: false })
        await Promise.allSettled([logoutReq, nextAuth])
        clearTimeout(timeout)
      } catch (error) {
        console.error('Logout failed', error)
      } finally {
        if (typeof window !== "undefined") {
          try { localStorage.removeItem('token') } catch {}
          window.dispatchEvent(new Event("authchange"))
        }
        setUserName(null)
        setUserId(null)
        setRole(null)
        if (!silent) {
          try { toast.success('Sesión cerrada') } catch {}
        }
        setAuthPending(false)
        refreshFailureNotifiedRef.current = false
      }
    },
    [clearSessionTimer],
  )

  const redirectToLogin = useCallback(() => {
    if (typeof window === "undefined") {
      router.replace('/login')
      return
    }
    const { pathname, search, hash } = window.location
    if (pathname.startsWith('/login')) {
      router.refresh()
      return
    }
    const returnTo = `${pathname}${search}${hash}` || '/'
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`)
    router.refresh()
  }, [router])

  const scheduleSessionCheck = useCallback(async () => {
    if (typeof window === 'undefined' || !userId) {
      clearSessionTimer()
      return
    }

    const expiry = await getAuthTokenExpirationDate()
    if (!expiry) {
      clearSessionTimer()
      return
    }

    const now = Date.now()
    const safetyWindowMs = 30_000
    const activeGraceWindowMs = 2 * 60_000
    const minDelayMs = 5_000
    const delay = Math.max(expiry.getTime() - now - safetyWindowMs, minDelayMs)

    clearSessionTimer()
    sessionTimerRef.current = window.setTimeout(async () => {
      const refreshedExpiry = await getAuthTokenExpirationDate()
      const currentNow = Date.now()
      if (refreshedExpiry && refreshedExpiry.getTime() - currentNow > safetyWindowMs) {
        void scheduleSessionCheck()
        return
      }

      const stillValid = await isTokenValid()
      if (!stillValid) {
        if (!autoLogoutTriggeredRef.current) {
          autoLogoutTriggeredRef.current = true
          try { toast.error('Tu sesión ha expirado. Debes iniciar sesión nuevamente.') } catch {}
          await logout({ silent: true })
          redirectToLogin()
        }
        return
      }

      const timeSinceInteraction = currentNow - lastInteractionRef.current
      if (timeSinceInteraction <= activeGraceWindowMs) {
        const refreshed = await refreshAuthToken()
        if (refreshed) {
          refreshFailureNotifiedRef.current = false
          await refreshUser()
          const nextExpiry = await getAuthTokenExpirationDate()
          if (nextExpiry && nextExpiry.getTime() - Date.now() > safetyWindowMs) {
            void scheduleSessionCheck()
            return
          }
        } else if (!refreshFailureNotifiedRef.current) {
          refreshFailureNotifiedRef.current = true
          try {
            toast.warning('No se pudo renovar tu sesión. Guarda tu trabajo y vuelve a iniciar sesión pronto.')
          } catch {}
        }
      }
      void scheduleSessionCheck()
    }, delay)
  }, [
    userId,
    clearSessionTimer,
    logout,
    redirectToLogin,
    refreshUser,
  ])

  const registerInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    if (typeof window === 'undefined') return

    void scheduleSessionCheck()

    registerInteraction()

    const handleAuthChange = () => {
      void scheduleSessionCheck()
    }

    const handleVisibility = () => {
      if (!document.hidden) {
        registerInteraction()
        void scheduleSessionCheck()
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token') {
        void scheduleSessionCheck()
      }
    }

    const handleUserInteraction = () => {
      registerInteraction()
    }

    window.addEventListener('authchange', handleAuthChange)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('pointerdown', handleUserInteraction, true)
    window.addEventListener('keydown', handleUserInteraction, true)
    window.addEventListener('focus', handleUserInteraction, true)
    window.addEventListener('mousemove', handleUserInteraction, true)

    return () => {
      window.removeEventListener('authchange', handleAuthChange)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('pointerdown', handleUserInteraction, true)
      window.removeEventListener('keydown', handleUserInteraction, true)
      window.removeEventListener('focus', handleUserInteraction, true)
      window.removeEventListener('mousemove', handleUserInteraction, true)
      clearSessionTimer()
    }
  }, [
    scheduleSessionCheck,
    clearSessionTimer,
    registerInteraction,
  ])

  return (
    <AuthContext.Provider value={{ userId, userName, role, authPending, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
