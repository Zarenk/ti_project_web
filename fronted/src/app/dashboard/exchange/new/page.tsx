"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ExchangeNewRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/dashboard/exchange")
  }, [router])
  return null
}
