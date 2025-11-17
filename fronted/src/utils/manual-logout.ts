const STORAGE_KEY = "ti.manualLogoutAt"
const TTL_MS = 10_000

function safeSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function markManualLogout(): void {
  const storage = safeSessionStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, Date.now().toString())
  } catch {
    /* ignore */
  }
}

export function clearManualLogout(): void {
  const storage = safeSessionStorage()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function wasManualLogoutRecently(): boolean {
  const storage = safeSessionStorage()
  if (!storage) return false
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return false
    const timestamp = Number(raw)
    if (!Number.isFinite(timestamp)) {
      storage.removeItem(STORAGE_KEY)
      return false
    }
    const elapsed = Date.now() - timestamp
    if (elapsed > TTL_MS) {
      storage.removeItem(STORAGE_KEY)
      return false
    }
    return elapsed >= 0 && elapsed <= TTL_MS
  } catch {
    return false
  }
}
