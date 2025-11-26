export type StoredUserContext = {
  orgId: number
  companyId: number | null
  updatedAt: number
  version: string
  hash: string | null
}

type ContextListener = (context: StoredUserContext | null) => void

export const USER_CONTEXT_EVENT = "user-context:change" as const

class UserContextStorage {
  private readonly STORAGE_KEY = "app_user_context_v1"
  private readonly CACHE_DURATION = 10_000
  private readonly CONTEXT_TTL = 30 * 24 * 60 * 60 * 1000

  private cache: { value: StoredUserContext | null; expiresAt: number } | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private listeners = new Set<ContextListener>()
  private initialized = false
  private userIdHint: number | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.initialize()
    }
  }

  setUserHint(userId: number | null): void {
    if (typeof userId === "number" && Number.isFinite(userId)) {
      this.userIdHint = userId
    } else {
      this.userIdHint = null
    }
  }

  subscribe(listener: ContextListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getLocalContext(): StoredUserContext | null {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.value
    }

    if (typeof window === "undefined") {
      return null
    }

    this.initialize()

    let parsed: StoredUserContext | null = null
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY)
      parsed = this.parse(raw)
    } catch (error) {
      console.warn("[user-context] Unable to read cached context:", error)
    }

    if (parsed && this.isExpired(parsed)) {
      this.clearContext({ silent: true })
      parsed = null
    }

    if (parsed && !this.hasValidHash(parsed)) {
      this.clearContext({ silent: true })
      parsed = null
    }

    this.cache = {
      value: parsed,
      expiresAt: Date.now() + this.CACHE_DURATION,
    }

    return parsed
  }

  async saveContext(orgId: number, companyId: number | null): Promise<void> {
    if (typeof window === "undefined" || !Number.isFinite(orgId)) {
      return
    }

    this.initialize()

    const context: StoredUserContext = {
      orgId,
      companyId: companyId ?? null,
      updatedAt: Date.now(),
      version: "1.0",
      hash: this.generateHash(orgId, companyId ?? null),
    }

    this.persist(context)
    this.emit(context)
    this.broadcast(context)
  }

  clearContext(options?: { silent?: boolean }) {
    if (typeof window === "undefined") {
      return
    }

    this.initialize()
    this.cache = {
      value: null,
      expiresAt: Date.now() + this.CACHE_DURATION,
    }

    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.warn("[user-context] Failed to clear cache", error)
    }

    if (!options?.silent) {
      this.emit(null)
      this.broadcast(null)
    }
  }

  private initialize() {
    if (this.initialized) {
      return
    }
    const win = typeof window === "undefined" ? null : window
    if (!win) {
      return
    }

    this.initialized = true
    if (typeof win.addEventListener === "function") {
      win.addEventListener("storage", this.handleStorageEvent)
    }

    const ChannelCtor =
      (win as Window & { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel ??
      (typeof BroadcastChannel === "function" ? BroadcastChannel : null)

    if (ChannelCtor) {
      this.broadcastChannel = new ChannelCtor("app_context_sync")
      this.broadcastChannel.addEventListener("message", this.handleBroadcastMessage)
    }
  }

  private handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== this.STORAGE_KEY) {
        return
      }
      const parsed = this.parse(event.newValue)
      if (parsed && this.isExpired(parsed)) {
        this.clearContext({ silent: true })
        return
      }
      this.cache = {
        value: parsed,
        expiresAt: Date.now() + this.CACHE_DURATION,
      }
      this.emit(parsed)
  }

  private handleBroadcastMessage = (event: MessageEvent) => {
    const payload = event.data
    if (!payload || payload.type !== "CONTEXT_CHANGED") {
      return
    }
    const parsed = this.parseFromObject(payload.context)
    if (parsed && this.isExpired(parsed)) {
      this.clearContext({ silent: true })
      return
    }
    this.cache = {
      value: parsed,
      expiresAt: Date.now() + this.CACHE_DURATION,
    }
    this.emit(parsed)
  }

  private emit(context: StoredUserContext | null) {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(context)
      } catch (error) {
        console.error("[user-context] listener error", error)
      }
    }

    const win = typeof window === "undefined" ? null : window
    const dispatch =
      win && typeof win.dispatchEvent === "function" ? win.dispatchEvent.bind(win) : null
    const CustomEvt =
      win?.CustomEvent ??
      (typeof CustomEvent !== "undefined" ? CustomEvent : undefined)

    if (dispatch && typeof CustomEvt === "function") {
      dispatch(
        new CustomEvt(USER_CONTEXT_EVENT, {
          detail: context,
        }),
      )
    }
  }

  private broadcast(context: StoredUserContext | null) {
    if (typeof window === "undefined") {
      return
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: "CONTEXT_CHANGED",
        context,
      })
    }
  }

  private persist(context: StoredUserContext) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(context))
    } catch (error) {
      console.warn("[user-context] Unable to persist context", error)
    }

    this.cache = {
      value: context,
      expiresAt: Date.now() + this.CACHE_DURATION,
    }
  }

  private parse(raw: string | null): StoredUserContext | null {
    if (!raw) {
      return null
    }
    try {
      const parsed = JSON.parse(raw)
      return this.parseFromObject(parsed)
    } catch {
      return null
    }
  }

  private parseFromObject(value: unknown): StoredUserContext | null {
    if (!value || typeof value !== "object") {
      return null
    }
    const candidate = value as Partial<StoredUserContext>
    if (
      typeof candidate.orgId !== "number" ||
      !Number.isFinite(candidate.orgId) ||
      typeof candidate.updatedAt !== "number" ||
      !Number.isFinite(candidate.updatedAt)
    ) {
      return null
    }

    return {
      orgId: candidate.orgId,
      companyId:
        typeof candidate.companyId === "number" && Number.isFinite(candidate.companyId)
          ? candidate.companyId
          : null,
      updatedAt: candidate.updatedAt,
      version: typeof candidate.version === "string" ? candidate.version : "1.0",
      hash: typeof candidate.hash === "string" ? candidate.hash : null,
    }
  }

  private isExpired(context: StoredUserContext): boolean {
    return Date.now() - context.updatedAt > this.CONTEXT_TTL
  }

  private generateHash(orgId: number, companyId: number | null): string | null {
    if (!Number.isFinite(orgId)) {
      return null
    }
    const parts = [String(orgId), companyId == null ? "null" : String(companyId)]
    parts.push(this.userIdHint == null ? "anonymous" : String(this.userIdHint))

    const encoder =
      (typeof window !== "undefined" && typeof window.btoa === "function" && window.btoa) ||
      ((globalThis as { btoa?: (data: string) => string }).btoa ?? null)
    if (encoder) {
      try {
        return encoder(parts.join(":"))
      } catch {
        // ignore btoa failure
      }
    }

    return parts.join(":")
  }

  private hasValidHash(context: StoredUserContext): boolean {
    if (!context.hash) {
      return false
    }
    const expected = this.generateHash(context.orgId, context.companyId ?? null)
    if (!expected) {
      return false
    }
    return expected === context.hash
  }

}

export const userContextStorage = new UserContextStorage()
