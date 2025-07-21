"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"

type AuthContextType = {
  userName: string | null
  refreshUser: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null)

  const refreshUser = () => {
    if (isTokenValid()) {
      const data = getUserDataFromToken()
      setUserName(data?.name ?? null)
    } else {
      setUserName(null)
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("authchange"))
    }
  }

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      window.dispatchEvent(new Event("authchange"))
    }
    setUserName(null)
  }

  useEffect(() => {
    refreshUser()
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "token") {
        refreshUser()
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  return (
    <AuthContext.Provider value={{ userName, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}