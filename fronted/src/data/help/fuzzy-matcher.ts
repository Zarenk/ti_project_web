/**
 * Fuzzy matching mejorado con corrección automática de errores
 * y sugerencias "¿Quisiste decir...?"
 *
 * ⭐ MEJORA: Ahora incluye stemming para español para mejor matching de variaciones
 */

import { stem, haveSameRoot, rootSimilarityBoost, stemText } from './stemmer'

/**
 * 🚀 OPTIMIZACIÓN: Cache para distancias de Levenshtein calculadas
 * Reduce cálculos de O(m*n) a O(1) para pares ya calculados
 */
const levenshteinCache = new Map<string, number>();
const MAX_CACHE_SIZE = 1000;

function getCacheKey(s1: string, s2: string): string {
  // Asegurar que la clave sea consistente (s1, s2) = (s2, s1)
  return s1 < s2 ? `${s1}|${s2}` : `${s2}|${s1}`;
}

/**
 * Calcula la distancia de Levenshtein entre dos strings
 * (número de ediciones necesarias para convertir s1 en s2)
 *
 * 🚀 OPTIMIZADO: Con cache LRU para evitar recalcular pares conocidos
 */
export function levenshteinDistance(s1: string, s2: string): number {
  // 🚀 OPTIMIZACIÓN: Early exit para casos triviales
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  // 🚀 OPTIMIZACIÓN: Verificar cache primero
  const cacheKey = getCacheKey(s1, s2);
  const cached = levenshteinCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const len1 = s1.length
  const len2 = s2.length
  const matrix: number[][] = []

  // Inicializar matriz
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Llenar matriz
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Eliminación
        matrix[i][j - 1] + 1, // Inserción
        matrix[i - 1][j - 1] + cost, // Sustitución
      )
    }
  }

  const distance = matrix[len1][len2];

  // 🚀 OPTIMIZACIÓN: Guardar en cache (con límite de tamaño)
  if (levenshteinCache.size >= MAX_CACHE_SIZE) {
    // Limpiar primera entrada (LRU simple)
    const firstKey = levenshteinCache.keys().next().value;
    if (firstKey) levenshteinCache.delete(firstKey);
  }
  levenshteinCache.set(cacheKey, distance);

  return distance;
}

/**
 * Calcula similitud entre dos strings (0-1)
 * 1 = idénticos, 0 = completamente diferentes
 *
 * ⭐ MEJORA: Ahora considera raíces comunes (stemming) para bonus
 */
export function similarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1

  const distance = levenshteinDistance(s1, s2)
  const baseScore = 1 - distance / maxLen

  // ⭐ NUEVO: Si comparten raíz, dar boost
  const bonus = rootSimilarityBoost(s1, s2)

  return Math.min(1.0, baseScore + bonus)
}

/**
 * Errores comunes de escritura en español
 */
