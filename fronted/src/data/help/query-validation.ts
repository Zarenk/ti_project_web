/**
 * CRITICAL FIX: Query Validation and Filtering
 *
 * Detecta preguntas genéricas, quejas del usuario, y valida
 * que las respuestas sean relevantes antes de mostrarlas.
 */

export interface QueryValidation {
  isValid: boolean
  reason?: "generic" | "complaint" | "off-topic" | "too-short" | "gibberish" | "section-question"
  suggestedResponse?: string
}

export interface RejectedQuery {
  query: string
  reason: string
  timestamp: number
  section?: string
}

export interface NoMatchQuery {
  query: string
  section?: string
  timestamp: number
  topScore?: number
  topMatchId?: string
}

/** Patrones de preguntas genéricas que requieren clarificación */
const GENERIC_PATTERNS = [
  /^(que|qué)\s+(mas|más|otra|otro)\s+/i,
  /^(dame|dime|muestrame|cuentame|explicame)\s+(mas|más|algo|info|información)/i,
  /^(hay|tiene|tienes)\s+(mas|más|algo|otra)/i,
  /^(otra|otro)\s+(cosa|opcion|opción)/i,
  /^ayuda$/i,
  /^(que|qué)\s+(hago|puedo\s+hacer)/i,
  /^(como|cómo)\s+funciona$/i,
  /^(para|por)\s+qu[eé]\s+(sirve|es)/i,
]

/** Patrones de quejas o feedback negativo del usuario */
const COMPLAINT_PATTERNS = [
  /no\s+te\s+(pregunte|pregunt[eé]|pedi|ped[ií])/i,
  /eso\s+no\s+(es|era|fue)/i,
  /no\s+(queria|quer[ií]a|necesito|necesitaba)\s+eso/i,
  /no\s+me\s+(est[aá]s\s+)?(entendiendo|respondiendo|ayudando)/i,
  /no\s+(me\s+)?has\s+respondido/i, // FIX: "NO ME HAS RESPONDIDO"
  /no\s+entiendes/i,
  /est[aá]s\s+(mal|equivocado|confundido)/i,
  /no\s+sirve/i,
  /est[aá]\s+respondiendo\s+(mal|cualquier\s+cosa)/i,
  /respuesta\s+(incorrecta|mala|equivocada)/i,
  /otra\s+vez\s+lo\s+mismo/i,
  /deja\s+de\s+(decir|responder)/i,
]

/** Patrones que preguntan sobre la sección actual */
const SECTION_QUESTION_PATTERNS = [
  /^(que|qué)\s+(hace|es|sirve|significa)\s+(esta|la)\s+(seccion|sección|parte|página)/i,
  /^para\s+qu[eé]\s+(es|sirve)\s+(esta|la)\s+(seccion|sección|parte)/i,
  /^(donde|dónde)\s+estoy/i,
  /^qu[eé]\s+(hago|puedo\s+hacer)\s+aqu[ií]/i,
  /^(ayuda|explicame|explícame)\s+(esta|la)\s+(seccion|sección|parte)/i,
]

/** Patrones de preguntas muy cortas que necesitan más contexto */
const TOO_SHORT_THRESHOLD = 5 // caracteres

/** Palabras stop que no aportan contexto */
const STOP_WORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "del", "al", "a", "en", "por", "para", "con", "sin",
  "que", "qué", "como", "cómo", "donde", "dónde",
])

/**
 * Valida si una query es válida y debe ser procesada
 * Log rejected queries for analytics
 */
