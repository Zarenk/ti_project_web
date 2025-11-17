export const SESSION_EXPIRED_EVENT = "session-expired" as const

export function notifySessionExpired(): void {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}