export const commonTypos: Record<string, string> = {
  // Ortografía
  "aser": "hacer",
  "acer": "hacer",
  "ago": "hago",
  "ase": "hace",
  "benta": "venta",
  "bender": "vender",
  "bendo": "vendo",
  "bentas": "ventas",
  "nesesito": "necesito",
  "nececito": "necesito",
  "nesesita": "necesita",
  "quero": "quiero",
  "kiero": "quiero",
  "kiereo": "quiero",
  "beo": "veo",
  // 🔧 FIX 4: "ve" → "veo" cuando aparece solo
  "ve": "veo",  // "donde ve mio inventario"
  "ber": "ver",
  "bentana": "ventana",
  "bes": "ves",
  "aber": "ver",
  "ay": "hay",
  "ahi": "ahí",
  // 🔧 FIX 4: Posesivos y pronombres
  "mio": "mi",  // "donde ve mio inventario"
  "mios": "mis",
  // 🔧 FIX 4 ADICIONAL: Typos de "esto"
  "esot": "esto",  // "que hace esot"
  "eso": "esto",   // cuando debería ser "esto"
  "est": "esto",   // "que hace est"
  "asia": "hacia",
  "porque": "por qué", // En preguntas
  "porke": "por qué",
  "xq": "por qué",
  "xk": "por qué",
  "q": "que",
  "k": "que",
  // 🔧 FIX 4: Typos comunes detectados en testing
  "qeu": "que",  // "para qeu sirve"
  "qe": "que",
  "ke": "que",
  "tb": "también",
  "tmb": "también",
  "tambien": "también",
  "aki": "aquí",
  "aca": "acá",
  "dnd": "donde",
  "dond": "donde",
  "dde": "donde",
  "c": "se", // "no c" -> "no se"
  "ase": "hace", // Ya existe pero duplicado para claridad
  "ta": "está",
  "ps": "",  // Muletilla peruana ("rápido ps")
  "pe": "",  // Muletilla peruana

  // Términos técnicos comunes
  "stok": "stock",
  "esток": "stock",
  "inbentario": "inventario",
  "imventario": "inventario",
  "proveedor": "proveedor", // Correcto, pero común
  "probedor": "proveedor",
  "probehedor": "proveedor",
  "provedor": "proveedor",
  "cotisacion": "cotización",
  "cotisasion": "cotización",
  // 🔧 FIX 4: Palabras sin acento
  "catalogo": "catálogo",
  "factura": "factura", // Correcto
  "fatura": "factura",
  "factura": "factura",
  "boleta": "boleta", // Correcto
  "boletta": "boleta",
  "cliente": "cliente", // Correcto
  "clente": "cliente",
  "ciente": "cliente",
  "cliennte": "cliente",
  "producto": "producto", // Correcto
  "prodcuto": "producto",
  "prudcto": "producto",
  "prodcutos": "productos",
  "prudctos": "productos",
  "categoria": "categoría",
  "categria": "categoría",
  "catgoria": "categoría",
  "marca": "marca", // Correcto
  "marka": "marca",
  "reportes": "reportes", // Correcto
  "reporte": "reporte",
  "merca": "mercadería",
  "mercancia": "mercadería",
  "mercaderia": "mercadería",

  // Spanglish común en tech
  "deletear": "eliminar",
  "deletiar": "eliminar",
  "deleteo": "eliminar",
  "delete": "eliminar",
  "editar": "editar", // Correcto
  "editear": "editar",
  "crear": "crear", // Correcto
  "createar": "crear",
  "actualizar": "actualizar", // Correcto
  "updatear": "actualizar",
  "updateo": "actualizar",
  "update": "actualizar",
  "printear": "imprimir",
  "printiar": "imprimir",
  "printeo": "imprimir",
  "print": "imprimir",
  "guardar": "guardar", // Correcto
  "saveear": "guardar",
  "savear": "guardar",
  "save": "guardar",
  "chequear": "revisar",
  "checkear": "revisar",
  "checkeo": "revisar",
  "loguear": "iniciar sesión",
  "logear": "iniciar sesión",
  "login": "iniciar sesión",

  // Formas verbales comunes
  "ingreso": "ingresar",
  "ingresos": "ingresar",
  "registro": "registrar",
  "registros": "registrar",

  // Términos de negocio adicionales
  "cajero": "caja",
  "almacen": "almacén",
  "bodega": "almacén",
  "deposito": "almacén",
  "comprobante": "factura",
  "ticket": "boleta",
  "talonario": "facturación",
  "cobro": "cobrar",
  "pago": "pagar",
  "debe": "deuda",
  "haber": "crédito",
  "saldo": "balance",
  "kardex": "inventario",
  "existencias": "stock",
  "articulo": "artículo",
  "sku": "código",
  "codigo": "código",
  "barras": "código de barras",

  // Errores adicionales comunes
  "bendera": "vender",
  "vende": "vender",
  "compra": "comprar",
  "elimina": "eliminar",
  "borrar": "eliminar",
  "quitar": "eliminar",
  "sacar": "eliminar",
  "agrega": "agregar",
  "añadir": "agregar",
  "meter": "agregar",
  "poner": "agregar",
  "registra": "registrar",
  "anota": "anotar",
  "apunta": "anotar",

  // Variantes regionales - PERÚ
  "sunat": "SUNAT",
  "ose": "OSE",
  "cpe": "comprobante electrónico",
  "gre": "guía de remisión electrónica",

  // Variantes regionales - MÉXICO
  "sat": "SAT",
  "cfdi": "CFDI",
  "timbrado": "timbrado",
  "pac": "PAC",

  // Variantes regionales - ARGENTINA
  "afip": "AFIP",
  "cuit": "CUIT",
  "remito": "guía de remisión",

  // Variantes regionales - COLOMBIA
  "dian": "DIAN",
  "resolucion": "resolución",
  "rut": "RUT",

  // Variantes regionales - CHILE
  "sii": "SII",
  "dte": "DTE",
  "folio": "número de factura",

  // Variantes regionales - ESPAÑA
  "aeat": "AEAT",
  "iva": "IVA",

  // Jerga regional
  "plata": "dinero",
  "guita": "dinero",
  "luca": "mil",
  "lucas": "mil",
  "palo": "millón",
  "verde": "dólar",

  // Términos coloquiales
  "ganancia": "utilidad",
  "perdida": "pérdida",
  "costo": "costo",
  "descuento": "descuento",
  "rebaja": "descuento",
  "oferta": "promoción",
  "promo": "promoción",

  // Hardware y periféricos
  "impresora": "impresora",
  "impresor": "impresora",
  "printer": "impresora",
  "lector": "lector de código de barras",
  "escaner": "escáner",
  "scanner": "escáner",
  "cajon": "cajón de dinero",
  "gaveta": "cajón",
  "pos": "punto de venta",
  "terminal": "terminal de pago",

  // Acciones técnicas
  "exportar": "exportar",
  "importar": "importar",
  "descargar": "descargar",
  "bajar": "descargar",
  "subir": "cargar",
  "cargar": "cargar",
  "sincronizar": "sincronizar",
  "sincro": "sincronizar",
  "refrescar": "actualizar",
  "recargar": "actualizar",

  // Errores ortográficos adicionales
  "usurio": "usuario",
  "usario": "usuario",
  "clave": "contraseña",
  "password": "contraseña",
  "pass": "contraseña",
  "permiso": "permiso",
  "acceso": "acceso",
  "rol": "rol",
  "perfil": "perfil",
}