export function validateQuery(query: string, section?: string, userId?: string): QueryValidation {
  const trimmed = query.trim()
  const normalized = trimmed.toLowerCase()

  // 0. Check rate limit (prevent spam/abuse)
  const rateLimitCheck = checkRateLimit(userId)
  if (!rateLimitCheck.allowed) {
    return {
      isValid: false,
      reason: "off-topic",
      suggestedResponse: `Has alcanzado el límite de ${rateLimitCheck.limit} preguntas por minuto. Por favor, espera ${rateLimitCheck.resetIn} segundos antes de hacer otra pregunta.`
    }
  }

  // 0.5. Detectar preguntas sobre la sección actual (FIX: "que hace esta seccion")
  if (isSectionQuestion(normalized)) {
    const sectionName = section || "general"
    return {
      isValid: false, // No procesar como query normal
      reason: "section-question",
      suggestedResponse: generateSectionExplanation(sectionName)
    }
  }

  // 1. Detectar quejas del usuario
  if (COMPLAINT_PATTERNS.some(pattern => pattern.test(normalized))) {
    logRejectedQuery(query, "complaint", section)
    return {
      isValid: false,
      reason: "complaint",
      suggestedResponse: "Disculpa, parece que no entendí bien tu pregunta anterior. ¿Podrías reformularla de manera más específica? Por ejemplo: '¿Cómo creo un producto?' o '¿Cómo registro una venta?'"
    }
  }

  // 2. Detectar preguntas genéricas
  if (GENERIC_PATTERNS.some(pattern => pattern.test(normalized))) {
    logRejectedQuery(query, "generic", section)
    return {
      isValid: false,
      reason: "generic",
      suggestedResponse: "Puedo ayudarte con muchas cosas del sistema. ¿Sobre qué área específica necesitas ayuda?\n\n" +
        "Por ejemplo:\n" +
        "• **Ventas**: '¿Cómo registro una venta?'\n" +
        "• **Productos**: '¿Cómo creo un producto?'\n" +
        "• **Inventario**: '¿Cómo veo mi stock?'\n" +
        "• **Contabilidad**: '¿Cómo creo un asiento contable?'\n" +
        "• **Reportes**: '¿Cómo veo mis ventas del mes?'"
    }
  }

  // 3. Detectar queries muy cortas sin contexto
  const words = normalized.split(/\s+/).filter(w => !STOP_WORDS.has(w))
  if (words.length === 0 || trimmed.length < TOO_SHORT_THRESHOLD) {
    logRejectedQuery(query, "too-short", section)
    return {
      isValid: false,
      reason: "too-short",
      suggestedResponse: "Tu pregunta es muy breve. ¿Podrías dar más detalles? Por ejemplo: '¿Cómo hago una venta?' o '¿Dónde veo mi inventario?'"
    }
  }

  // 4. Detectar gibberish (más de 40% de caracteres no alfabéticos)
  const alphaCount = (trimmed.match(/[a-záéíóúñü]/gi) || []).length
  const alphaRatio = alphaCount / trimmed.length
  if (alphaRatio < 0.6) {
    logRejectedQuery(query, "gibberish", section)
    return {
      isValid: false,
      reason: "gibberish",
      suggestedResponse: "No entendí tu pregunta. Por favor, escríbela de nuevo de forma clara."
    }
  }

  return { isValid: true }
}

/**
 * Valida si una respuesta es relevante para la query
 */
export function validateResponse(
  query: string,
  answer: string,
  score: number,
  matchType: string
): {
  isRelevant: boolean
  confidence: number
  reason?: string
} {
  const MIN_CONFIDENCE_THRESHOLD = 0.65 // Aumentado de 0.3

  // 1. Score muy bajo = no relevante
  if (score < MIN_CONFIDENCE_THRESHOLD) {
    return {
      isRelevant: false,
      confidence: score,
      reason: "low-score"
    }
  }

  // 2. Para matches fuzzy o keyword, requerir score más alto
  if ((matchType === "fuzzy" || matchType === "keyword") && score < 0.75) {
    return {
      isRelevant: false,
      confidence: score,
      reason: "fuzzy-low-score"
    }
  }

  // 3. Validar que palabras clave de la query aparezcan en la respuesta
  const queryKeywords = extractKeywords(query)
  const answerKeywords = extractKeywords(answer)

  const matchingKeywords = queryKeywords.filter(kw =>
    answerKeywords.some(awk => awk.includes(kw) || kw.includes(awk))
  )

  const keywordMatchRatio = queryKeywords.length > 0
    ? matchingKeywords.length / queryKeywords.length
    : 0

  // Al menos 30% de las keywords deben aparecer
  if (keywordMatchRatio < 0.3 && score < 0.85) {
    return {
      isRelevant: false,
      confidence: score * keywordMatchRatio,
      reason: "keyword-mismatch"
    }
  }

  return {
    isRelevant: true,
    confidence: score
  }
}

/**
 * Extrae keywords importantes de un texto
 */
