"use client"

import { useAuth } from "@/context/auth-context"

export function useRBAC(allowedRoles: string[]) {
  const { role } = useAuth()
  if (!role) return undefined
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase())
  return normalizedAllowed.includes(role.toUpperCase())
}