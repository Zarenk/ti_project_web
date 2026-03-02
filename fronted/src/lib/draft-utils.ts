/**
 * Limpia todos los borradores de formularios (ventas y entradas)
 * almacenados en localStorage. Se usa al hacer logout para evitar
 * que borradores huérfanos aparezcan en sesiones futuras.
 */
export function clearFormDrafts(): void {
  if (typeof window === "undefined") return
  const prefixes = [
    "sales-draft:v1:",
    "sales-context:v1:",
    "entry-draft:v1:",
    "entry-context:v1:",
  ]
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && prefixes.some((p) => key.startsWith(p))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    /* ignore */
  }
}

/** TTL de borradores: 24 horas en milisegundos */
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

/** Verifica si un borrador ha expirado basado en su campo savedAt */
export function isDraftExpired(savedAt: number | undefined): boolean {
  if (!savedAt || typeof savedAt !== "number") return true
  return Date.now() - savedAt > DRAFT_TTL_MS
}