function extractKeywords(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")

  const words = normalized.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w))

  // Deduplicate
  return Array.from(new Set(words))
}

/**
 * Genera respuesta de "no sé" apropiada
 */
export function generateNoMatchResponse(query: string, section: string): string {
  const sectionNames: Record<string, string> = {
    inventory: "Inventario",
    products: "Productos",
    sales: "Ventas",
    entries: "Ingresos",
    accounting: "Contabilidad",
    quotes: "Cotizaciones",
    categories: "Categorías",
    providers: "Proveedores",
    users: "Usuarios",
    stores: "Tiendas",
  }

  const sectionName = sectionNames[section] || "esta sección"

  return `No encontré información específica sobre "${query}" en ${sectionName}.\n\n` +
    `Intenta reformular tu pregunta de forma más específica, por ejemplo:\n` +
    `• "¿Cómo creo...?"\n` +
    `• "¿Dónde veo...?"\n` +
    `• "¿Cómo cambio...?"\n\n` +
    `O puedes navegar por las preguntas frecuentes de la sección.`
}

/**
 * Genera explicación de la sección actual
 */
export function generateSectionExplanation(section: string): string {
  const sectionDescriptions: Record<string, string> = {
    inventory: "**Inventario** te permite gestionar el stock de tus productos:\n• Ver stock actual de cada producto\n• Actualizar precios y cantidades\n• Identificar productos con stock bajo\n• Ver historial de movimientos",

    products: "**Productos** es donde gestionas tu catálogo:\n• Crear y editar productos\n• Agregar imágenes y descripciones\n• Configurar precios y variantes\n• Organizar por categorías y marcas",

    sales: "**Ventas** te permite registrar y gestionar las ventas:\n• Registrar nuevas ventas\n• Imprimir facturas y boletas\n• Ver historial de ventas\n• Anular o modificar ventas",

    entries: "**Ingresos** es donde registras la mercadería que ingresa:\n• Registrar nuevos ingresos de productos\n• Subir guías de remisión\n• Ver ingresos pendientes y completados\n• Asociar ingresos con proveedores",

    accounting: "**Contabilidad** gestiona tus registros contables:\n• Crear asientos contables\n• Ver libro diario y mayor\n• Generar balances\n• Gestionar plan de cuentas",

    quotes: "**Cotizaciones** te permite crear cotizaciones para clientes:\n• Crear nuevas cotizaciones\n• Convertir cotizaciones en ventas\n• Enviar cotizaciones por WhatsApp o email\n• Ver historial de cotizaciones",

    catalog: "**Catálogo** muestra tus productos en formato visual:\n• Exportar catálogo a PDF\n• Personalizar portada\n• Compartir catálogo con clientes\n• Vista previa antes de exportar",

    clients: "**Clientes** gestiona tu base de datos de clientes:\n• Registrar nuevos clientes\n• Ver historial de compras\n• Importar clientes desde Excel\n• Gestionar información de contacto",

    providers: "**Proveedores** gestiona tus proveedores:\n• Registrar nuevos proveedores\n• Ver historial de compras\n• Gestionar información de contacto\n• Asociar productos a proveedores",

    cashregister: "**Caja Registradora** controla el flujo de efectivo:\n• Abrir caja al inicio del día\n• Registrar ingresos y egresos\n• Hacer cierre de caja\n• Ver historial de movimientos",

    users: "**Usuarios** gestiona los usuarios del sistema:\n• Crear nuevos usuarios\n• Asignar roles y permisos\n• Activar/desactivar usuarios\n• Ver historial de actividad",

    settings: "**Configuración** permite personalizar el sistema:\n• Configurar datos de la empresa\n• Cambiar logo y colores\n• Activar módulos y funcionalidades\n• Gestionar facturación electrónica",

    stores: "**Tiendas** gestiona tus puntos de venta:\n• Crear nuevas tiendas\n• Asignar productos a tiendas\n• Ver stock por tienda\n• Gestionar transferencias entre tiendas",

    brands: "**Marcas** organiza tus productos por marca:\n• Crear nuevas marcas\n• Asignar productos a marcas\n• Filtrar productos por marca",

    categories: "**Categorías** organiza tus productos:\n• Crear nuevas categorías\n• Asignar productos a categorías\n• Crear jerarquías de categorías",

    exchange: "**Cambio de Divisas** gestiona tipos de cambio:\n• Registrar nuevos tipos de cambio\n• Ver historial de cambios\n• Usar en ventas multidivisa",

    reports: "**Reportes** muestra estadísticas y análisis:\n• Ver reportes de ventas\n• Analizar inventario\n• Exportar reportes a Excel\n• Gráficos y dashboards",

    'public-store': "**Tienda en Línea** es el catálogo público para clientes:\n• Buscar y filtrar productos\n• Ver detalles y especificaciones\n• Agregar productos al carrito\n• Realizar compras en línea\n• Seguimiento de pedidos",
  }

  const description = sectionDescriptions[section]

  if (!description) {
    return `Estás en la sección de **${section}**. ¿En qué puedo ayudarte específicamente?`
  }

  return `📍 ${description}\n\n**¿Necesitas ayuda con algo específico de esta sección?**`
}