/**
 * FASE 1 - MEJORA #3: Normaliza caracteres repetidos excesivamente
 * Ejemplos:
 * - "ayudaaaa" → "ayuda"
 * - "urgenteeee" → "urgente"
 * - "porfaaaa" → "porfa"
 */
export function normalizeRepeatedChars(text: string): string {
  // Reducir 3+ caracteres iguales consecutivos a 1
  return text.replace(/(.)\1{2,}/g, '$1')
}

/**
 * Corrige errores comunes en una consulta
 */
export function autoCorrect(query: string): { corrected: string; changed: boolean } {
  // FASE 1 - MEJORA #3: Normalizar caracteres repetidos primero
  const normalized = normalizeRepeatedChars(query)

  const words = normalized.toLowerCase().split(/\s+/)
  const correctedWords = words.map(word => {
    // Quitar puntuación
    const clean = word.replace(/[¿?¡!.,;:]/g, "")
    return commonTypos[clean] || word
  })

  const corrected = correctedWords.join(" ")
  const changed = corrected !== query.toLowerCase()

  return { corrected, changed }
}

/**
 * Encuentra la mejor corrección para una palabra
 */
export function findBestCorrection(
  word: string,
  dictionary: string[],
  threshold: number = 0.7,
): { suggestion: string; confidence: number } | null {
  let bestMatch = ""
  let bestScore = 0

  for (const dictWord of dictionary) {
    const score = similarity(word.toLowerCase(), dictWord.toLowerCase())
    if (score > bestScore && score >= threshold) {
      bestScore = score
      bestMatch = dictWord
    }
  }

  if (bestMatch) {
    return { suggestion: bestMatch, confidence: bestScore }
  }

  return null
}

/**
 * Expande una consulta con correcciones automáticas
 */
export function expandQueryWithCorrections(query: string): string[] {
  const queries = [query]

  // 1. Auto-corrección de errores comunes
  const { corrected, changed } = autoCorrect(query)
  if (changed) {
    queries.push(corrected)
  }

  // 2. Variaciones sin tildes
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  if (normalized !== query) {
    queries.push(normalized)
  }

  // 3. Sin puntuación
  const noPunctuation = query.replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ").trim()
  if (noPunctuation !== query) {
    queries.push(noPunctuation)
  }

  return [...new Set(queries)] // Remover duplicados
}

/**
 * Detecta si una consulta probablemente contiene errores
 */
export function detectPotentialErrors(query: string): {
  hasErrors: boolean;
  confidence: number;
  suggestions: Array<{ word: string; correction: string }>;
} {
  const words = query.toLowerCase().split(/\s+/)
  const suggestions: Array<{ word: string; correction: string }> = []
  let errorCount = 0

  for (const word of words) {
    const clean = word.replace(/[¿?¡!.,;:]/g, "")
    if (clean.length < 3) continue // Ignorar palabras muy cortas

    if (commonTypos[clean]) {
      suggestions.push({ word, correction: commonTypos[clean] })
      errorCount++
    }
  }

  const confidence = errorCount / Math.max(words.length, 1)

  return {
    hasErrors: errorCount > 0,
    confidence,
    suggestions,
  }
}

