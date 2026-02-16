/**
 * Sistema de Búsqueda Semántica con TF-IDF y Similitud de Coseno
 * FASE 2 - MEJORA #1: Embeddings semántico local
 *
 * Features:
 * - Vectorización TF-IDF de help entries
 * - Similitud de coseno para matching semántico
 * - No requiere APIs externas (100% local)
 * - Cache de vectores para performance
 * - Soporte para queries complejas y contextuales
 */

import type { HelpEntry, HelpSection } from "./types"
import { DOMAIN_SYNONYMS } from "./synonyms"

/**
 * Vector TF-IDF de un documento
 */
interface TFIDFVector {
  entryId: string
  vector: Map<string, number>
  magnitude: number
  text: string
}

/**
 * Resultado de búsqueda semántica
 */
export interface SemanticSearchResult {
  entry: HelpEntry
  score: number
  matchType: "semantic" | "keyword" | "hybrid"
  matchedTerms: string[]
}

/**
 * Clase para búsqueda semántica con TF-IDF
 */
class SemanticSearchEngine {
  private vectors: TFIDFVector[] = []
  private idfScores: Map<string, number> = new Map()
  private vocabulary: Set<string> = new Set()
  private entries: Map<string, HelpEntry> = new Map()
  private initialized = false

  /**
   * Inicializa el motor de búsqueda con las help entries
   */
  initialize(sections: HelpSection[]): void {
    if (this.initialized) return

    console.log("[SemanticSearch] Initializing with", sections.length, "sections")

    // Recopilar todas las entries
    const allEntries: HelpEntry[] = []
    sections.forEach((section) => {
      section.entries.forEach((entry) => {
        allEntries.push(entry)
        this.entries.set(entry.id, entry)
      })
    })

    console.log("[SemanticSearch] Processing", allEntries.length, "entries")

    // Construir vocabulario y calcular TF-IDF
    this.buildVocabulary(allEntries)
    this.calculateIDF(allEntries)
    this.vectors = allEntries.map((entry) => this.vectorize(entry))

    this.initialized = true
    console.log("[SemanticSearch] Initialized with", this.vocabulary.size, "unique terms")
  }

  /**
   * Construye el vocabulario a partir de todas las entries
   */
  private buildVocabulary(entries: HelpEntry[]): void {
    entries.forEach((entry) => {
      const text = this.getEntryText(entry)
      const terms = this.tokenize(text)
      terms.forEach((term) => this.vocabulary.add(term))
    })
  }

  /**
   * Calcula IDF (Inverse Document Frequency) para cada término
   */
  private calculateIDF(entries: HelpEntry[]): void {
    const documentFrequency = new Map<string, number>()

    // Contar en cuántos documentos aparece cada término
    entries.forEach((entry) => {
      const text = this.getEntryText(entry)
      const terms = new Set(this.tokenize(text))
      terms.forEach((term) => {
        documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1)
      })
    })

