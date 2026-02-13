/**
 * CRITICAL FIX: Query Validation and Filtering
 *
 * Detecta preguntas genéricas, quejas del usuario, y valida
 * que las respuestas sean relevantes antes de mostrarlas.
 */

export interface QueryValidation {
  isValid: boolean
  reason?: "generic" | "complaint" | "off-topic" | "too-short" | "gibberish"
  suggestedResponse?: string
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
  /no\s+me\s+est[aá]s\s+entendiendo/i,
  /no\s+entiendes/i,
  /est[aá]s\s+(mal|equivocado|confundido)/i,
  /no\s+sirve/i,
  /est[aá]\s+respondiendo\s+(mal|cualquier\s+cosa)/i,
  /respuesta\s+(incorrecta|mala|equivocada)/i,
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
 */
export function validateQuery(query: string): QueryValidation {
  const trimmed = query.trim()
  const normalized = trimmed.toLowerCase()

  // 1. Detectar quejas del usuario
  if (COMPLAINT_PATTERNS.some(pattern => pattern.test(normalized))) {
    return {
      isValid: false,
      reason: "complaint",
      suggestedResponse: "Disculpa, parece que no entendí bien tu pregunta anterior. ¿Podrías reformularla de manera más específica? Por ejemplo: '¿Cómo creo un producto?' o '¿Cómo registro una venta?'"
    }
  }

  // 2. Detectar preguntas genéricas
  if (GENERIC_PATTERNS.some(pattern => pattern.test(normalized))) {
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
