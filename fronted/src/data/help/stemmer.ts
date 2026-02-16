/**
 * Sistema de Stemming para Español
 * Reduce palabras a su raíz común para mejorar matching
 *
 * Ejemplos:
 * - "vendiendo", "vendido", "vendidos" → "vend"
 * - "productos", "producto" → "product"
 * - "creación", "creador", "creando" → "cre"
 */

/**
 * Sufijos comunes en español ordenados por longitud (más largo primero)
 */
const SPANISH_SUFFIXES = [
  // Participios y gerundios
  'ándose', 'éndose', 'ándole', 'éndole',
  'ándola', 'éndola', 'ándolo', 'éndolo',
  'ándome', 'éndome', 'ándote', 'éndote',
  'ándoles', 'éndoles', 'ándolas', 'éndolas',
  'ándolos', 'éndolos', 'ándomes', 'éndomes',
  'ándotes', 'éndotes',

  // Adverbios
  'amente', 'mente',

  // Plurales y femeninos
  'aciones', 'uciones', 'adores', 'adoras', 'ientes', 'ientos',

  // Verbos conjugados
  'ábamos', 'áramos', 'iéramos', 'iésemos', 'ásemos',
  'ábais', 'arais', 'ierais', 'ieseis', 'aseis',
  'ieron', 'iendo', 'iéron', 'amos', 'emos', 'imos',
  'ando', 'endo',

  // Sustantivos
  'ación', 'ución', 'encia', 'ancia', 'idad',
  'dor', 'dora', 'ador', 'adora', 'ante', 'ente',
  'ible', 'able', 'ismo', 'ista', 'ción',

  // Adjetivos
  'ísimo', 'ísima', 'ísimos', 'ísimas',

  // Formas verbales simples
  'aba', 'ada', 'ida', 'ara', 'era', 'ía',
  'aré', 'eré', 'iré', 'ase', 'ese',
  'ar', 'er', 'ir',
  'aste', 'iste', 'aron',

  // Plurales simples
  'os', 'as', 'es', 's',
]

/**
 * Palabras que NO deben reducirse (stopwords importantes para contexto)
 */
const PROTECTED_WORDS = new Set([
  'es', 'son', 'sea', 'ser', 'esta', 'este', 'estos', 'estas',
  'mas', 'menos', 'como', 'donde', 'cuando', 'porque',
  'dias', 'mes', 'año', 'hora', 'tiempo',
])

/**
 * Cache de stemming para performance
 */
const stemmingCache = new Map<string, string>()

/**
 * Reduce una palabra a su raíz común
 */
export function stem(word: string): string {
  // Normalizar
  const normalized = word.toLowerCase().trim()

  // Verificar cache
  if (stemmingCache.has(normalized)) {
    return stemmingCache.get(normalized)!
  }

  // Palabras protegidas
  if (PROTECTED_WORDS.has(normalized)) {
    stemmingCache.set(normalized, normalized)
    return normalized
  }

  // Palabras muy cortas (≤3 caracteres) no se reducen
  if (normalized.length <= 3) {
    stemmingCache.set(normalized, normalized)
    return normalized
  }

  let stemmed = normalized

  // Intentar remover sufijos
  for (const suffix of SPANISH_SUFFIXES) {
    if (stemmed.endsWith(suffix)) {
      const potential = stemmed.slice(0, -suffix.length)

      // La raíz debe tener al menos 3 caracteres
      if (potential.length >= 3) {
        stemmed = potential
        break
      }
    }
  }

  // Guardar en cache
  stemmingCache.set(normalized, stemmed)

  return stemmed
}

/**
 * Reduce todas las palabras de un texto a sus raíces
 */
export function stemText(text: string): string {
  const words = text.toLowerCase().split(/\s+/)
  const stemmedWords = words.map(word => {
    // Preservar puntuación al final
    const match = word.match(/^(.*?)([¿?!.,;:]+)?$/)
    if (match) {
      const [, wordPart, punctuation] = match
      return stem(wordPart) + (punctuation || '')
    }
    return stem(word)
  })

  return stemmedWords.join(' ')
}

/**
 * Verifica si dos palabras tienen la misma raíz
 */
export function haveSameRoot(word1: string, word2: string): boolean {
  return stem(word1) === stem(word2)
}

/**
 * Calcula similaridad considerando raíces comunes
 * Retorna un boost si las palabras comparten raíz
 */
export function rootSimilarityBoost(word1: string, word2: string): number {
  if (haveSameRoot(word1, word2)) {
    // Mismo root = boost de 0.2
    return 0.2
  }
  return 0
}

/**
 * Genera variaciones comunes de una palabra usando stemming
 */
export function generateVariations(word: string): string[] {
  const root = stem(word)
  const variations = new Set<string>([word, root])

  // Generar plurales
  if (!word.endsWith('s')) {
    variations.add(word + 's')
    variations.add(word + 'es')
  }

  // Si es verbo, generar conjugaciones básicas
  if (word.endsWith('ar') || word.endsWith('er') || word.endsWith('ir')) {
    variations.add(root + 'ando') // gerundio
    variations.add(root + 'ado')  // participio
    variations.add(root + 'a')    // presente
    variations.add(root + 'ó')    // pasado
  }

  return Array.from(variations)
}

/**
 * Limpia el cache (útil para testing)
 */
export function clearStemmingCache(): void {
  stemmingCache.clear()
}

/**
 * Estadísticas del cache
 */
export function getStemmingCacheStats(): { size: number, hitRate: number } {
  return {
    size: stemmingCache.size,
    hitRate: 0, // Implementar contador de hits/misses si se necesita
  }
}
