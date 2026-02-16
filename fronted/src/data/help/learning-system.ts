/**
 * Sistema de Aprendizaje Automático para el Chatbot
 *
 * Registra queries sin respuesta y aprende de patrones
 * para sugerir nuevos entries automáticamente
 */

export interface UnmatchedQuery {
  query: string
  section: string
  timestamp: number
  count: number
  lastAsked: number
  userSentiment?: string
}

export interface MatchedQuery {
  query: string
  matchedEntryId: string
  matchedQuestion: string
  score: number
  section: string
  timestamp: number
}

export interface LearningStats {
  totalUnmatched: number
  totalMatched: number
  unmatchedRate: number
  topUnmatched: UnmatchedQuery[]
  recentUnmatched: UnmatchedQuery[]
  suggestedAliases: Array<{
    entryId: string
    currentQuestion: string
    suggestedAliases: string[]
  }>
}

/**
 * Storage keys para localStorage
 */
const UNMATCHED_QUERIES_KEY = 'help-unmatched-queries'
const MATCHED_QUERIES_KEY = 'help-matched-queries'
const LEARNING_STATS_KEY = 'help-learning-stats'

/**
 * Configuración
 */
const CONFIG = {
  MAX_UNMATCHED_STORED: 500,
  MAX_MATCHED_STORED: 1000,
  SUGGESTION_THRESHOLD: 3, // Sugerir entry después de 3 veces sin respuesta
  ALIAS_SIMILARITY_THRESHOLD: 0.85, // Umbral para considerar alias duplicado
  RETENTION_DAYS: 30, // Retener queries de último mes
}

/**
 * Carga queries sin respuesta desde localStorage
 */
function loadUnmatchedQueries(): Map<string, UnmatchedQuery> {
  try {
    const stored = localStorage.getItem(UNMATCHED_QUERIES_KEY)
    if (!stored) return new Map()

    const data = JSON.parse(stored) as Array<[string, UnmatchedQuery]>
    return new Map(data)
  } catch (error) {
    console.error('[Learning] Error loading unmatched queries:', error)
    return new Map()
  }
}

/**
 * Guarda queries sin respuesta en localStorage
 */
function saveUnmatchedQueries(queries: Map<string, UnmatchedQuery>): void {
  try {
    // Limpiar queries antiguas
    const cutoffDate = Date.now() - (CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const filtered = Array.from(queries.entries())
      .filter(([, q]) => q.lastAsked > cutoffDate)
      .slice(-CONFIG.MAX_UNMATCHED_STORED) // Mantener últimas N

    localStorage.setItem(UNMATCHED_QUERIES_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('[Learning] Error saving unmatched queries:', error)
  }
}

/**
 * Carga queries exitosas desde localStorage
 */
function loadMatchedQueries(): MatchedQuery[] {
  try {
    const stored = localStorage.getItem(MATCHED_QUERIES_KEY)
    if (!stored) return []

    return JSON.parse(stored) as MatchedQuery[]
  } catch (error) {
    console.error('[Learning] Error loading matched queries:', error)
    return []
  }
}

/**
 * Guarda queries exitosas en localStorage
 */
function saveMatchedQueries(queries: MatchedQuery[]): void {
  try {
    // Mantener solo las últimas N
    const toSave = queries.slice(-CONFIG.MAX_MATCHED_STORED)
    localStorage.setItem(MATCHED_QUERIES_KEY, JSON.stringify(toSave))
  } catch (error) {
    console.error('[Learning] Error saving matched queries:', error)
  }
}

/**
 * Registra una query SIN respuesta
 */
export function trackUnmatchedQuery(
  query: string,
  section: string,
  sentiment?: string
): void {
  const unmatchedQueries = loadUnmatchedQueries()
  const key = `${query.toLowerCase().trim()}:${section}`

  const existing = unmatchedQueries.get(key)
  if (existing) {
    existing.count++
    existing.lastAsked = Date.now()
    existing.userSentiment = sentiment || existing.userSentiment
  } else {
    unmatchedQueries.set(key, {
      query: query.trim(),
      section,
      timestamp: Date.now(),
      lastAsked: Date.now(),
      count: 1,
      userSentiment: sentiment,
    })
  }

  saveUnmatchedQueries(unmatchedQueries)

  // Si se alcanza el umbral, sugerir crear entry
  const current = unmatchedQueries.get(key)!
  if (current.count === CONFIG.SUGGESTION_THRESHOLD) {
    console.warn(
      `[Learning] ⚠️ Query "${query}" en sección "${section}" preguntada ${current.count} veces sin respuesta.`,
      '\n💡 Sugerencia: Crear nuevo entry para esta pregunta.'
    )

    // Disparar evento para notificar UI (si hay listener)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('help:suggest-entry', {
        detail: { query, section, count: current.count }
      }))
    }
  }
}

/**
 * Registra una query CON respuesta exitosa
 */
