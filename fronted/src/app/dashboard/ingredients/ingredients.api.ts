import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

export type Ingredient = {
  id: number
  name: string
  unit: string
  stock: number
  minStock?: number | null
  cost?: number | null
  status?: string | null
  createdAt: string
  updatedAt: string
}

type CreateIngredientPayload = {
  name: string
  unit: string
  stock?: number
  minStock?: number
  cost?: number
  status?: string
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

export async function getIngredients(): Promise<Ingredient[]> {
  let res: Response
  try {
    res = await authFetch("/ingredients", { cache: "no-store" })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudieron cargar los insumos."))
  }
  return res.json()
}

export async function createIngredient(payload: CreateIngredientPayload) {
  const res = await authFetch("/ingredients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudo crear el insumo."))
  }
  return res.json()
}

export async function deleteIngredient(id: number) {
  const res = await authFetch(`/ingredients/${id}`, { method: "DELETE" })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudo eliminar el insumo."))
  }
  return res.json()
}

export type IngredientMovement = {
  id: number
  ingredientId: number
  type: "IN" | "OUT" | "ADJUSTMENT" | "WASTE"
  quantity: number
  unit: string
  orderId: number | null
  notes: string | null
  createdAt: string
  order?: { id: number; status: string } | null
  createdBy?: { id: number; username: string } | null
}

export async function getIngredientMovements(ingredientId: number): Promise<IngredientMovement[]> {
  let res: Response
  try {
    res = await authFetch(`/ingredients/${ingredientId}/movements`, { cache: "no-store" })
  } catch (error) {
    if (error instanceof UnauthenticatedError) return []
    throw error
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "No se pudieron cargar los movimientos."))
  }
  return res.json()
}