/**
 * Genera sugerencias "¿Quisiste decir...?"
 */
export function generateDidYouMean(
  originalQuery: string,
  allQueries: string[],
  threshold: number = 0.7,
): string[] {
  const suggestions = new Set<string>()

  // 1. Auto-corrección
  const { corrected, changed } = autoCorrect(originalQuery)
  if (changed) {
    suggestions.add(corrected)
  }

  // 2. Buscar queries similares en el corpus
  const normalized = originalQuery.toLowerCase()
  for (const query of allQueries) {
    const score = similarity(normalized, query.toLowerCase())
    if (score >= threshold && score < 1.0) {
      suggestions.add(query)
      if (suggestions.size >= 3) break // Máximo 3 sugerencias
    }
  }

  return Array.from(suggestions)
}

/**
 * Similitud por n-gramas (para nombres propios y términos técnicos)
 */
export function ngramSimilarity(s1: string, s2: string, n: number = 2): number {
  const getNgrams = (str: string, size: number): Set<string> => {
    const ngrams = new Set<string>()
    for (let i = 0; i <= str.length - size; i++) {
      ngrams.add(str.slice(i, i + size))
    }
    return ngrams
  }

  const ngrams1 = getNgrams(s1.toLowerCase(), n)
  const ngrams2 = getNgrams(s2.toLowerCase(), n)

  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)))
  const union = new Set([...ngrams1, ...ngrams2])

  return union.size === 0 ? 0 : intersection.size / union.size
}

/**
 * Matching robusto que combina múltiples estrategias
 *
 * ⭐ MEJORA: Ahora incluye matching por raíz común (stemming)
 */
export function robustMatch(
  query: string,
  target: string,
): { score: number; method: string } {
  const queryLower = query.toLowerCase()
  const targetLower = target.toLowerCase()

  // 1. Exacto
  if (queryLower === targetLower) {
    return { score: 1.0, method: "exact" }
  }

  // 2. Contiene
  if (targetLower.includes(queryLower)) {
    return { score: 0.95, method: "contains" }
  }

  // ⭐ 3. NUEVO: Misma raíz (stemming)
  // Verifica si las palabras comparten raíz común
  const queryWords = queryLower.split(/\s+/)
  const targetWords = targetLower.split(/\s+/)

  // Si es query de 1 palabra y target de 1 palabra, verificar raíz directa
  if (queryWords.length === 1 && targetWords.length === 1) {
    if (haveSameRoot(queryWords[0], targetWords[0])) {
      return { score: 0.93, method: "same_root" }
    }
  }

  // Para queries multi-palabra, contar cuántas raíces coinciden
  const queryRoots = new Set(queryWords.map(w => stem(w)))
  const targetRoots = new Set(targetWords.map(w => stem(w)))
  const commonRoots = new Set([...queryRoots].filter(r => targetRoots.has(r)))
  const rootOverlap = commonRoots.size / Math.max(queryRoots.size, targetRoots.size)

  if (rootOverlap >= 0.7) {
    return { score: rootOverlap * 0.88, method: "root_overlap" }
  }

  // 4. Levenshtein (ahora con bonus de stemming incluido)
  const levScore = similarity(queryLower, targetLower)
  if (levScore >= 0.8) {
    return { score: levScore * 0.9, method: "levenshtein" }
  }

  // 5. N-gramas
  const ngramScore = ngramSimilarity(query, target, 2)
  if (ngramScore >= 0.7) {
    return { score: ngramScore * 0.85, method: "ngram" }
  }

  // 6. Palabras en común (⭐ THRESHOLD ELEVADO: 0.5 → 0.7)
  const words1 = new Set(queryLower.split(/\s+/))
  const words2 = new Set(targetLower.split(/\s+/))
  const commonWords = new Set([...words1].filter(x => words2.has(x)))
  const wordScore = commonWords.size / Math.max(words1.size, words2.size)

  if (wordScore >= 0.7) {  // ⭐ CAMBIADO: era 0.5, ahora 0.7 (más estricto)
    return { score: wordScore * 0.7, method: "word_overlap" }
  }

  return { score: 0, method: "none" }
}
