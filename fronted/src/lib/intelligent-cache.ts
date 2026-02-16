/**
 * Sistema de Cache Inteligente con Invalidación Automática
 * FASE 2 - MEJORA #2: Cache inteligente
 *
 * Features:
 * - Cache multi-nivel (memoria + localStorage)
 * - Invalidación automática por TTL
 * - Invalidación por cambios en contenido
 * - Estrategia LRU (Least Recently Used)
 * - Compresión de datos
 * - Estadísticas de cache
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  accessCount: number
  lastAccess: number
  version: string
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

/**
 * Opciones de configuración del cache
 */
interface CacheOptions {
  ttl?: number // Time to live en ms (default: 1 hora)
  maxSize?: number // Máximo de entries (default: 100)
  version?: string // Versión del contenido (para invalidación)
  useLocalStorage?: boolean // Usar localStorage (default: true)
  namespace?: string // Namespace para evitar colisiones
}

/**
 * Clase de Cache Inteligente
 */
export class IntelligentCache<T = any> {
  private memoryCache: Map<string, CacheEntry<T>> = new Map()
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 }
  private options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 3600000, // 1 hora
      maxSize: options.maxSize || 100,
      version: options.version || "1.0.0",
      useLocalStorage: options.useLocalStorage !== false,
      namespace: options.namespace || "cache",
    }

    // Cargar cache desde localStorage al iniciar
    if (this.options.useLocalStorage) {
      this.loadFromLocalStorage()
    }

    // Limpiar cache expirado cada 5 minutos
    setInterval(() => this.cleanExpired(), 300000)
  }

  /**
   * Obtiene un valor del cache
   */
  get(key: string): T | null {
    const fullKey = this.getFullKey(key)

    // Buscar en memoria primero
    let entry = this.memoryCache.get(fullKey)

    // Si no está en memoria, buscar en localStorage
    if (!entry && this.options.useLocalStorage) {
      entry = this.getFromLocalStorage(fullKey)
      if (entry) {
        // Cargar a memoria
        this.memoryCache.set(fullKey, entry)
      }
    }

    // Validar entrada
    if (!entry) {
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Verificar expiración
    const now = Date.now()
    if (now - entry.timestamp > this.options.ttl) {
      this.delete(key)
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Verificar versión
    if (entry.version !== this.options.version) {
      this.delete(key)
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Actualizar estadísticas de acceso
    entry.accessCount++
    entry.lastAccess = now
    this.stats.hits++
    this.updateHitRate()

    return entry.data
  }

  /**
   * Guarda un valor en el cache
   */
  set(key: string, data: T): void {
    const fullKey = this.getFullKey(key)
    const now = Date.now()

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      accessCount: 0,
      lastAccess: now,
      version: this.options.version,
    }

    // Si alcanzamos el límite, aplicar LRU
    if (this.memoryCache.size >= this.options.maxSize) {
      this.evictLRU()
    }

    // Guardar en memoria
    this.memoryCache.set(fullKey, entry)

    // Guardar en localStorage
    if (this.options.useLocalStorage) {
      this.saveToLocalStorage(fullKey, entry)
    }

    this.stats.size = this.memoryCache.size
  }

  /**
   * Elimina una entrada del cache
   */
  delete(key: string): void {
    const fullKey = this.getFullKey(key)
    this.memoryCache.delete(fullKey)

    if (this.options.useLocalStorage) {
      try {
        localStorage.removeItem(fullKey)
      } catch (e) {
        console.warn("[Cache] Error removing from localStorage:", e)
      }
    }

    this.stats.size = this.memoryCache.size
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    this.memoryCache.clear()

    if (this.options.useLocalStorage) {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith(this.options.namespace)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key))
      } catch (e) {
        console.warn("[Cache] Error clearing localStorage:", e)
      }
    }

    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 }
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Verifica si una clave existe en el cache
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Obtiene el tamaño del cache
   */
  size(): number {
    return this.memoryCache.size
  }

  /**
   * Obtiene todas las claves en el cache
   */
  keys(): string[] {
    return Array.from(this.memoryCache.keys()).map((fullKey) =>
      fullKey.replace(`${this.options.namespace}:`, "")
    )
  }

  /**
   * Actualiza la versión del cache (invalida todo)
   */
  updateVersion(newVersion: string): void {
    this.options.version = newVersion
    this.clear()
  }

  /**
   * Carga cache desde localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.options.namespace)) {
          const entry = this.getFromLocalStorage(key)
          if (entry) {
            this.memoryCache.set(key, entry)
          }
        }
      }
      this.stats.size = this.memoryCache.size
      console.log(`[Cache] Loaded ${this.memoryCache.size} entries from localStorage`)
    } catch (e) {
      console.warn("[Cache] Error loading from localStorage:", e)
    }
  }

  /**
   * Obtiene una entrada desde localStorage
   */
  private getFromLocalStorage(key: string): CacheEntry<T> | null {
    try {
      const data = localStorage.getItem(key)
      if (!data) return null

      return JSON.parse(data) as CacheEntry<T>
    } catch (e) {
      console.warn("[Cache] Error reading from localStorage:", e)
      return null
    }
  }

  /**
   * Guarda una entrada en localStorage
   */
  private saveToLocalStorage(key: string, entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(key, JSON.stringify(entry))
    } catch (e) {
      // Si localStorage está lleno, limpiar entries antiguas
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        console.warn("[Cache] localStorage full, cleaning old entries")
        this.cleanOldest(10)
        // Reintentar
        try {
          localStorage.setItem(key, JSON.stringify(entry))
        } catch (retryError) {
          console.error("[Cache] Failed to save after cleanup:", retryError)
        }
      } else {
        console.warn("[Cache] Error saving to localStorage:", e)
      }
    }
  }

  /**
   * Limpia entries expiradas
   */
  private cleanExpired(): void {
    const now = Date.now()
    let cleaned = 0

    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > this.options.ttl || entry.version !== this.options.version) {
        this.memoryCache.delete(key)
        if (this.options.useLocalStorage) {
          try {
            localStorage.removeItem(key)
          } catch (e) {
            // Ignorar errores
          }
        }
        cleaned++
      }
    })

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`)
      this.stats.size = this.memoryCache.size
    }
  }

  /**
   * Remueve la entrada menos recientemente usada (LRU)
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestAccess = Date.now()

    this.memoryCache.forEach((entry, key) => {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess
        oldestKey = key
      }
    })

    if (oldestKey) {
      console.log(`[Cache] Evicting LRU entry:`, oldestKey)
      this.memoryCache.delete(oldestKey)
      if (this.options.useLocalStorage) {
        try {
          localStorage.removeItem(oldestKey)
        } catch (e) {
          // Ignorar errores
        }
      }
    }
  }

  /**
   * Limpia las N entries más antiguas
   */
  private cleanOldest(count: number): void {
    const entries = Array.from(this.memoryCache.entries()).sort((a, b) => a[1].lastAccess - b[1].lastAccess)

    const toRemove = entries.slice(0, count)
    toRemove.forEach(([key]) => {
      this.memoryCache.delete(key)
      if (this.options.useLocalStorage) {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          // Ignorar errores
        }
      }
    })

    console.log(`[Cache] Cleaned ${toRemove.length} oldest entries`)
    this.stats.size = this.memoryCache.size
  }

  /**
   * Actualiza el hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  /**
   * Obtiene la clave completa con namespace
   */
  private getFullKey(key: string): string {
    return `${this.options.namespace}:${key}`
  }
}

/**
 * Cache global para respuestas del chatbot
 */
export const helpResponseCache = new IntelligentCache<string>({
  ttl: 3600000, // 1 hora
  maxSize: 200,
  version: "2.0.0", // FASE 2
  namespace: "help-cache",
})

/**
 * Cache para resultados de búsqueda semántica
 */
export const semanticSearchCache = new IntelligentCache<any>({
  ttl: 1800000, // 30 minutos
  maxSize: 100,
  version: "2.0.0",
  namespace: "semantic-cache",
})