    // Calcular IDF para cada término
    const totalDocuments = entries.length
    documentFrequency.forEach((freq, term) => {
      const idf = Math.log(totalDocuments / freq)
      this.idfScores.set(term, idf)
    })
  }

  /**
   * Vectoriza una entry usando TF-IDF
   */
  private vectorize(entry: HelpEntry): TFIDFVector {
    const text = this.getEntryText(entry)
    const terms = this.tokenize(text)
    const termFrequency = new Map<string, number>()

    // Calcular frecuencia de términos
    terms.forEach((term) => {
      termFrequency.set(term, (termFrequency.get(term) || 0) + 1)
    })

    // Calcular TF-IDF para cada término
    const vector = new Map<string, number>()
    let magnitudeSquared = 0

    termFrequency.forEach((tf, term) => {
      const idf = this.idfScores.get(term) || 0
      const tfidf = tf * idf
      vector.set(term, tfidf)
      magnitudeSquared += tfidf * tfidf
    })

    const magnitude = Math.sqrt(magnitudeSquared)

    return {
      entryId: entry.id,
      vector,
      magnitude,
      text,
    }
  }

  /**
   * Realiza búsqueda semántica
   */
  search(query: string, topK: number = 5, threshold: number = 0.3): SemanticSearchResult[] {
    if (!this.initialized) {
      console.warn("[SemanticSearch] Not initialized, returning empty results")
      return []
    }

    // Vectorizar query
    const queryVector = this.vectorizeQuery(query)

    // Calcular similitud con todas las entries
    const similarities = this.vectors.map((docVector) => {
      const similarity = this.cosineSimilarity(queryVector.vector, docVector.vector, queryVector.magnitude, docVector.magnitude)
      const entry = this.entries.get(docVector.entryId)!

      // Detectar términos que matchean
      const matchedTerms = this.getMatchedTerms(query, docVector.text)

      return {
        entry,
        score: similarity,
        matchType: similarity > 0.6 ? "semantic" : similarity > 0.3 ? "hybrid" : "keyword",
        matchedTerms,
      } as SemanticSearchResult
    })

    // Filtrar por threshold y ordenar por score
    const results = similarities
      .filter((result) => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    console.log("[SemanticSearch] Query:", query, "Results:", results.length)

    return results
  }

  /**
   * Vectoriza una query
   */
  private vectorizeQuery(query: string): { vector: Map<string, number>; magnitude: number } {
    const terms = this.tokenize(query)
    const termFrequency = new Map<string, number>()

    terms.forEach((term) => {
      termFrequency.set(term, (termFrequency.get(term) || 0) + 1)
    })

    const vector = new Map<string, number>()
    let magnitudeSquared = 0

    termFrequency.forEach((tf, term) => {
      const idf = this.idfScores.get(term) || 0
      const tfidf = tf * idf
      vector.set(term, tfidf)
      magnitudeSquared += tfidf * tfidf
    })

    const magnitude = Math.sqrt(magnitudeSquared)

    return { vector, magnitude }
  }

  /**
   * Calcula similitud de coseno entre dos vectores
   */
  private cosineSimilarity(
    v1: Map<string, number>,
    v2: Map<string, number>,
    magnitude1: number,
    magnitude2: number
  ): number {
    if (magnitude1 === 0 || magnitude2 === 0) return 0

    let dotProduct = 0

    // Solo calcular para términos que aparecen en ambos vectores
    v1.forEach((value1, term) => {
      const value2 = v2.get(term)
      if (value2 !== undefined) {
        dotProduct += value1 * value2
      }
    })

    return dotProduct / (magnitude1 * magnitude2)
  }

  /**
   * Obtiene el texto completo de una entry para vectorización
   */
  private getEntryText(entry: HelpEntry): string {
    const parts: string[] = [
      entry.question,
      entry.answer,
      ...entry.aliases,
    ]

    if (entry.keywords) {
      parts.push(...entry.keywords)
    }

    if (entry.steps) {
      entry.steps.forEach((step) => {
        parts.push(step.text)
      })
    }

    return parts.join(" ")
  }

  /**
   * Tokeniza texto en términos individuales
   */
  private tokenize(text: string): string[] {
    // Normalizar texto
    const normalized = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[^\w\s]/g, " ") // Quitar puntuación

    // Split en palabras
    let terms = normalized.split(/\s+/).filter((t) => t.length > 2)

    // Expandir sinónimos
    const expandedTerms: string[] = []
    terms.forEach((term) => {
      expandedTerms.push(term)

      // Agregar sinónimos si existen
      const synonyms = DOMAIN_SYNONYMS[term as keyof typeof DOMAIN_SYNONYMS]
      if (synonyms) {
        expandedTerms.push(...synonyms.map(s => s.toLowerCase()))
      }
    })

    return expandedTerms
  }

  /**
   * Obtiene términos que matchean entre query y texto
   */
  private getMatchedTerms(query: string, text: string): string[] {
    const queryTerms = new Set(this.tokenize(query))
    const textTerms = new Set(this.tokenize(text))
    const matched: string[] = []

    queryTerms.forEach((term) => {
      if (textTerms.has(term)) {
        matched.push(term)
      }
    })

    return matched
  }

  /**
   * Limpia el motor (útil para re-inicialización)
   */
  clear(): void {
    this.vectors = []
    this.idfScores.clear()
    this.vocabulary.clear()
    this.entries.clear()
    this.initialized = false
  }
}

// Singleton instance
export const semanticSearchEngine = new SemanticSearchEngine()

/**
 * Inicializa el motor de búsqueda semántica
 */
export function initializeSemanticSearch(sections: HelpSection[]): void {
  semanticSearchEngine.initialize(sections)
}

/**
 * Realiza búsqueda semántica
 */
export function semanticSearch(query: string, topK: number = 5, threshold: number = 0.3): SemanticSearchResult[] {
  return semanticSearchEngine.search(query, topK, threshold)
}

/**
 * Limpia el motor de búsqueda
 */
export function clearSemanticSearch(): void {
  semanticSearchEngine.clear()
}
