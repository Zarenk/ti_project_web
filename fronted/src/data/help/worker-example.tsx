/**
 * EXAMPLE: Web Worker Usage
 *
 * This file demonstrates how the Web Worker is used for help analysis.
 * NOT imported anywhere - just for documentation purposes.
 */

'use client'

import { useEffect } from 'react'
import { recordLearningSession } from './adaptive-learning'
import { useHelpWorker } from '@/hooks/use-help-worker'

/**
 * Example 1: Automatic worker usage via recordLearningSession
 *
 * This is the PRIMARY use case - pattern analysis runs automatically
 * in a worker every 10 learning sessions.
 */
export function AutomaticWorkerExample() {
  useEffect(() => {
    // Simulate user interactions
    const sessions = [
      {
        query: "¿Cómo crear una factura?",
        normalizedQuery: "como crear una factura",
        matchFound: true,
        matchScore: 0.95,
        timestamp: Date.now(),
        section: "sales",
      },
      {
        query: "crear factura rapido",
        normalizedQuery: "crear factura rapido",
        matchFound: false,
        matchScore: 0.45,
        timestamp: Date.now(),
        section: "sales",
      },
      // ... more sessions
    ]

    sessions.forEach(session => {
      // This internally uses the worker for pattern analysis
      // No blocking - analysis happens in background
      recordLearningSession(session)
    })
  }, [])

  return (
    <div>
      <h2>Automatic Worker Example</h2>
      <p>Check console for worker logs</p>
    </div>
  )
}

/**
 * Example 2: Manual TF-IDF search using worker
 *
 * This is an ADVANCED use case for custom TF-IDF operations.
 * Most developers won't need this - the automatic usage is preferred.
 */
export function ManualWorkerExample() {
  const { searchTFIDF, addDocument, isWorkerAvailable } = useHelpWorker()

  const handleSearch = async () => {
    if (!isWorkerAvailable) {
      console.warn('Worker not available - TF-IDF will not work')
      return
    }

    try {
      // Define documents to search
      const documents = [
        {
          id: 'help-1',
          text: 'Cómo crear una factura nueva en el sistema de ventas',
        },
        {
          id: 'help-2',
          text: 'Editar productos en el inventario paso a paso',
        },
        {
          id: 'help-3',
          text: 'Generar reportes de ventas mensuales',
        },
      ]

      // Perform TF-IDF search
      const results = await searchTFIDF('crear factura', documents, 3)

      console.log('TF-IDF Results:', results)
      // Example output:
      // [
      //   { id: 'help-1', score: 0.87 },
      //   { id: 'help-3', score: 0.23 },
      //   { id: 'help-2', score: 0.15 }
      // ]
    } catch (error) {
      console.error('TF-IDF search failed:', error)
    }
  }

  const handleAddDocument = () => {
    if (!isWorkerAvailable) {
      console.warn('Worker not available')
      return
    }

    // Add a document to the TF-IDF corpus
    addDocument('help-4', 'Configurar impuestos y tasas de cambio')
  }

  return (
    <div>
      <h2>Manual TF-IDF Worker Example</h2>
      <p>Worker Status: {isWorkerAvailable ? '✅ Available' : '❌ Not Available'}</p>
      <button onClick={handleSearch}>
        Search with TF-IDF
      </button>
      <button onClick={handleAddDocument}>
        Add Document to Corpus
      </button>
    </div>
  )
}

/**
 * Example 3: Understanding the performance improvement
 */
export function PerformanceExample() {
  useEffect(() => {
    // BEFORE (blocking main thread):
    // User types → recordLearningSession → every 10 queries → analyzePatternsAndSuggest()
    // → UI FREEZES for 100-500ms → user notices lag

    // AFTER (non-blocking worker):
    // User types → recordLearningSession → every 10 queries → analyzeInWorker()
    // → sends to worker → UI STAYS RESPONSIVE → results logged when ready

    console.log('Performance test: Record 10 sessions quickly')
    const startTime = performance.now()

    for (let i = 0; i < 10; i++) {
      recordLearningSession({
        query: `test query ${i}`,
        normalizedQuery: `test query ${i}`,
        matchFound: Math.random() > 0.5,
        matchScore: Math.random(),
        timestamp: Date.now(),
        section: 'general',
      })
    }

    const endTime = performance.now()
    console.log(`Time to record 10 sessions: ${(endTime - startTime).toFixed(2)}ms`)
    console.log('(Pattern analysis will complete in worker - check console)')
  }, [])

  return (
    <div>
      <h2>Performance Example</h2>
      <p>Check console for timing comparison</p>
    </div>
  )
}
