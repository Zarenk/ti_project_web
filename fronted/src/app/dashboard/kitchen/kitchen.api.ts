import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

export type KitchenStation = {
  id: number
  name: string
  code: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type KitchenOrderItem = {
  id: number
  quantity: number
  unitPrice: number
  notes?: string | null
  status: "PENDING" | "COOKING" | "READY" | "SERVED" | "CANCELLED"
  product: {
    id: number
    name: string
  }
  station?: KitchenStation | null
}

export type KitchenOrder = {
  id: number
  status: "OPEN" | "IN_PROGRESS" | "READY" | "SERVED" | "CANCELLED" | "CLOSED"
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  openedAt: string
  notes?: string | null
  table?: {
    id: number
    name: string
    code: string
  } | null
  items: KitchenOrderItem[]
}

type CreateKitchenStationPayload = {
  name: string
  code: string
  isActive?: boolean
}

async function parseErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json()
    if (typeof data?.message === "string") return data.message
  } catch {
    /* ignore */
  }
  return fallback
}

export async function getKitchenStations(): Promise<KitchenStation[]> {
  let res: Response
  try {
    res = await authFetch("/kitchen-stations", { cache: "no-store" })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudieron cargar las estaciones."))
  }
  return res.json()
}

export async function createKitchenStation(payload: CreateKitchenStationPayload) {
  const res = await authFetch("/kitchen-stations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudo crear la estacion."))
  }
  return res.json()
}

export async function deleteKitchenStation(id: number) {
  const res = await authFetch(`/kitchen-stations/${id}`, { method: "DELETE" })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudo eliminar la estacion."))
  }
  return res.json()
}

export async function getKitchenQueue(stationId?: number): Promise<KitchenOrder[]> {
  const query = stationId ? `?stationId=${stationId}` : ""
  let res: Response
  try {
    res = await authFetch(`/restaurant-orders/kitchen${query}`, {
      cache: "no-store",
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudo cargar la comanda."))
  }
  return res.json()
}

export async function updateKitchenItemStatus(
  id: number,
  status: KitchenOrderItem["status"],
) {
  const res = await authFetch(`/restaurant-order-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudo actualizar el item."))
  }
  return res.json()
}
