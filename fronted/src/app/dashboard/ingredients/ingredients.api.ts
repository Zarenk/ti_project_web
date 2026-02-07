import { authFetch } from "@/utils/auth-fetch"

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
  const res = await authFetch("/ingredients", { cache: "no-store" })
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
