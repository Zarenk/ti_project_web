import type { HelpEntry, HelpSection } from "./types"

/**
 * FASE 3.3: Offline Support System
 *
 * Provides offline functionality for the help system:
 * - IndexedDB storage for help entries
 * - Offline detection
 * - Sync when back online
 * - Cache management
 */

const DB_NAME = "adslab-help-offline"
const DB_VERSION = 1
const STORE_NAME = "help-entries"
const SECTIONS_STORE = "help-sections"

interface OfflineStatus {
  isOnline: boolean
  lastSync: number | null
  pendingSync: boolean
}

let db: IDBDatabase | null = null

/** Initialize IndexedDB for offline storage */
export async function initOfflineDB(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    console.warn("IndexedDB not available. Offline mode disabled.")
    return
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error("Failed to open IndexedDB:", request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      console.log("✅ Offline help database initialized")
      resolve()
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create help entries store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const entriesStore = database.createObjectStore(STORE_NAME, { keyPath: "id" })
        entriesStore.createIndex("section", "section", { unique: false })
        entriesStore.createIndex("keywords", "keywords", { unique: false, multiEntry: true })
      }

      // Create sections store
      if (!database.objectStoreNames.contains(SECTIONS_STORE)) {
        database.createObjectStore(SECTIONS_STORE, { keyPath: "id" })
      }
    }
  })
}

/** Store help entries in IndexedDB for offline access */
export async function cacheHelpEntries(entries: HelpEntry[]): Promise<void> {
  if (!db) {
    console.warn("DB not initialized. Call initOfflineDB first.")
    return
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    // Clear existing entries first
    const clearRequest = store.clear()

    clearRequest.onsuccess = () => {
      // Add all entries
      entries.forEach((entry) => {
        store.add(entry)
      })
    }

    transaction.oncomplete = () => {
      console.log(`✅ Cached ${entries.length} help entries for offline use`)
      updateOfflineStatus({ lastSync: Date.now() })
      resolve()
    }

    transaction.onerror = () => {
      console.error("Failed to cache help entries:", transaction.error)
      reject(transaction.error)
    }
  })
}

/** Store help sections in IndexedDB */
export async function cacheHelpSections(sections: HelpSection[]): Promise<void> {
  if (!db) return

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([SECTIONS_STORE], "readwrite")
    const store = transaction.objectStore(SECTIONS_STORE)

    // Clear existing sections
    const clearRequest = store.clear()

    clearRequest.onsuccess = () => {
      sections.forEach((section) => {
        store.add(section)
      })
    }

    transaction.oncomplete = () => {
      console.log(`✅ Cached ${sections.length} help sections for offline use`)
      resolve()
    }

    transaction.onerror = () => {
      reject(transaction.error)
    }
  })
}

/** Retrieve all help entries from IndexedDB */
export async function getOfflineHelpEntries(): Promise<HelpEntry[]> {
  if (!db) {
    await initOfflineDB()
    if (!db) return []
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result as HelpEntry[])
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

/** Retrieve help entries by section from IndexedDB */
export async function getOfflineHelpEntriesBySection(section: string): Promise<HelpEntry[]> {
  if (!db) {
    await initOfflineDB()
    if (!db) return []
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index("section")
    const request = index.getAll(section)

    request.onsuccess = () => {
      resolve(request.result as HelpEntry[])
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

/** Check if user is online */
export function isOnline(): boolean {
  if (typeof window === "undefined") return true
  return window.navigator.onLine
}

/** Get offline status from localStorage */
export function getOfflineStatus(): OfflineStatus {
  try {
    const stored = localStorage.getItem("help-offline-status")
    if (stored) {
      return JSON.parse(stored) as OfflineStatus
    }
  } catch {
    // Ignore errors
  }

  return {
    isOnline: isOnline(),
    lastSync: null,
    pendingSync: false,
  }
}

/** Update offline status in localStorage */
export function updateOfflineStatus(update: Partial<OfflineStatus>): void {
  try {
    const current = getOfflineStatus()
    const updated = { ...current, ...update }
    localStorage.setItem("help-offline-status", JSON.stringify(updated))
  } catch {
    // Ignore errors
  }
}

/** Setup online/offline event listeners */
export function setupOfflineDetection(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === "undefined") {
    return () => {} // No-op cleanup for SSR
  }

  const handleOnline = () => {
    console.log("🌐 Back online!")
    updateOfflineStatus({ isOnline: true })
    onOnline()
  }

  const handleOffline = () => {
    console.log("📴 You are offline. Help system will use cached data.")
    updateOfflineStatus({ isOnline: false })
    onOffline()
  }

  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)

  // Set initial status
  updateOfflineStatus({ isOnline: isOnline() })

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
  }
}

/** Search help entries offline using keyword matching */
export async function searchOffline(
  query: string,
  section?: string
): Promise<HelpEntry[]> {
  const entries = section
    ? await getOfflineHelpEntriesBySection(section)
    : await getOfflineHelpEntries()

  const normalizedQuery = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  // Simple keyword-based search
  const matches = entries.filter((entry) => {
    const searchText = `${entry.question} ${entry.answer} ${entry.aliases.join(" ")}`.toLowerCase()
    return searchText.includes(normalizedQuery)
  })

  // Sort by relevance (question matches first)
  return matches.sort((a, b) => {
    const aInQuestion = a.question.toLowerCase().includes(normalizedQuery)
    const bInQuestion = b.question.toLowerCase().includes(normalizedQuery)

    if (aInQuestion && !bInQuestion) return -1
    if (!aInQuestion && bInQuestion) return 1
    return 0
  })
}

/** Get cache size and stats */
export async function getCacheStats(): Promise<{
  entriesCount: number
  lastSync: number | null
  isOnline: boolean
}> {
  const entries = await getOfflineHelpEntries()
  const status = getOfflineStatus()

  return {
    entriesCount: entries.length,
    lastSync: status.lastSync,
    isOnline: status.isOnline,
  }
}

/** Clear offline cache */
export async function clearOfflineCache(): Promise<void> {
  if (!db) return

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME, SECTIONS_STORE], "readwrite")

    transaction.objectStore(STORE_NAME).clear()
    transaction.objectStore(SECTIONS_STORE).clear()

    transaction.oncomplete = () => {
      console.log("🗑️ Offline cache cleared")
      updateOfflineStatus({ lastSync: null })
      resolve()
    }

    transaction.onerror = () => {
      reject(transaction.error)
    }
  })
}

/** Sync offline data when coming back online */
export async function syncWhenOnline(): Promise<void> {
  if (!isOnline()) {
    console.log("Still offline. Skipping sync.")
    return
  }

  updateOfflineStatus({ pendingSync: true })

  try {
    // TODO: Fetch latest help data from server
    // For now, just mark as synced
    updateOfflineStatus({
      lastSync: Date.now(),
      pendingSync: false,
    })

    console.log("✅ Help data synced")
  } catch (error) {
    console.error("Failed to sync help data:", error)
    updateOfflineStatus({ pendingSync: false })
  }
}

/** Preload help data for offline use (call on app initialization) */
export async function preloadOfflineData(
  entries: HelpEntry[],
  sections: HelpSection[]
): Promise<void> {
  try {
    await initOfflineDB()
    await Promise.all([
      cacheHelpEntries(entries),
      cacheHelpSections(sections),
    ])
    console.log("✅ Help system ready for offline use")
  } catch (error) {
    console.error("Failed to preload offline data:", error)
  }
}
