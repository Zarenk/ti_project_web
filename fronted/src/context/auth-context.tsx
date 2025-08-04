"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"

type AuthContextType = {
  userId: number | null
  userName: string | null
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)

  const refreshUser = useCallback(async () => {
    if (await isTokenValid()) {
      const data = await getUserDataFromToken()
      setUserName(data?.name ?? null)
      setUserId(data?.userId ?? null)
    } else {
      setUserName(null)
      setUserId(null)
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("authchange"))
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' })
    if (typeof window !== "undefined") {
      localStorage.removeItem('token')
      window.dispatchEvent(new Event("authchange"))
    }
    setUserName(null)
    setUserId(null)
  }, [])

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <AuthContext.Provider value={{ userId, userName, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}