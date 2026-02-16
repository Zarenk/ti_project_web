/**
 * TYPE DEFINITIONS for Web Workers
 *
 * These types ensure type safety when communicating with workers
 */

// Simplified LearningSession type to avoid circular dependencies
export interface LearningSession {
  query: string
  normalizedQuery: string
  matchFound: boolean
  matchScore?: number
  matchedEntryId?: string
  userFeedback?: "POSITIVE" | "NEGATIVE" | null
  timestamp: number
  section: string
  userId?: string
  source?: "static" | "ai" | "promoted" | "offline"
  responseTimeMs?: number
  isMetaQuestion?: boolean
  isInvalidQuery?: boolean
  hasSteps?: boolean
  userType?: "beginner" | "intermediate" | "advanced"
  urgency?: "normal" | "high" | "critical"
  isContextual?: boolean
}

// ==================== MESSAGE TYPES ====================

export interface AnalyzePatternsMessage {
  type: 'ANALYZE_PATTERNS'
  data: {
    sessions: LearningSession[]
  }
}

export interface TFIDFSearchMessage {
  type: 'TFIDF_SEARCH'
  data: {
    query: string
    documents: Array<{ id: string; text: string }>
    topN?: number
  }
}

export interface AddTFIDFDocumentMessage {
  type: 'ADD_TFIDF_DOCUMENT'
  data: {
    id: string
    text: string
  }
}

export interface ClearTFIDFMessage {
  type: 'CLEAR_TFIDF'
}

export type WorkerMessage =
  | AnalyzePatternsMessage
  | TFIDFSearchMessage
  | AddTFIDFDocumentMessage
  | ClearTFIDFMessage

// ==================== RESPONSE TYPES ====================

export interface PatternsResult {
  type: 'PATTERNS_RESULT'
  data: {
    suggestedAliases: number
    suggestedEntries: number
    processingTimeMs: number
  }
}

export interface TFIDFSearchResult {
  type: 'TFIDF_SEARCH_RESULT'
  data: {
    results: Array<{ id: string; score: number }>
    processingTimeMs: number
  }
}

export interface ErrorResult {
  type: 'ERROR'
  data: {
    message: string
    originalType: string
  }
}

export type WorkerResponse = PatternsResult | TFIDFSearchResult | ErrorResult

// ==================== HELPER FUNCTIONS ====================

/**
 * Type guard for pattern analysis results
 */
export function isPatternsResult(response: WorkerResponse): response is PatternsResult {
  return response.type === 'PATTERNS_RESULT'
}

/**
 * Type guard for TF-IDF search results
 */
export function isTFIDFSearchResult(response: WorkerResponse): response is TFIDFSearchResult {
  return response.type === 'TFIDF_SEARCH_RESULT'
}

/**
 * Type guard for error results
 */
export function isErrorResult(response: WorkerResponse): response is ErrorResult {
  return response.type === 'ERROR'
}
