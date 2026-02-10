import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

export type RestaurantTable = {
  id: number
  name: string
  code: string
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED"
  capacity: number | null
  location?: string | null
  notes?: string | null
  currentOrderId?: number | null
  createdAt: string
  updatedAt: string
}

type CreateRestaurantTablePayload = {
  name: string
  code: string
  status?: RestaurantTable["status"]
  capacity?: number | null
  location?: string | null
  notes?: string | null
}

type UpdateRestaurantTablePayload = Partial<CreateRestaurantTablePayload>

async function parseErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json()
    if (typeof data?.message === "string") return data.message
  } catch {
    /* ignore */
  }
  return fallback
}

export async function getRestaurantTables(): Promise<RestaurantTable[]> {
  let res: Response
  try {
    res = await authFetch("/restaurant-tables", { cache: "no-store" })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudieron cargar las mesas."))
  }
  return res.json()
}

export async function createRestaurantTable(payload: CreateRestaurantTablePayload) {
  const res = await authFetch("/restaurant-tables", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudo crear la mesa."))
  }
  return res.json()
}

export async function updateRestaurantTable(
  id: number,
  payload: UpdateRestaurantTablePayload,
) {
  const res = await authFetch(`/restaurant-tables/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudo actualizar la mesa."))
  }
  return res.json()
}

export async function deleteRestaurantTable(id: number) {
  const res = await authFetch(`/restaurant-tables/${id}`, { method: "DELETE" })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudo eliminar la mesa."))
  }
  return res.json()
}
