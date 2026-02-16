type CacheEntry<T> = {
  value: T
  timestamp: number
}

export class ValidationCache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>()

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }
    if (this.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return null
    }
    return entry.value
  }

  set(key: string, value: T) {
    this.cache.set(key, { value, timestamp: this.now() })
  }

  clear(key?: string) {
    if (typeof key === "string") {
      this.cache.delete(key)
      return
    }
    this.cache.clear()
  }
}

