"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { getAuthHeaders } from "@/utils/auth-token"
import { SOCKET_URL } from "@/lib/utils"

export type PaymentStatusUpdate = {
  code: string
  status: string
  previousStatus: string
  provider: string
  amount: number
  currency: string
  completedAt?: string
  failedAt?: string
  failureReason?: string
}

type PaymentSocketOptions = {
  enabled: boolean
  onStatusUpdate?: (payload: PaymentStatusUpdate) => void
}

export function usePaymentSocket({
  enabled,
  onStatusUpdate,
}: PaymentSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  const onStatusUpdateRef = useRef(onStatusUpdate)
  onStatusUpdateRef.current = onStatusUpdate

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const paymentSocket = io(`${SOCKET_URL}/payments`, {
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: async (cb) => {
        try {
          const headers = await getAuthHeaders()
          const authorization =
            headers.Authorization ?? headers.authorization ?? ""
          const token = authorization.startsWith("Bearer ")
            ? authorization.slice(7).trim()
            : authorization.trim()
          cb({
            token: token || undefined,
            orgId: headers["x-org-id"] ?? undefined,
            companyId: headers["x-company-id"] ?? undefined,
          })
        } catch {
          cb({})
        }
      },
    })

    socketRef.current = paymentSocket

    paymentSocket.on("connect", () => {
      setConnected(true)
    })

    paymentSocket.on("disconnect", () => {
      setConnected(false)
    })

    paymentSocket.on("connect_error", (error) => {
      console.warn("[payment-socket] connect_error:", error.message)
      setConnected(false)
    })

    paymentSocket.on("payment:status_updated", (payload: PaymentStatusUpdate) => {
      onStatusUpdateRef.current?.(payload)
    })

    paymentSocket.on("payment:error", (data: { message: string }) => {
      console.warn("[payment-socket] error:", data.message)
    })

    return () => {
      paymentSocket.off("connect")
      paymentSocket.off("disconnect")
      paymentSocket.off("connect_error")
      paymentSocket.off("payment:status_updated")
      paymentSocket.off("payment:error")
      paymentSocket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [enabled])

  return { connected, disconnect }
}