export function trackMatchedQuery(
  query: string,
  matchedEntryId: string,
  matchedQuestion: string,
  score: number,
  section: string
): void {
  const matchedQueries = loadMatchedQueries()

  matchedQueries.push({
    query: query.trim(),
    matchedEntryId,
    matchedQuestion,
    score,
    section,
    timestamp: Date.now(),
  })

  saveMatchedQueries(matchedQueries)
}

/**
 * Obtiene queries sin respuesta más frecuentes
 */
export function getMostAskedUnmatched(limit: number = 10): UnmatchedQuery[] {
  const unmatchedQueries = loadUnmatchedQueries()

  return Array.from(unmatchedQueries.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Obtiene queries sin respuesta más recientes
 */
export function getRecentUnmatched(limit: number = 10): UnmatchedQuery[] {
  const unmatchedQueries = loadUnmatchedQueries()

  return Array.from(unmatchedQueries.values())
    .sort((a, b) => b.lastAsked - a.lastAsked)
    .slice(0, limit)
}

/**
 * Obtiene estadísticas completas del sistema de aprendizaje
 */
export function getLearningStats(): LearningStats {
  const unmatchedQueries = loadUnmatchedQueries()
  const matchedQueries = loadMatchedQueries()

  const totalUnmatched = unmatchedQueries.size
  const totalMatched = matchedQueries.length
  const unmatchedRate = totalUnmatched / (totalUnmatched + totalMatched)

  return {
    totalUnmatched,
    totalMatched,
    unmatchedRate,
    topUnmatched: getMostAskedUnmatched(10),
    recentUnmatched: getRecentUnmatched(10),
    suggestedAliases: discoverNewAliases(matchedQueries),
  }
}

/**
 * Descubre nuevos aliases potenciales analizando queries exitosas
 */
function discoverNewAliases(
  matchedQueries: MatchedQuery[]
): Array<{
  entryId: string
  currentQuestion: string
  suggestedAliases: string[]
}> {
  // Agrupar queries por entry matched
  const queryGroups = new Map<string, Set<string>>()

  matchedQueries.forEach(({ query, matchedEntryId, matchedQuestion }) => {
    if (!queryGroups.has(matchedEntryId)) {
      queryGroups.set(matchedEntryId, new Set([matchedQuestion]))
    }

    // Solo agregar si es suficientemente diferente de la pregunta original
    const normalized = query.toLowerCase().trim()
    const questionNormalized = matchedQuestion.toLowerCase().trim()

    // Calcular similitud simple
    const similarity = calculateSimpleSimilarity(normalized, questionNormalized)

    // Si es diferente (< 85% similar), es potencialmente un alias nuevo
    if (similarity < CONFIG.ALIAS_SIMILARITY_THRESHOLD) {
      queryGroups.get(matchedEntryId)!.add(query.trim())
    }
  })

  // Convertir a array de sugerencias
  const suggestions: Array<{
    entryId: string
    currentQuestion: string
    suggestedAliases: string[]
  }> = []

  queryGroups.forEach((queries, entryId) => {
    const queriesArray = Array.from(queries)
    if (queriesArray.length > 1) {
      const [currentQuestion, ...suggestedAliases] = queriesArray

      // Solo sugerir si hay al menos 1 alias nuevo
      if (suggestedAliases.length > 0) {
        suggestions.push({
          entryId,
          currentQuestion,
          suggestedAliases: suggestedAliases.slice(0, 5), // Máximo 5 sugerencias
        })
      }
    }
  })

  return suggestions
}

/**
 * Calcula similitud simple entre dos strings (0-1)
 */
function calculateSimpleSimilarity(s1: string, s2: string): number {
  const words1 = new Set(s1.split(/\s+/))
  const words2 = new Set(s2.split(/\s+/))

  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return union.size === 0 ? 0 : intersection.size / union.size
}

/**
 * Limpia queries antiguas
 */
export function cleanOldQueries(): void {
  const unmatchedQueries = loadUnmatchedQueries()
  const cutoffDate = Date.now() - (CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000)

  let cleanedCount = 0
  unmatchedQueries.forEach((query, key) => {
    if (query.lastAsked < cutoffDate) {
      unmatchedQueries.delete(key)
      cleanedCount++
    }
  })

  saveUnmatchedQueries(unmatchedQueries)

  console.log(`[Learning] Cleaned ${cleanedCount} old unmatched queries`)
}

/**
 * Exporta datos para análisis externo
 */
export function exportLearningData(): {
  unmatched: UnmatchedQuery[]
  matched: MatchedQuery[]
  stats: LearningStats
} {
  return {
    unmatched: Array.from(loadUnmatchedQueries().values()),
    matched: loadMatchedQueries(),
    stats: getLearningStats(),
  }
}

/**
 * Limpia TODOS los datos de aprendizaje
 */
export function clearAllLearningData(): void {
  localStorage.removeItem(UNMATCHED_QUERIES_KEY)
  localStorage.removeItem(MATCHED_QUERIES_KEY)
  localStorage.removeItem(LEARNING_STATS_KEY)

  console.log('[Learning] All learning data cleared')
}
