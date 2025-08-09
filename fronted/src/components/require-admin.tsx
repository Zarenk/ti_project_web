"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function check() {
      const data = await getUserDataFromToken()
      if (!data || !(await isTokenValid()) || data.role !== "ADMIN") {
        router.replace("/unauthorized")
      } else {
        setAuthorized(true)
      }
    }
    check()
  }, [router])

  if (!authorized) {
    return null
  }

  return <>{children}</>
}