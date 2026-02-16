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
  // ⭐ REMOVIDOS: Estos patrones bloqueaban preguntas legítimas con contexto
  // /^(que|qué)\s+(hago|puedo\s+hacer)/i,  ← Permitía "qué hago" con contexto
  // /^(como|cómo)\s+funciona$/i,           ← Permitía "cómo funciona" con contexto
  // /^(para|por)\s+qu[eé]\s+(sirve|es)/i,  ← Permitía "para qué sirve" con contexto
]

/** Patrones de quejas o feedback negativo del usuario */
const COMPLAINT_PATTERNS = [
  /no\s+te\s+(pregunte|pregunt[eé]|pedi|ped[ií])/i,
  /eso\s+no\s+(es|era|fue)/i,
  /no\s+(queria|quer[ií]a|necesito|necesitaba)\s+eso/i,
  /no\s+me\s+(est[aá]s\s+)?(entendiendo|respondiendo|respondes|ayudando|ayudas)/i,  // ⭐ Agregado "respondes", "ayudas"
  /no\s+(me\s+)?has\s+respondido/i,
  /no\s+(me\s+)?(respondes|responde)\s+(bien|correctamente|correcto)/i,  // ⭐ NUEVO: "no me respondes correctamente"
  /no\s+entiendes/i,
  /est[aá]s\s+(mal|equivocado|confundido)/i,
  /no\s+sirve/i,
  /est[aá]\s+respondiendo\s+(mal|cualquier\s+cosa)/i,
  /respuesta\s+(incorrecta|mala|equivocada)/i,
  /otra\s+vez\s+lo\s+mismo/i,
  /deja\s+de\s+(decir|responder)/i,
]

/**
 * 🔧 FIX 2: Patrones expandidos para preguntas sobre la sección actual
 * CAMBIO: Removidos anclajes ^ para permitir preguntas en medio de la frase
 * Agregados más variaciones y estructuras comunes
 * 🆕 FIX 3: Expandido con MUCHAS más variaciones naturales del lenguaje
 */