/**
 * Detecta si la query es sobre la sección actual
 */
export function isSectionQuestion(query: string): boolean {
  return SECTION_QUESTION_PATTERNS.some(pattern => pattern.test(query))
}

/**
 * Detecta si la query es sobre el chatbot mismo (meta-questions)
 */
export function isMetaQuestion(query: string): boolean {
  const normalized = query.toLowerCase()

  const metaPatterns = [
    /quien\s+(eres|sois)/i,
    /que\s+(eres|haces|puedes\s+hacer)/i,
    /como\s+(funcionas|trabajas)/i,
    /eres\s+(un\s+)?(bot|robot|ia|inteligencia)/i,
  ]

  return metaPatterns.some(pattern => pattern.test(normalized))
}

/**
 * Genera respuesta para meta-questions
 */
export function generateMetaResponse(): string {
  return "Soy el asistente virtual de ADSLab. Estoy diseñado para ayudarte a usar la plataforma de gestión empresarial. " +
    "Puedo resolver dudas sobre inventario, ventas, productos, contabilidad y todas las funcionalidades del sistema.\n\n" +
    "**¿En qué puedo ayudarte hoy?** Pregúntame algo específico como:\n" +
    "• '¿Cómo registro una venta?'\n" +
    "• '¿Cómo agrego productos?'\n" +
    "• '¿Dónde veo mi inventario?'"
}

/**
 * LOGGING & ANALYTICS
 * Track rejected queries and no-matches for system improvement
 */

const REJECTED_QUERIES_KEY = "adslab_rejected_queries"
const NO_MATCH_QUERIES_KEY = "adslab_no_match_queries"
const MAX_LOG_ENTRIES = 100 // Mantener solo últimas 100

/**
 * RATE LIMITING
 * Prevent spam and abuse
 */

const QUERY_RATE_LIMIT = 10 // Queries por minuto
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minuto en ms
const userQueryTimestamps = new Map<string, number[]>()

/**
 * Check if user has exceeded rate limit
 * Returns true if within limit, false if exceeded
 */
export function checkRateLimit(userId: string = "anonymous"): {
  allowed: boolean
  queriesInWindow: number
  limit: number
  resetIn: number // seconds until reset
} {
  const now = Date.now()

  // Get user's query timestamps
  let timestamps = userQueryTimestamps.get(userId) || []

  // Filter to keep only timestamps within current window
  timestamps = timestamps.filter(time => now - time < RATE_LIMIT_WINDOW)

  // Check if limit exceeded
  const allowed = timestamps.length < QUERY_RATE_LIMIT

  if (allowed) {
    // Add current timestamp
    timestamps.push(now)
    userQueryTimestamps.set(userId, timestamps)
  }

  // Calculate when the oldest query will expire
  const oldestQuery = timestamps[0] || now
  const resetIn = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestQuery)) / 1000)

  return {
    allowed,
    queriesInWindow: timestamps.length,
    limit: QUERY_RATE_LIMIT,
    resetIn: Math.max(0, resetIn)
  }
}

/**
 * Reset rate limit for a user (admin only)
 */
export function resetRateLimit(userId: string = "anonymous"): void {
  userQueryTimestamps.delete(userId)
}

/**
 * Get rate limit status for current user
 */
