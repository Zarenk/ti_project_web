"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react"
import { getUserDataFromToken } from "@/lib/auth"
import { toast } from 'sonner'
import { signOut } from "next-auth/react"

type AuthContextType = {
  userId: number | null
  userName: string | null
  role: string | null
  authPending: boolean
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [authPending, setAuthPending] = useState<boolean>(false)

  const refreshUser = useCallback(async () => {
    const data = await getUserDataFromToken()
    if (data) {
      setUserName(data.name ?? null)
      setUserId(data.id ?? null)
      setRole(data.role ?? null)
    } else {
      setUserName(null)
      setUserId(null)
      setRole(null)
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("authchange"))
    }
  }, [])
    const logout = useCallback(async () => {
      setAuthPending(true)
      try {
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
        try { toast.success('Sesión cerrada') } catch {}
        setAuthPending(false)
      }
    }, [])

  useEffect(() => {
    refreshUser()
  }, [])

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
