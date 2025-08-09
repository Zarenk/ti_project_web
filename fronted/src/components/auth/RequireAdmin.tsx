"use client"

import { ReactNode, useEffect, useState } from "react"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"

async function getCurrentUser() {
  const valid = await isTokenValid()
  if (!valid) return null
  return await getUserDataFromToken()
}

export default function RequireAdmin({
  children,
}: {
  children: ReactNode
}) {
  const [role, setRole] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function check() {
      const user = await getCurrentUser()
      setRole(user?.role ?? null)
      setChecked(true)
    }
    check()
  }, [])

  if (!checked) {
    return null
  }

  if (role?.toLowerCase() === "admin") {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <h1 className="text-2xl font-bold">403</h1>
      <p>No tienes permisos para ver esta sección.</p>
    </div>
  )
}