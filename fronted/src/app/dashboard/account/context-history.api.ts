import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

export type ContextHistoryEntry = {
  id: number
  orgId: number
  companyId: number | null
  device: string | null
  createdAt: string
}

export type ContextHistoryPage = {
  items: ContextHistoryEntry[]
  nextCursor: number | null
}

export async function fetchContextHistory(params?: {
  limit?: number
  cursor?: number | null
}): Promise<ContextHistoryPage> {
  const searchParams = new URLSearchParams()
  if (params?.limit) {
    searchParams.set("limit", String(params.limit))
  }
  if (params?.cursor != null) {
    searchParams.set("cursor", String(params.cursor))
  }
  const query = searchParams.toString()
  let res: Response
  try {
    res = await authFetch(
      `/users/me/context-history${query ? `?${query}` : ""}`,
    )
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { items: [], nextCursor: null }
    }
    throw error
  }
  if (!res.ok) {
    const message = await extractError(res)
    throw new Error(message || "No se pudo obtener el historial de contexto")
  }
  const payload = (await res.json()) as any
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : []
  const normalizedItems = items.map((entry: any) => ({
    id: Number(entry.id),
    orgId: Number(entry.orgId),
    companyId:
      entry.companyId === null || entry.companyId === undefined
        ? null
        : Number(entry.companyId),
    device: typeof entry.device === "string" ? entry.device : null,
    createdAt: new Date(entry.createdAt ?? Date.now()).toISOString(),
  }))
  const nextCursor =
    typeof payload?.nextCursor === "number" && Number.isFinite(payload.nextCursor)
      ? Number(payload.nextCursor)
      : null
  return {
    items: normalizedItems,
    nextCursor,
  }
}

export async function restoreContextHistoryEntry(id: number): Promise<void> {
  let res: Response
  try {
    res = await authFetch(`/users/me/context-history/${id}/restore`, {
      method: "POST",
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return
    }
    throw error
  }
  if (!res.ok) {
    const message = await extractError(res)
    throw new Error(message || "No se pudo restaurar el contexto seleccionado")
  }
}

async function extractError(response: Response): Promise<string | null> {
  try {
    const data = await response.json()
    if (data && typeof data === "object" && "message" in data) {
      const message = (data as { message?: string }).message
      if (typeof message === "string" && message.trim().length > 0) {
        return message
      }
    }
  } catch {
    /* ignore */
  }
  return null
}
