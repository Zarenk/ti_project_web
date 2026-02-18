"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { getAuthHeaders } from "@/utils/auth-token"
import { SOCKET_URL } from "@/lib/utils"

type OrderUpdatePayload = {
  orderId: number
  status: string
  action: "created" | "updated" | "checkout" | "item_updated"
}

type TableUpdatePayload = {
  tableId: number
  status: string
}

type KitchenSocketOptions = {
  enabled: boolean
  onOrderUpdate?: (payload: OrderUpdatePayload) => void
  onTableUpdate?: (payload: TableUpdatePayload) => void
}

export function useKitchenSocket({
  enabled,
  onOrderUpdate,
  onTableUpdate,
}: KitchenSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  // Keep callback refs stable
  const onOrderUpdateRef = useRef(onOrderUpdate)
  onOrderUpdateRef.current = onOrderUpdate
  const onTableUpdateRef = useRef(onTableUpdate)
  onTableUpdateRef.current = onTableUpdate

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const kitchenSocket = io(`${SOCKET_URL}/kitchen`, {
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

    socketRef.current = kitchenSocket

    kitchenSocket.on("connect", () => {
      setConnected(true)
    })

    kitchenSocket.on("disconnect", () => {
      setConnected(false)
    })

    kitchenSocket.on("connect_error", (error) => {
      console.warn("[kitchen-socket] connect_error:", error.message)
      setConnected(false)
    })

    kitchenSocket.on("kitchen:order_update", (payload: OrderUpdatePayload) => {
      onOrderUpdateRef.current?.(payload)
    })

    kitchenSocket.on("kitchen:table_update", (payload: TableUpdatePayload) => {
      onTableUpdateRef.current?.(payload)
    })

    kitchenSocket.on("kitchen:error", (data: { message: string }) => {
      console.warn("[kitchen-socket] error:", data.message)
    })

    return () => {
      kitchenSocket.removeAllListeners()
      kitchenSocket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [enabled])

  return { connected, disconnect }
}
