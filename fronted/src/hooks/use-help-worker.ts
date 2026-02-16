/**
 * HOOK: useHelpWorker
 *
 * Provides easy access to the Help Analysis Web Worker for TF-IDF operations.
 * Automatically handles worker lifecycle and error handling.
 *
 * Usage:
 * ```tsx
 * const { searchTFIDF, isWorkerAvailable } = useHelpWorker()
 *
 * // Perform TF-IDF search
 * const results = await searchTFIDF("how to create invoice", documents)
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  WorkerMessage,
  WorkerResponse,
  TFIDFSearchResult,
} from '@/workers/worker-types'
import {
  isTFIDFSearchResult,
  isErrorResult,
} from '@/workers/worker-types'

export function useHelpWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [isWorkerAvailable, setIsWorkerAvailable] = useState(false)
  const pendingCallbacks = useRef<Map<number, {
    resolve: (value: any) => void
    reject: (error: Error) => void
  }>>(new Map())
  const messageIdCounter = useRef(0)

  // Initialize worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // Use worker factory to create worker from inline code
      const { createHelpAnalysisWorker } = require('@/data/help/worker-factory')
      const worker = createHelpAnalysisWorker()

      if (!worker) {
        setIsWorkerAvailable(false)
        return
      }

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const response = e.data

        // Find pending callback by checking response type
        // For now, we'll just resolve the first pending callback
        // In a more complex implementation, you'd track request IDs
        const [callbackId, callback] = Array.from(pendingCallbacks.current.entries())[0] || []

        if (!callback) return

        if (isErrorResult(response)) {
          callback.reject(new Error(response.data.message))
        } else {
          callback.resolve(response.data)
        }

        pendingCallbacks.current.delete(callbackId)
      }

      worker.onerror = (error) => {
        console.warn('[useHelpWorker] Worker error:', error)
        setIsWorkerAvailable(false)

        // Reject all pending callbacks
        pendingCallbacks.current.forEach(callback => {
          callback.reject(new Error('Worker error'))
        })
        pendingCallbacks.current.clear()
      }

      workerRef.current = worker
      setIsWorkerAvailable(true)
    } catch (error) {
      console.warn('[useHelpWorker] Failed to create worker:', error)
      setIsWorkerAvailable(false)
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      pendingCallbacks.current.clear()
    }
  }, [])

  /**
   * Performs TF-IDF search on documents
   */
  const searchTFIDF = useCallback(
    async (
      query: string,
      documents: Array<{ id: string; text: string }>,
      topN: number = 5
    ): Promise<Array<{ id: string; score: number }>> => {
      if (!workerRef.current || !isWorkerAvailable) {
        throw new Error('Worker not available')
      }

      return new Promise((resolve, reject) => {
        const messageId = messageIdCounter.current++
        pendingCallbacks.current.set(messageId, { resolve, reject })

        const message: WorkerMessage = {
          type: 'TFIDF_SEARCH',
          data: { query, documents, topN }
        }

        workerRef.current!.postMessage(message)

        // Timeout after 10 seconds
        setTimeout(() => {
          if (pendingCallbacks.current.has(messageId)) {
            pendingCallbacks.current.delete(messageId)
            reject(new Error('TF-IDF search timeout'))
          }
        }, 10000)
      })
    },
    [isWorkerAvailable]
  )

  /**
   * Adds a document to the TF-IDF corpus
   */
  const addDocument = useCallback(
    (id: string, text: string) => {
      if (!workerRef.current || !isWorkerAvailable) {
        console.warn('[useHelpWorker] Cannot add document: worker not available')
        return
      }

      const message: WorkerMessage = {
        type: 'ADD_TFIDF_DOCUMENT',
        data: { id, text }
      }

      workerRef.current.postMessage(message)
    },
    [isWorkerAvailable]
  )

  /**
   * Clears the TF-IDF corpus
   */
  const clearTFIDF = useCallback(() => {
    if (!workerRef.current || !isWorkerAvailable) {
      console.warn('[useHelpWorker] Cannot clear: worker not available')
      return
    }

    const message: WorkerMessage = {
      type: 'CLEAR_TFIDF'
    }

    workerRef.current.postMessage(message)
  }, [isWorkerAvailable])

  return {
    searchTFIDF,
    addDocument,
    clearTFIDF,
    isWorkerAvailable,
  }
}
