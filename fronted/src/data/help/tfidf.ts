/**
 * 📊 TF-IDF (Term Frequency-Inverse Document Frequency)
 * 
 * Algoritmo para calcular relevancia de términos en documentos
 * Mejora significativamente la precisión de búsquedas textuales
 */

export interface TFIDFDocument {
  id: string
  text: string
  tokens: string[]
  termFreq: Map<string, number>
}

export interface TFIDFScore {
  term: string
  score: number
}

/**
 * Clase TF-IDF para análisis de relevancia
 */
export class TFIDFAnalyzer {
  private documents: TFIDFDocument[] = []
  private idf: Map<string, number> = new Map()
  private stopWords: Set<string>

  constructor() {
    // Palabras comunes en español que no aportan significado
    this.stopWords = new Set([
      "el", "la", "los", "las", "un", "una", "unos", "unas",
      "de", "del", "al", "a", "en", "con", "por", "para",
      "que", "como", "si", "no", "es", "son", "ser",
      "y", "o", "pero", "mas", "más", "muy", "tan",
      "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
      "mi", "tu", "su", "mis", "tus", "sus",
      "me", "te", "se", "le", "lo", "la",
      "hay", "esta", "está", "han", "he", "ha",
    ])
  }

  /**
   * Tokeniza y normaliza un texto
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => 
        token.length >= 3 && !this.stopWords.has(token)
      )
  }

  /**
   * Calcula la frecuencia de términos (TF)
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const freq = new Map<string, number>()
    const total = tokens.length

    tokens.forEach(token => {
      freq.set(token, (freq.get(token) || 0) + 1)
    })

    // Normalizar por total de términos
    freq.forEach((count, term) => {
      freq.set(term, count / total)
    })

    return freq
  }

  /**
   * Agrega un documento al corpus
   */
  addDocument(id: string, text: string): void {
    const tokens = this.tokenize(text)
    const termFreq = this.calculateTF(tokens)

    this.documents.push({
      id,
      text,
      tokens,
      termFreq,
    })

    // Recalcular IDF cuando se agrega un documento
    this.calculateIDF()
  }

  /**
   * Calcula el IDF (Inverse Document Frequency)
   * IDF(term) = log(total_docs / docs_containing_term)
   */
  private calculateIDF(): void {
    this.idf.clear()
    const totalDocs = this.documents.length

    if (totalDocs === 0) return

    // Contar en cuántos documentos aparece cada término
    const docFreq = new Map<string, number>()

    this.documents.forEach(doc => {
      const uniqueTerms = new Set(doc.tokens)
      uniqueTerms.forEach(term => {
        docFreq.set(term, (docFreq.get(term) || 0) + 1)
      })
    })

    // Calcular IDF
    docFreq.forEach((count, term) => {
      this.idf.set(term, Math.log(totalDocs / count))
    })
  }

  /**
   * Calcula el score TF-IDF para un término en un documento
   */
  private getTFIDF(term: string, docTermFreq: Map<string, number>): number {
    const tf = docTermFreq.get(term) || 0
    const idf = this.idf.get(term) || 0
    return tf * idf
  }

  /**
   * Calcula la similaridad entre una query y un documento
   * Retorna un score entre 0 y 1
   */
  similarity(query: string, documentId: string): number {
    const queryTokens = this.tokenize(query)
    const doc = this.documents.find(d => d.id === documentId)

    if (!doc || queryTokens.length === 0) return 0

    const queryTF = this.calculateTF(queryTokens)
    
    // Vector de TF-IDF para la query
    const queryVector = new Map<string, number>()
    queryTokens.forEach(term => {
      queryVector.set(term, this.getTFIDF(term, queryTF))
    })

    // Vector de TF-IDF para el documento
    const docVector = new Map<string, number>()
    doc.tokens.forEach(term => {
      docVector.set(term, this.getTFIDF(term, doc.termFreq))
    })

    // Calcular similaridad del coseno
    return this.cosineSimilarity(queryVector, docVector)
  }

  /**
   * Calcula la similaridad del coseno entre dos vectores
   */
  private cosineSimilarity(
    vec1: Map<string, number>,
    vec2: Map<string, number>
  ): number {
    let dotProduct = 0
    let mag1 = 0
    let mag2 = 0

    // Calcular producto punto y magnitudes
    const allTerms = new Set([
      ...Array.from(vec1.keys()),
      ...Array.from(vec2.keys())
    ])

    allTerms.forEach(term => {
      const v1 = vec1.get(term) || 0
      const v2 = vec2.get(term) || 0

      dotProduct += v1 * v2
      mag1 += v1 * v1
      mag2 += v2 * v2
    })

    mag1 = Math.sqrt(mag1)
    mag2 = Math.sqrt(mag2)

    if (mag1 === 0 || mag2 === 0) return 0

    return dotProduct / (mag1 * mag2)
  }

  /**
   * Busca los documentos más relevantes para una query
   */
  search(query: string, topN: number = 5): Array<{ id: string; score: number }> {
    const results = this.documents.map(doc => ({
      id: doc.id,
      score: this.similarity(query, doc.id),
    }))

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
  }

  /**
   * Extrae los términos más importantes de un texto
   */
  getTopTerms(text: string, topN: number = 10): TFIDFScore[] {
    const tokens = this.tokenize(text)
    const termFreq = this.calculateTF(tokens)
    const scores: TFIDFScore[] = []

    termFreq.forEach((tf, term) => {
      const tfidf = this.getTFIDF(term, termFreq)
      scores.push({ term, score: tfidf })
    })

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
  }

  /**
   * Limpia el corpus
   */
  clear(): void {
    this.documents = []
    this.idf.clear()
  }

  /**
   * Obtiene el número de documentos en el corpus
   */
  get size(): number {
    return this.documents.length
  }
}

/**
 * Instancia global de TF-IDF para el sistema de ayuda
 */
let globalAnalyzer: TFIDFAnalyzer | null = null

export function getGlobalTFIDF(): TFIDFAnalyzer {
  if (!globalAnalyzer) {
    globalAnalyzer = new TFIDFAnalyzer()
  }
  return globalAnalyzer
}

export function resetGlobalTFIDF(): void {
  globalAnalyzer = null
}
