"use client"

import { useAuth } from "@/context/auth-context"

export function useRBAC(allowedRoles: string[]) {
  const { role } = useAuth()
  if (!role) return false
  return allowedRoles.includes(role)
}