export function getRateLimitStatus(userId: string = "anonymous"): {
  queriesRemaining: number
  resetIn: number
} {
  const now = Date.now()
  const timestamps = (userQueryTimestamps.get(userId) || [])
    .filter(time => now - time < RATE_LIMIT_WINDOW)

  const oldestQuery = timestamps[0] || now
  const resetIn = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestQuery)) / 1000)

  return {
    queriesRemaining: Math.max(0, QUERY_RATE_LIMIT - timestamps.length),
    resetIn: Math.max(0, resetIn)
  }
}

/**
 * Log query rechazada para análisis
 */
export function logRejectedQuery(query: string, reason: string, section?: string): void {
  if (typeof window === "undefined") return

  try {
    const existing = JSON.parse(localStorage.getItem(REJECTED_QUERIES_KEY) || "[]") as RejectedQuery[]

    const entry: RejectedQuery = {
      query,
      reason,
      section,
      timestamp: Date.now()
    }

    existing.push(entry)

    // Mantener solo últimas MAX_LOG_ENTRIES
    const trimmed = existing.slice(-MAX_LOG_ENTRIES)

    localStorage.setItem(REJECTED_QUERIES_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.warn("Failed to log rejected query:", error)
  }
}

/**
 * Log query sin match (para mejorar KB)
 */
export function logNoMatchQuery(
  query: string,
  section?: string,
  topScore?: number,
  topMatchId?: string
): void {
  if (typeof window === "undefined") return

  try {
    const existing = JSON.parse(localStorage.getItem(NO_MATCH_QUERIES_KEY) || "[]") as NoMatchQuery[]

    const entry: NoMatchQuery = {
      query,
      section,
      timestamp: Date.now(),
      topScore,
      topMatchId
    }

    existing.push(entry)

    // Mantener solo últimas MAX_LOG_ENTRIES
    const trimmed = existing.slice(-MAX_LOG_ENTRIES)

    localStorage.setItem(NO_MATCH_QUERIES_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.warn("Failed to log no-match query:", error)
  }
}

/**
 * Obtener queries rechazadas (para admin panel)
 */
export function getRejectedQueries(limit = 50): RejectedQuery[] {
  if (typeof window === "undefined") return []

  try {
    const data = localStorage.getItem(REJECTED_QUERIES_KEY)
    if (!data) return []

    const queries = JSON.parse(data) as RejectedQuery[]
    return queries.slice(-limit).reverse() // Más recientes primero
  } catch (error) {
    console.warn("Failed to get rejected queries:", error)
    return []
  }
}

/**
 * Obtener queries sin match (para admin panel)
 */
export function getNoMatchQueries(limit = 50): NoMatchQuery[] {
  if (typeof window === "undefined") return []

  try {
    const data = localStorage.getItem(NO_MATCH_QUERIES_KEY)
    if (!data) return []

    const queries = JSON.parse(data) as NoMatchQuery[]
    return queries.slice(-limit).reverse() // Más recientes primero
  } catch (error) {
    console.warn("Failed to get no-match queries:", error)
    return []
  }
}

/**
 * Limpiar logs (para admin)
 */
export function clearQueryLogs(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(REJECTED_QUERIES_KEY)
    localStorage.removeItem(NO_MATCH_QUERIES_KEY)
  } catch (error) {
    console.warn("Failed to clear query logs:", error)
  }
}

/**
 * Obtener estadísticas de queries rechazadas
 */
export function getRejectedQueryStats(): {
  total: number
  byReason: Record<string, number>
  bySection: Record<string, number>
  last24h: number
  last7d: number
} {
  const queries = getRejectedQueries(1000)
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const week = 7 * day

  const stats = {
    total: queries.length,
    byReason: {} as Record<string, number>,
    bySection: {} as Record<string, number>,
    last24h: 0,
    last7d: 0
  }

  queries.forEach(q => {
    // Count by reason
    stats.byReason[q.reason] = (stats.byReason[q.reason] || 0) + 1

    // Count by section
    if (q.section) {
      stats.bySection[q.section] = (stats.bySection[q.section] || 0) + 1
    }

    // Time-based counts
    const age = now - q.timestamp
    if (age <= day) stats.last24h++
    if (age <= week) stats.last7d++
  })

  return stats
}
