/**
 * Resuelve entidades textuales del usuario contra datos reales del sistema.
 * "jabón" → Product{id:45, name:"JABÓN LÍQUIDO 500ML", ...}
 */

import type { ParsedEntity } from "../intents/intent-types"

export interface ResolvedProduct {
  id: number
  name: string
  price: number
  priceSell: number
  stock: number
}

export interface ResolvedClient {
  id: number
  name: string
}

/**
 * Resuelve entidades de producto, cliente, etc. usando búsqueda fuzzy
 * contra los endpoints del sistema.
 */
export async function resolveEntities(
  entities: ParsedEntity[],
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<ParsedEntity[]> {
  const resolved = [...entities]

  for (const entity of resolved) {
    switch (entity.type) {
      case "product": {
        const product = await resolveProduct(String(entity.value ?? entity.raw), authFetch)
        if (product) {
          entity.resolved = product
        }
        break
      }
      case "client": {
        const client = await resolveClient(String(entity.value ?? entity.raw), authFetch)
        if (client) {
          entity.resolved = client
        }
        break
      }
      // quantity, period, etc. don't need resolution
    }
  }

  return resolved
}

/** Busca un producto por nombre (fuzzy) */
async function resolveProduct(
  query: string,
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<ResolvedProduct | null> {
  try {
    const res = await authFetch(`/products?search=${encodeURIComponent(query)}`)
    if (!res.ok) return null
    const products = await res.json()

    const list = Array.isArray(products) ? products : products.data ?? []
    if (!list.length) return null

    // Best match is first (backend sorts by relevance)
    const p = list[0]
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price ?? 0),
      priceSell: Number(p.priceSell ?? p.price ?? 0),
      stock: Number(p.totalStock ?? 0),
    }
  } catch {
    return null
  }
}

/** Busca un cliente por nombre (fuzzy) */
async function resolveClient(
  query: string,
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<ResolvedClient | null> {
  try {
    const res = await authFetch(`/clients?search=${encodeURIComponent(query)}`)
    if (!res.ok) return null
    const clients = await res.json()

    const list = Array.isArray(clients) ? clients : clients.data ?? []
    if (!list.length) return null

    return { id: list[0].id, name: list[0].name }
  } catch {
    return null
  }
}
