'use client'

import { useAuth as useAuthContext } from '@/context/auth-context'
export function useAuth() {
  return useAuthContext()
}