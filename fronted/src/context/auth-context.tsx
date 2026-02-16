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
  type UserPermissionsMap,
} from "@/lib/auth"
import { toast } from 'sonner'
import { signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { clearManualLogout, markManualLogout } from "@/utils/manual-logout"
import {
  TENANT_ORGANIZATIONS_EVENT,
  clearTenantSelection,
  setTenantSelection,
} from "@/utils/tenant-preferences"
import { clearContextPreferences } from "@/utils/context-preferences"
import { userContextStorage } from "@/utils/user-context-storage"
import { useUserContextSync } from "@/hooks/use-user-context-sync"
import { getCurrentTenant } from "@/app/dashboard/tenancy/tenancy.api"
import { SESSION_EXPIRED_EVENT } from "@/utils/session-expired-event"
import { logoutSession } from "./auth.api"
import { SessionExpiryOverlay } from "@/components/session-expiry-overlay"

type AuthContextType = {
  userId: number | null
  userName: string | null
  role: string | null
  isPublicSignup: boolean | null
  userPermissions: UserPermissionsMap | null
  authPending: boolean
  sessionExpiring: boolean
  refreshUser: () => Promise<void>
  logout: (options?: { silent?: boolean }) => Promise<void>
  logoutAndRedirect: (options?: { silent?: boolean; returnTo?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isPublicSignup, setIsPublicSignup] = useState<boolean | null>(null)
  const [userPermissions, setUserPermissions] = useState<UserPermissionsMap | null>(null)
  const [authPending, setAuthPending] = useState<boolean>(false)
  const sessionTimerRef = useRef<number | null>(null)
  const autoLogoutTriggeredRef = useRef(false)
  const lastInteractionRef = useRef<number>(Date.now())
  const refreshFailureNotifiedRef = useRef(false)
  const sessionExpiryInProgressRef = useRef(false)
  const [sessionExpiryOverlay, setSessionExpiryOverlay] = useState(false)
  const lastUserIdRef = useRef<number | null>(null)
  const authRedirectInProgressRef = useRef(false)
  const lastPathKey = "ti.lastPath"
  useUserContextSync(userId, role)
  const ensureTenantDefaults = useCallback(async (ownerId?: number | null): Promise<boolean> => {
    try {
      const summary = await getCurrentTenant()
      const resolvedOrgId = summary.organization?.id ?? null
      const resolvedCompanyId = summary.company?.id ?? summary.companies?.[0]?.id ?? null
      if (resolvedOrgId != null && resolvedCompanyId != null) {
        setTenantSelection(
          { orgId: resolvedOrgId, companyId: resolvedCompanyId },
          { ownerId: ownerId ?? null },
        )
        window.dispatchEvent(new Event(TENANT_ORGANIZATIONS_EVENT))
        return true
      }
    } catch {
      /* ignore */
    }
    return false
  }, [])

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current !== null) {
      clearTimeout(sessionTimerRef.current)
      sessionTimerRef.current = null
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const data = await getUserDataFromToken()
    if (data) {
      const hasChangedUser =
        lastUserIdRef.current === null || lastUserIdRef.current !== data.id
      if (hasChangedUser) {
        const ensured = await ensureTenantDefaults(data.id ?? null)
        if (!ensured) {
          clearTenantSelection()
        }
      }
      lastUserIdRef.current = data.id ?? null
      const resolvedId = data.id ?? null
      setUserName(data.name ?? null)
      setUserId(resolvedId)
      setRole(data.role ?? null)
      setIsPublicSignup(
        typeof data.isPublicSignup === "boolean" ? data.isPublicSignup : false,
      )
      setUserPermissions(data.userPermissions ?? null)
      userContextStorage.setUserHint(resolvedId)
      autoLogoutTriggeredRef.current = false
      sessionExpiryInProgressRef.current = false
      setSessionExpiryOverlay(false)
      clearManualLogout()
    } else {
      setUserName(null)
      setUserId(null)
      setRole(null)
      setIsPublicSignup(null)
      setUserPermissions(null)
      userContextStorage.setUserHint(null)
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("authchange"))
    }
  }, [ensureTenantDefaults])
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
        const logoutReq = logoutSession(controller.signal)
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
       setIsPublicSignup(null)
        setUserPermissions(null)
        userContextStorage.setUserHint(null)
        clearTenantSelection()
        clearContextPreferences()
        if (!silent) {
          try { toast.success('Sesión cerrada') } catch {}
        }
        setAuthPending(false)
        refreshFailureNotifiedRef.current = false
        lastUserIdRef.current = null
      }
    },
    [clearSessionTimer],
  )

  const redirectToLogin = useCallback(() => {
    if (authRedirectInProgressRef.current) {
      return
    }
    authRedirectInProgressRef.current = true
    if (typeof window === "undefined") {
      router.replace('/login')
      return
    }
    const { pathname, search, hash } = window.location
    if (pathname.startsWith('/login')) {
      return
    }
    let returnTo = `${pathname}${search}${hash}` || '/'
    try {
      const stored = window.sessionStorage.getItem(lastPathKey)
      if (stored && stored.startsWith('/')) {
        returnTo = returnTo || stored
      }
    } catch {
      /* ignore */
    }
    const target = `/login?returnTo=${encodeURIComponent(returnTo)}`
    router.replace(target)
    window.setTimeout(() => {
      try {
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign(target)
        }
      } catch {
        /* ignore */
      }
    }, 800)
  }, [router])

  const forceLogoutDueToExpiry = useCallback(async () => {
    if (sessionExpiryInProgressRef.current) {
      return
    }
    sessionExpiryInProgressRef.current = true
    autoLogoutTriggeredRef.current = true
    setSessionExpiryOverlay(true)
    try {
      toast.error('Tu sesión ha expirado. Redirigiendo al inicio de sesión.')
    } catch {}
    try {
      await logout({ silent: true })
    } finally {
      redirectToLogin()
    }
  }, [logout, redirectToLogin])

  const logoutAndRedirect = useCallback(
    async ({ silent = false, returnTo }: { silent?: boolean; returnTo?: string } = {}) => {
      if (returnTo && typeof window !== "undefined") {
        try {
          if (returnTo.startsWith('/')) {
            window.sessionStorage.setItem(lastPathKey, returnTo)
          }
        } catch {
          /* ignore */
        }
      }
      await logout({ silent })
      redirectToLogin()
    },
    [logout, redirectToLogin],
  )

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
    const safetyWindowMs = 15_000
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
        await forceLogoutDueToExpiry()
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
        } else {
          if (!refreshFailureNotifiedRef.current) {
            refreshFailureNotifiedRef.current = true
            try {
              toast.warning('No se pudo renovar tu sesión. Guardaremos tu página y te enviaremos al login.')
            } catch {}
          }
          await forceLogoutDueToExpiry()
          return
        }
      }
      void scheduleSessionCheck()
    }, delay)
  }, [
    userId,
    clearSessionTimer,
    forceLogoutDueToExpiry,
    refreshUser,
  ])

  const registerInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const { pathname: currentPath, search, hash } = window.location
    if (!currentPath || currentPath.startsWith('/login')) {
      return
    }
    const current = `${currentPath}${search}${hash}`
    try {
      window.sessionStorage.setItem(lastPathKey, current)
    } catch {
      /* ignore */
    }
  }, [pathname])

  useEffect(() => {
    if (!sessionExpiryOverlay) {
      return
    }
    if (typeof window === "undefined") {
      return
    }
    if (pathname && pathname.startsWith("/login")) {
      setSessionExpiryOverlay(false)
    }
  }, [pathname, sessionExpiryOverlay])

  const handleSessionExpiredEvent = useCallback(() => {
    void forceLogoutDueToExpiry()
  }, [forceLogoutDueToExpiry])

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
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpiredEvent as EventListener)

    return () => {
      window.removeEventListener('authchange', handleAuthChange)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('pointerdown', handleUserInteraction, true)
      window.removeEventListener('keydown', handleUserInteraction, true)
      window.removeEventListener('focus', handleUserInteraction, true)
      window.removeEventListener('mousemove', handleUserInteraction, true)
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpiredEvent as EventListener)
      clearSessionTimer()
    }
  }, [
    scheduleSessionCheck,
    clearSessionTimer,
    registerInteraction,
    handleSessionExpiredEvent,
  ])

  return (
    <AuthContext.Provider value={{ userId, userName, role, isPublicSignup, userPermissions, authPending, sessionExpiring: sessionExpiryOverlay, refreshUser, logout, logoutAndRedirect }}>
      {children}
      {sessionExpiryOverlay && (
        <SessionExpiryOverlay
          onRedirect={() => {
            setSessionExpiryOverlay(false)
            redirectToLogin()
          }}
        />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