const SECTION_QUESTION_PATTERNS = [
  // Preguntas con "esta sección/parte/página" (SIN ancla ^)
  /(que|qué)\s+(hace|es|sirve|significa|muestra)\s+(esta|la)\s+(seccion|sección|parte|página|ventana|pantalla)/i,
  /para\s+qu[eé]\s+(es|sirve)\s+(esta|la)\s+(seccion|sección|parte|página|ventana|pantalla)/i,
  /(ayuda|explicame|explícame|dime|cuentame|muéstrame|informacion\s+de)\s+(esta|la)\s+(seccion|sección|parte|página)/i,

  // Variaciones con "aquí" y "acá"
  /(que|qué)\s+(hace|hago|puedo\s+hacer)\s+(aqu[ií]|ac[aá])/i,
  /para\s+qu[eé]\s+(es|sirve)\s+(aqu[ií]|ac[aá])/i,

  // 🆕 FIX: Preguntas con "esto" - EXPANDIDO con muchas más variaciones
  /(que|qué)\s+(hace|es|sirve|significa)\s+esto\s*[?¿]?\s*$/i,
  /para\s+qu[eé]\s+(es|sirve)\s+esto\s*[?¿]?\s*$/i,
  /(como|cómo)\s+(uso|usar|funciona|trabajo)\s+(con\s+)?esto\s*[?¿]?\s*$/i,
  /esto\s+para\s+qu[eé]\s+(es|sirve)/i,
  /(quiero|necesito)\s+(que\s+me\s+)?(digas|expliques|cuentes)\s+para\s+qu[eé]\s+sirve\s+esto/i,
  // 🆕 Nuevas variaciones con "esto"
  /(de\s+que|de\s+qué)\s+(se\s+encarga|trata)\s+esto/i,
  /no\s+(s[eé]|entiendo)\s+(como|cómo)\s+(funciona|sirve|se\s+usa)\s+esto/i,
  /(necesito|quiero)\s+(ayuda|saber|entender)\s+(sobre|con|de)\s+esto/i,

  // 🆕 FIX: Preguntas con "eso" (similar a "esto")
  /(que|qué)\s+(hace|es|sirve)\s+eso\s*[?¿]?\s*$/i,
  /para\s+qu[eé]\s+(es|sirve)\s+eso\s*[?¿]?\s*$/i,
  /(explicame|explícame|dime)\s+eso/i,
  /no\s+(s[eé]|entiendo)\s+eso/i,

  // 🆕 FIX: Peticiones de ayuda genéricas (contextuales)
  /^ayudame\s+(con\s+esto|aqu[ií]|por\s+favor)\s*[?¿]?\s*$/i,
  /^(necesito|quiero)\s+ayuda\s+(aqu[ií]|con\s+esto|por\s+favor)\s*[?¿]?\s*$/i,
  /(no\s+s[eé]|no\s+entiendo)\s+(como|cómo)\s+(funciona|se\s+usa|usar)\s+(esto|aqu[ií]|esta\s+parte)/i,

  // 🆕 FIX: Preguntas sobre "paso a paso"
  /^(paso\s+a\s+paso|pasos|el\s+paso\s+a\s+paso)\s*[?¿]?\s*$/i,
  /(como|cómo)\s+(es|funciona)\s+(el\s+)?paso\s+a\s+paso/i,
  /(quiero|necesito|dame|muéstrame)\s+(el\s+)?paso\s+a\s+paso/i,
  /(cuales|cuáles)\s+son\s+los\s+pasos/i,
  /(explicame|explícame|dime)\s+(los\s+)?pasos/i,

  // 🆕 FIX: Preguntas sobre botones y elementos de UI
  /(que|qué)\s+(hace|hacen)\s+(este|estos|ese|esos)\s+(boton|botones|botón|botones)/i,
  /para\s+qu[eé]\s+sirve\s+(este|ese)\s+(boton|botón)/i,
  /(especificacion|especificación|detalle)\s+(de|del)\s+(boton|botón|botones)/i,
  /(explicame|explícame)\s+(los\s+)?botones/i,

  // 🆕 FIX: Preguntas sobre detalles y especificaciones
  /(dame|dime|quiero)\s+(el\s+)?(detalle|detalles)/i,
  /(necesito|quiero)\s+(mas|más)\s+(detalle|detalles|informacion|información)/i,
  /(especificacion|especificación)\s+(de\s+esto|completa|detallada)/i,

  // FIX: Preguntas super genéricas (sin complemento)
  /^(que|qué)\s+(hace|es|sirve)\s*[?¿]?\s*$/i,
  /^para\s+qu[eé]\s+(es|sirve)\s*[?¿]?\s*$/i,
  /^(como|cómo)\s+(funciona|uso|usar)\s*[?¿]?\s*$/i,

  // FIX: Variaciones con "el dashboard", "el inventario", etc.
  /para\s+qu[eé]\s+sirve\s+(el|la|los|las)\s+(dashboard|inventario|catalogo|página|seccion|sección)/i,
  /(que|qué)\s+(hace|es)\s+(el|la|los|las)\s+(dashboard|inventario|catalogo|módulo|modulo)/i,

  // Ubicación y orientación
  /(donde|dónde)\s+estoy/i,
  /qu[eé]\s+(hago|puedo\s+hacer)\s+aqu[ií]/i,

  // FIX: Peticiones de explicación directa
  /(explicame|explícame|dime|cuentame|muéstrame|informacion|información)\s+(de\s+)?esta\s+(seccion|sección|página|parte)/i,
  /(necesito|quiero)\s+(informacion|información|ayuda|saber)\s+(de|sobre|con)\s+esta\s+(seccion|sección)/i,

  // FIX: "Como mejoramos tu inteligencia" tipo queries (piden más info de sección)
  /(como|cómo)\s+(mejoro|aprendo|uso|utilizo|trabajo)\s+(esto|aqu[ií]|esta\s+seccion|esta\s+sección)/i,

  // 🆕 FIX: Variaciones con "se encarga"
  /(de\s+que|de\s+qué)\s+se\s+encarga\s+(esto|esta\s+seccion|esta\s+sección|aqu[ií])/i,

  // 🆕 FIX: Preguntas sobre funcionalidad
  /(que|qué)\s+(funcionalidad|funciones)\s+(tiene|ofrece)\s+(esto|esta\s+seccion|esta\s+sección)/i,
  /(cuales|cuáles)\s+son\s+(las\s+)?(funciones|opciones|características)/i,

  // FIX: Menciones directas de sección (detectar por contexto)
  // Esto se maneja en la validación de contexto
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
 * 🔧 FIX: Ahora acepta pathname para generar respuestas específicas de sub-secciones
 */
export function validateQuery(query: string, section?: string, userId?: string, pathname?: string): QueryValidation {
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
  // 🔧 FIX: Pasar pathname para generar respuesta específica de sub-sección
  if (isSectionQuestion(normalized)) {
    const sectionName = section || "general"
    return {
      isValid: false, // No procesar como query normal
      reason: "section-question",
      suggestedResponse: generateSectionExplanation(sectionName, pathname)
    }
  }

  // 0.6. FIX: Detectar menciones directas de secciones (ej: "Contabilidad", "Inventario")
  const directSectionMatch = detectDirectSectionMention(normalized, section, pathname)
  if (directSectionMatch) {
    return {
      isValid: false,
      reason: "section-question",
      suggestedResponse: directSectionMatch
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
 * 🔧 FIX 5: Genera respuesta de "no sé" apropiada con sugerencias específicas por sección
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
    cashregister: "Caja",
    messages: "Mensajes",
    orders: "Pedidos",
    catalog: "Catálogo",
    brands: "Marcas",
    exchange: "Tipo de Cambio",
  }

  // 🔧 FIX 5: Sugerencias específicas por sección
  const sectionSuggestions: Record<string, string[]> = {
    inventory: [
      "¿Cómo veo el stock de un producto?",
      "¿Cómo actualizo precios?",
      "¿Cómo filtro por categoría?",
    ],
    products: [
      "¿Cómo creo un producto?",
      "¿Cómo subo imágenes?",
      "¿Cómo asigno una categoría?",
    ],
    sales: [
      "¿Cómo registro una venta?",
      "¿Cómo imprimo una factura?",
      "¿Cómo veo el historial de ventas?",
    ],
    entries: [
      "¿Cómo registro una entrada?",
      "¿Cómo subo una guía de remisión?",
      "¿Cómo selecciono un proveedor?",
    ],
    accounting: [
      "¿Cómo creo un asiento contable?",
      "¿Cómo veo el libro mayor?",
      "¿Cómo genero un balance?",
    ],
    quotes: [
      "¿Cómo creo una cotización?",
      "¿Cómo envío una cotización?",
      "¿Cómo convierto una cotización en venta?",
    ],
    categories: [
      "¿Cómo creo una categoría?",
      "¿Cómo asigno productos?",
      "¿Cómo organizo subcategorías?",
    ],
    providers: [
      "¿Cómo agrego un proveedor?",
      "¿Cómo edito un proveedor?",
      "¿Cómo veo el historial de compras?",
    ],
    users: [
      "¿Cómo creo un usuario?",
      "¿Cómo asigno permisos?",
      "¿Cómo cambio una contraseña?",
    ],
    stores: [
      "¿Cómo creo una tienda?",
      "¿Cómo asigno productos?",
      "¿Cómo hago transferencias?",
    ],
    cashregister: [
      "¿Cómo abro caja?",
      "¿Cómo hago un arqueo?",
      "¿Cómo registro un movimiento?",
    ],
    messages: [
      "¿Cómo veo los mensajes?",
      "¿Cómo respondo un mensaje?",
      "¿Cómo filtro por pendientes?",
    ],
    catalog: [
      "¿Cómo genero el catálogo?",
      "¿Cómo personalizo la portada?",
      "¿Cómo comparto el catálogo?",
    ],
  }

  const sectionName = sectionNames[section] || "esta sección"
  const suggestions = sectionSuggestions[section] || [
    "¿Cómo creo...?",
    "¿Dónde veo...?",
    "¿Cómo cambio...?",
  ]

  return `No encontré información específica sobre "${query}" en ${sectionName}.\n\n` +
    `💡 **Intenta preguntar:**\n` +
    suggestions.map(s => `• ${s}`).join('\n') +
    `\n\n_O intenta reformular tu pregunta de otra manera._`
}

/**
 * Genera explicación de la sección actual
 * 🔧 FIX: Expandido para manejar sub-rutas automáticamente
 */
export function generateSectionExplanation(section: string, pathname?: string): string {
  // 🔧 FIX: Detectar sub-rutas específicas primero
  if (pathname) {
    // ===== ACCOUNTING SUB-ROUTES =====
    if (pathname.includes('/accounting/dinero')) {
      return "📍 **Mi Dinero** (Cash Flow) muestra tu flujo de efectivo:\n• Ver ingresos y egresos del período\n• Consultar saldo disponible en tiempo real\n• Analizar entradas y salidas de dinero\n• Identificar tendencias de flujo de caja\n• Exportar reportes de cash flow\n\n**¿Para qué sirve?** Te ayuda a controlar tu liquidez y tomar decisiones financieras informadas.\n\n**¿Necesitas ayuda con algo específico?**"
    }
    if (pathname.includes('/accounting/salud')) {
      return "📍 **Salud del Negocio** (Health Score) evalúa la salud financiera:\n• Ver score de salud (EXCELENTE, BUENO, ATENCIÓN, CRÍTICO)\n• Analizar indicadores clave de rendimiento\n• Identificar áreas de mejora financiera\n• Monitorear tendencias de salud del negocio\n• Recibir alertas y recomendaciones\n\n**¿Para qué sirve?** Te da una visión rápida del estado financiero de tu negocio.\n\n**¿Necesitas ayuda con algo específico?**"
    }
    if (pathname.includes('/accounting/entries')) {
      return "📍 **Asientos Contables** (Accounting Entries) gestiona tus registros contables:\n• Ver lista de todos los asientos (borrador, registrados, anulados)\n• Crear nuevos asientos contables\n• Editar asientos en borrador\n• Anular o modificar asientos\n• Filtrar por fecha, estado o tipo\n\n**¿Para qué sirve?** Es el registro oficial de todas tus operaciones contables.\n\n**¿Necesitas ayuda con algo específico?**"
    }
    if (pathname.includes('/accounting/journals')) {
      return "📍 **Diarios Contables** (Journals) te permite organizar tus asientos contables por tipo de operación:\n• Crear diarios para diferentes tipos de movimientos (ventas, compras, bancos, etc.)\n• Ver todos tus diarios en una lista organizada\n• Consultar asientos registrados en cada diario\n• Gestionar asientos directamente desde cada diario\n\n**¿Por qué usar diarios?** Facilitan la organización y consulta de asientos, permitiendo separar las operaciones de ventas, compras, caja, bancos, etc.\n\n**¿Necesitas ayuda con algo específico?**"
    }
    if (pathname.includes('/accounting/chart')) {
      return "📍 **Plan de Cuentas** (Chart of Accounts) es la estructura base de tu contabilidad:\n• Ver todas las cuentas contables organizadas por tipo\n• Crear nuevas cuentas según tus necesidades\n• Editar y configurar cuentas existentes\n• Organizar por categorías (Activos, Pasivos, Ingresos, Gastos)\n\n**¿Necesitas ayuda con algo específico?**"
    }
    if (pathname.includes('/accounting/reports/trial-balance')) {
      return "📍 **Balance de Comprobación** (Trial Balance) muestra el resumen de saldos:\n• Ver saldos de todas las cuentas\n• Verificar que Debe = Haber\n• Filtrar por período\n• Exportar a Excel/PDF\n\n**¿Necesitas ayuda con algo específico?**"
    }
    if (pathname.includes('/accounting/reports/ledger')) {
      return "📍 **Libro Mayor** (General Ledger) muestra el detalle de movimientos por cuenta:\n• Ver todos los movimientos de cada cuenta\n• Consultar saldos acumulados\n• Filtrar por cuenta y período\n• Exportar libro mayor\n\n**¿Necesitas ayuda con algo específico?**"
    }
    if (pathname.includes('/accounting/sunat')) {
      return "📍 **SUNAT** - Reportes y exportaciones para la SUNAT:\n• Generar libros electrónicos (PLE)\n• Exportar registro de ventas y compras\n• Consultar RUC y validar comprobantes\n• Preparar declaraciones mensuales\n\n**¿Necesitas ayuda con algo específico?**"
    }

    // ===== SALES SUB-ROUTES =====
    if (pathname.includes('/sales/new')) {
      return "📍 **Nueva Venta** te permite registrar ventas:\n• Seleccionar productos del inventario\n• Aplicar descuentos\n• Elegir método de pago\n• Generar comprobante (factura/boleta)\n\n**¿Necesitas ayuda con algo específico?**"
    }

    // ===== PRODUCTS SUB-ROUTES =====
    if (pathname.includes('/products/new')) {
      return "📍 **Nuevo Producto** te permite agregar productos al catálogo:\n• Ingresar nombre y descripción\n• Subir imágenes\n• Configurar precios y stock\n• Asignar categorías y marcas\n\n**¿Necesitas ayuda con algo específico?**"
    }

    // ===== ENTRIES SUB-ROUTES =====
    if (pathname.includes('/entries/new')) {
      return "📍 **Nuevo Ingreso** te permite registrar entradas de mercadería:\n• Seleccionar proveedor\n• Agregar productos y cantidades\n• Subir guía de remisión (PDF)\n• Actualizar inventario automáticamente\n\n**¿Necesitas ayuda con algo específico?**"
    }
  }

  // Secciones principales (sin cambios)
  const sectionDescriptions: Record<string, string> = {
    inventory: "**Inventario** te permite gestionar el stock de tus productos:\n• Ver stock actual de cada producto\n• Actualizar precios y cantidades\n• Identificar productos con stock bajo\n• Ver historial de movimientos",

    products: "**Productos** es donde gestionas tu catálogo:\n• Crear y editar productos\n• Agregar imágenes y descripciones\n• Configurar precios y variantes\n• Organizar por categorías y marcas",

    sales: "**Ventas** te permite registrar y gestionar las ventas:\n• Registrar nuevas ventas\n• Imprimir facturas y boletas\n• Ver historial de ventas\n• Anular o modificar ventas",

    entries: "**Ingresos** es donde registras la mercadería que ingresa:\n• Registrar nuevos ingresos de productos\n• Subir guías de remisión\n• Ver ingresos pendientes y completados\n• Asociar ingresos con proveedores",

    accounting: "**Contabilidad** gestiona la contabilidad completa de tu negocio:\n• Crear y gestionar asientos contables\n• Libro diario, libro mayor y balance de comprobación\n• Estados financieros (Balance General, Estado de Resultados)\n• Gestionar plan de cuentas contable\n• Conciliación bancaria\n• Centros de costo y presupuestos\n• Reportes contables para SUNAT/SAT/AFIP\n• Depreciación de activos fijos\n• Cierre contable mensual y anual",

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
 * FIX: Detecta menciones directas de nombres de secciones
 * Ej: "Contabilidad", "Inventario", "Ventas", etc.
 * 🔧 FIX: Ahora acepta pathname para generar respuestas específicas de sub-secciones
 */
export function detectDirectSectionMention(query: string, currentSection?: string, pathname?: string): string | null {
  const sectionKeywords: Record<string, string[]> = {
    accounting: ["contabilidad", "contable", "asientos"],
    inventory: ["inventario", "stock", "existencias"],
    products: ["productos", "producto", "artículos", "artículo"],
    sales: ["ventas", "venta", "vender"],
    entries: ["ingresos", "ingreso", "entradas", "entrada", "compras", "compra"],
    quotes: ["cotizaciones", "cotización", "cotizar", "presupuesto"],
    catalog: ["catálogo", "catalogo"],
    clients: ["clientes", "cliente"],
    providers: ["proveedores", "proveedor"],
    cashregister: ["caja registradora", "caja", "arqueo"],
    users: ["usuarios", "usuario", "permisos"],
    settings: ["configuración", "configuracion", "ajustes"],
    stores: ["tiendas", "tienda", "sucursales", "sucursal"],
    brands: ["marcas", "marca"],
    categories: ["categorías", "categoria", "categorias"],
    exchange: ["cambio de divisas", "tipo de cambio", "monedas"],
    reports: ["reportes", "reporte", "informes", "estadísticas"],
  }

  const normalized = query.toLowerCase().trim()

  // Detectar si la query menciona SOLO el nombre de una sección (muy común)
  for (const [sectionId, keywords] of Object.entries(sectionKeywords)) {
    for (const keyword of keywords) {
      // Match exacto o con signos de interrogación
      if (
        normalized === keyword ||
        normalized === `${keyword}?` ||
        normalized === `${keyword}¿` ||
        normalized === `¿${keyword}?` ||
        normalized === `${keyword} ?`
      ) {
        // Si coincide con la sección actual, explicar esa sección
        // 🔧 FIX: Pasar pathname para obtener respuesta específica de sub-sección
        if (currentSection === sectionId) {
          return generateSectionExplanation(sectionId, pathname)
        }
        // Si menciona otra sección, sugerir navegar
        return `Veo que preguntas sobre **${keywords[0]}**. ` +
          `Actualmente estás en otra sección.\n\n` +
          `¿Necesitas ayuda para encontrar la sección de ${keywords[0]}?`
      }
    }
  }

  return null
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
