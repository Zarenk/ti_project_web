/**
 * Queue de Sincronización Offline con Retry
 * Maneja la persistencia de mensajes cuando hay fallos de red
 *
 * Features:
 * - Exponential backoff para reintentos
 * - Persistencia en localStorage
 * - Auto-limpieza después de 5 intentos
 * - Procesamiento en background
 */

import { authFetch } from "@/utils/auth-fetch"

const STORAGE_KEY = "help-sync-queue"
const MAX_RETRIES = 5
const BASE_DELAY = 1000 // 1 segundo

export interface PendingSync {
  id: string
  endpoint: string
  payload: any
  timestamp: number
  retries: number
  lastError?: string
}

class SyncQueue {
  private queue: PendingSync[] = []
  private processing = false
  private processTimer: NodeJS.Timeout | null = null

  constructor() {
    this.loadFromLocalStorage()

    // Procesar queue al inicializar
    if (this.queue.length > 0) {
      this.scheduleProcess()
    }

    // Listener para detectar cuando vuelve la conexión
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("[SyncQueue] Connection restored, processing queue")
        this.process()
      })
    }
  }

  /**
   * Agrega un item a la queue y lo procesa
   */
  async add(endpoint: string, payload: any): Promise<void> {
    const item: PendingSync = {
      id: crypto.randomUUID(),
      endpoint,
      payload,
      timestamp: Date.now(),
      retries: 0,
    }

    this.queue.push(item)
    this.saveToLocalStorage()

    // Intentar procesar inmediatamente
    await this.process()
  }

  /**
   * Procesa la queue de sincronización
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const item = this.queue[0]

      try {
        // Intentar enviar el item
        await authFetch(item.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(item.payload),
        })

        // Éxito: remover de queue
        console.log(`[SyncQueue] Successfully synced item ${item.id}`)
        this.queue.shift()
        this.saveToLocalStorage()
      } catch (error: any) {
        console.warn(`[SyncQueue] Failed to sync item ${item.id}:`, error.message)

        // Incrementar contador de reintentos
        item.retries++
        item.lastError = error.message

        if (item.retries >= MAX_RETRIES) {
          // Descartar después de MAX_RETRIES intentos
          console.error(
            `[SyncQueue] Item ${item.id} exceeded max retries, discarding`
          )
          this.queue.shift()
          this.saveToLocalStorage()
        } else {
          // Exponential backoff
          const delay = BASE_DELAY * Math.pow(2, item.retries)
          console.log(
            `[SyncQueue] Will retry item ${item.id} in ${delay}ms (attempt ${item.retries}/${MAX_RETRIES})`
          )

          // Salir del loop y programar siguiente intento
          this.processing = false
          this.scheduleProcess(delay)
          return
        }
      }
    }

    this.processing = false
  }

  /**
   * Programa el procesamiento de la queue después de un delay
   */
  private scheduleProcess(delay: number = 0): void {
    if (this.processTimer) {
      clearTimeout(this.processTimer)
    }

    this.processTimer = setTimeout(() => {
      this.process()
    }, delay)
  }

  /**
   * Guarda la queue en localStorage
   */
  private saveToLocalStorage(): void {
    try {
      if (typeof window === "undefined") return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error("[SyncQueue] Failed to save to localStorage:", error)
    }
  }

  /**
   * Carga la queue desde localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      if (typeof window === "undefined") return
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        this.queue = JSON.parse(data)
        console.log(`[SyncQueue] Loaded ${this.queue.length} pending items from storage`)
      }
    } catch (error) {
      console.error("[SyncQueue] Failed to load from localStorage:", error)
      this.queue = []
    }
  }

  /**
   * Obtiene el estado actual de la queue
   */
  getStatus(): {
    pending: number
    processing: boolean
    items: PendingSync[]
  } {
    return {
      pending: this.queue.length,
      processing: this.processing,
      items: [...this.queue],
    }
  }

  /**
   * Limpia la queue (útil para testing)
   */
  clear(): void {
    this.queue = []
    this.saveToLocalStorage()
  }
}

// Singleton instance
export const syncQueue = new SyncQueue()
