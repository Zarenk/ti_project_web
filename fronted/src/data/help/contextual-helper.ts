/**
 * Sistema de Ayuda Contextual
 * Detecta situaciones específicas y proporciona respuestas adaptadas al contexto
 */

import type { HelpEntry } from "./types"
import type { RouteContext } from "./route-detection"
import {
  realWorldScenarios,
  problemPatterns,
  situationalContexts,
  businessSynonyms,
  type ScenarioPattern,
} from "./real-world-scenarios"

export interface ContextualMatch {
  entry: HelpEntry
  scenario?: ScenarioPattern
  userType?: string
  urgency?: "low" | "medium" | "high" | "critical"
  confidence: number
  suggestions?: string[]
  quickActions?: Array<{ text: string; action: string }>
}

/**
 * Detecta la urgencia de la consulta
 */
export function detectUrgency(query: string): "low" | "medium" | "high" | "critical" {
  const urgent = query.toLowerCase()

  // Crítico - Cliente esperando
  if (
    urgent.includes("urgente") ||
    urgent.includes("ya") ||
    urgent.includes("ahora") ||
    urgent.includes("cliente esperando") ||
    urgent.includes("hay cola")
  ) {
    return "critical"
  }

  // Alto - Problema bloqueante
  if (
    urgent.includes("no puedo") ||
    urgent.includes("no funciona") ||
    urgent.includes("error") ||
    urgent.includes("bloqueado")
  ) {
    return "high"
  }

  // Medio - Necesita hacer algo pronto
  if (
    urgent.includes("necesito") ||
    urgent.includes("tengo que") ||
    urgent.includes("debo") ||
    urgent.includes("rapido")
  ) {
    return "medium"
  }

  return "low"
}

/**
 * Detecta el tipo de usuario basado en la consulta
 */
export function detectUserType(
  query: string
): "owner" | "seller" | "accountant" | "warehouse" | "beginner" | "unknown" {
  const q = query.toLowerCase()

  // Dueño - Enfocado en números y reportes
  if (
    q.match(/cuanto\s+(vendi|vendí|tengo|dinero)/) ||
    q.includes("reporte") ||
    q.includes("balance") ||
    q.includes("ganancias")
  ) {
    return "owner"
  }

  // Vendedor - Enfocado en velocidad y acción
  if (
    q.includes("cliente esperando") ||
    q.includes("venta rapida") ||
    q.includes("descuento") ||
    q.includes("stock") ||
    q.includes("precio")
  ) {
    return "seller"
  }

  // Contador - Términos contables
  if (
    q.includes("asiento") ||
    q.includes("libro diario") ||
    q.includes("mayor") ||
    q.includes("balance") ||
    q.includes("conciliar") ||
    q.includes("igv") ||
    q.includes("sunat")
  ) {
    return "accountant"
  }

  // Almacén - Tareas físicas
  if (
    q.includes("llego") ||
    q.includes("llegó") ||
    q.includes("mercaderia") ||
    q.includes("mercadería") ||
    q.includes("contar") ||
    q.includes("inventario fisico") ||
    q.includes("transferir")
  ) {
    return "warehouse"
  }

  // Principiante - Patrones de confusión
  if (
    q.includes("no encuentro") ||
    q.includes("no se") ||
    q.includes("no sé") ||
    q.includes("como empiezo") ||
    q.includes("primera vez") ||
    q.includes("donde esta") ||
    q.includes("dónde está")
  ) {
    return "beginner"
  }

  return "unknown"
}

/**
 * Detecta patrones de problemas
 */
export function detectProblemPattern(query: string): {
  hasProblem: boolean
  problemType?: string
  extracted?: string
} {
  for (const { pattern, intent, examples } of problemPatterns) {
    const match = query.match(pattern)
    if (match) {
      return {
        hasProblem: true,
        problemType: intent,
        extracted: match[2] || match[1],
      }
    }
  }

  return { hasProblem: false }
}

/**
 * Genera respuesta adaptada al contexto
 */
export function adaptResponseToContext(
  entry: HelpEntry,
  userType: string,
  urgency: string,
): {
  answer: string
  tone: "formal" | "friendly" | "concise" | "detailed"
  quickTips?: string[]
} {
  let answer = entry.answer
  let tone: "formal" | "friendly" | "concise" | "detailed" = "friendly"
  const quickTips: string[] = []

  // Adaptar según tipo de usuario
  switch (userType) {
    case "owner":
      tone = "concise"
      quickTips.push("💼 Puedes exportar esto a Excel para análisis detallado")
      break

    case "seller":
      tone = "concise"
      if (entry.steps && entry.steps.length > 0) {
        answer = `⚡ Modo rápido: ${entry.steps[0].text}\n\n${answer}`
        quickTips.push("⚡ Usa Ctrl+N para acceso rápido")
      }
      break

    case "accountant":
      tone = "formal"
      quickTips.push("📊 Este dato aparecerá en los libros contables")
      break

    case "warehouse":
      tone = "friendly"
      quickTips.push("📦 Recuerda revisar físicamente antes de confirmar")
      break

    case "beginner":
      tone = "detailed"
      answer = `🎯 Te voy a guiar paso a paso:\n\n${answer}`
      quickTips.push("💡 Si te pierdes, siempre puedes hacer clic en Inicio")
      break
  }

  // Adaptar según urgencia
  if (urgency === "critical") {
    tone = "concise"
    if (entry.steps && entry.steps.length > 0) {
      // Mostrar solo los pasos esenciales
      answer = `🚨 RESPUESTA RÁPIDA:\n${entry.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n")}`
    }
    quickTips.unshift("🚨 Si necesitas ayuda inmediata, llama a soporte")
  } else if (urgency === "high") {
    quickTips.unshift("⚠️ Si esto no resuelve tu problema, contáctanos")
  }

  return { answer, tone, quickTips }
}

/**
 * Genera acciones rápidas según el contexto
 */
export function generateQuickActions(
  entry: HelpEntry,
  userType: string,
  urgency: string,
): Array<{ text: string; action: string; icon: string }> {
  const actions: Array<{ text: string; action: string; icon: string }> = []

  // Acción principal siempre disponible
  if (entry.route) {
    actions.push({
      text: "Ir ahí ahora",
      action: `navigate:${entry.route}`,
      icon: "→",
    })
  }

  // Acciones según urgencia
  if (urgency === "critical" || urgency === "high") {
    actions.push({
      text: "Llamar a soporte",
      action: "contact:support",
      icon: "📞",
    })
  }

  // Acciones según tipo de usuario
  if (userType === "seller") {
    actions.push({
      text: "Modo rápido",
      action: "quick_mode:enable",
      icon: "⚡",
    })
  }

  if (userType === "beginner") {
    actions.push({
      text: "Ver tutorial en video",
      action: "watch:tutorial",
      icon: "🎥",
    })
    actions.push({
      text: "Guía paso a paso",
      action: "guide:interactive",
      icon: "📖",
    })
  }

  if (userType === "owner") {
    actions.push({
      text: "Ver reporte completo",
      action: "report:full",
      icon: "📊",
    })
  }

  return actions
}

/**
 * Expande la consulta con contexto situacional
 */
export function expandWithSituationalContext(query: string): string[] {
  const expanded = [query]
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDate()

  // Contexto de hora del día
  if (hour >= 6 && hour < 10) {
    // Mañana - probable apertura
    if (query.includes("caja") || query.includes("empezar")) {
      expanded.push("abrir caja", "apertura de caja")
    }
  } else if (hour >= 18 && hour < 23) {
    // Noche - probable cierre
    if (query.includes("caja") || query.includes("terminar")) {
      expanded.push("cerrar caja", "cierre de caja", "arqueo")
    }
  }

  // Contexto de fin de mes
  if (day >= 28) {
    if (query.includes("reporte") || query.includes("ventas")) {
      expanded.push("reporte mensual", "cierre de mes")
    }
  }

  return expanded
}

/**
 * Expande con sinónimos del negocio
 */
export function expandWithBusinessSynonyms(query: string): string[] {
  const expanded = [query]

  for (const [key, synonyms] of Object.entries(businessSynonyms)) {
    if (query.toLowerCase().includes(key)) {
      synonyms.forEach(synonym => {
        expanded.push(query.toLowerCase().replace(key, synonym))
      })
    }
  }

  return [...new Set(expanded)]
}

/**
 * Genera sugerencias proactivas basadas en el contexto
 */
export function generateProactiveSuggestions(
  query: string,
  userType: string,
): string[] {
  const suggestions: string[] = []

  // Sugerencias para vendedores
  if (userType === "seller") {
    if (query.includes("venta") || query.includes("vender")) {
      suggestions.push("¿Sabías que puedes usar el lector de código de barras?")
      suggestions.push("Tip: Ctrl+N para nueva venta rápida")
    }
    if (query.includes("stock") || query.includes("disponible")) {
      suggestions.push("Puedes configurar alertas de stock bajo")
    }
  }

  // Sugerencias para dueños
  if (userType === "owner") {
    if (query.includes("venta") || query.includes("reporte")) {
      suggestions.push("Puedes programar reportes automáticos diarios")
      suggestions.push("¿Quieres ver tus productos más rentables?")
    }
  }

  // Sugerencias para principiantes
  if (userType === "beginner") {
    suggestions.push("💡 Tip: Usa el tour guiado para conocer el sistema")
    suggestions.push("📚 Hay tutoriales en video disponibles")
  }

  return suggestions
}

/**
 * Detecta si la consulta es una queja o frustración
 */
export function detectFrustration(query: string): {
  isFrustrated: boolean
  level: "low" | "medium" | "high"
  empathy?: string
} {
  const q = query.toLowerCase()

  // Alta frustración
  if (
    q.includes("no sirve") ||
    q.includes("no funciona") ||
    q.includes("nunca") ||
    q.includes("siempre") ||
    q.includes("!!!") ||
    q.split("!").length > 2
  ) {
    return {
      isFrustrated: true,
      level: "high",
      empathy: "Entiendo tu frustración. Vamos a resolver esto juntos paso a paso.",
    }
  }

  // Media frustración
  if (
    q.includes("no puedo") ||
    q.includes("no me deja") ||
    q.includes("otra vez") ||
    q.includes("de nuevo")
  ) {
    return {
      isFrustrated: true,
      level: "medium",
      empathy: "Veo que estás teniendo dificultades. Te voy a ayudar.",
    }
  }

  // Baja frustración
  if (q.includes("no entiendo") || q.includes("confundido")) {
    return {
      isFrustrated: true,
      level: "low",
      empathy: "No te preocupes, es normal. Te explico paso a paso.",
    }
  }

  return { isFrustrated: false, level: "low" }
}

/**
 * Sistema completo de ayuda contextual
 */
export function getContextualHelp(
  query: string,
  possibleEntries: HelpEntry[],
): ContextualMatch | null {
  // 1. Detectar contexto
  const userType = detectUserType(query)
  const urgency = detectUrgency(query)
  const problem = detectProblemPattern(query)
  const frustration = detectFrustration(query)

  // 2. Expandir consulta con contexto
  const expandedQueries = [
    ...expandWithSituationalContext(query),
    ...expandWithBusinessSynonyms(query),
  ]

  // 3. Buscar en escenarios del mundo real primero
  for (const scenario of realWorldScenarios) {
    for (const pattern of scenario.patterns) {
      if (expandedQueries.some(q => q.toLowerCase().includes(pattern.toLowerCase()))) {
        const entry = possibleEntries.find(e => e.id === scenario.expectedEntry)
        if (entry) {
          const adapted = adaptResponseToContext(entry, userType, urgency)
          const quickActions = generateQuickActions(entry, userType, urgency)
          const suggestions = generateProactiveSuggestions(query, userType)

          return {
            entry: {
              ...entry,
              answer: frustration.empathy
                ? `${frustration.empathy}\n\n${adapted.answer}`
                : adapted.answer,
            },
            scenario,
            userType,
            urgency,
            confidence: 0.95,
            suggestions: [...adapted.quickTips!, ...suggestions],
            quickActions,
          }
        }
      }
    }
  }

  return null
}

/**
 * FIX #2: Infiere la entidad desde el contexto de la ruta
 * Resuelve pronombres demostrativos sin antecedente usando la sección actual
 * 🔧 MEJORADO: Ahora detecta SUB-RUTAS específicas para mayor precisión
 */
export function inferEntityFromRoute(routeContext: RouteContext): string | null {
  // 🆕 SUB-ROUTE MAPPING (más específico que section mapping)
  // Mapeo de rutas completas a entidades específicas
  const subRouteMap: Record<string, string> = {
    // Accounting sub-routes
    "/dashboard/accounting/journals": "diarios contables",
    "/dashboard/accounting/chart": "plan de cuentas",
    "/dashboard/accounting/dinero": "flujo de caja",
    "/dashboard/accounting/salud": "salud del negocio",
    "/dashboard/accounting/entries": "asientos contables",

    // Entries sub-routes
    "/dashboard/entries/new": "nuevo ingreso",

    // Inventory sub-routes
    "/dashboard/inventory/product-details": "detalles del producto",
    "/dashboard/inventory/labels": "etiquetas de productos",

    // Sales sub-routes
    "/dashboard/sales/new": "nueva venta",
    "/dashboard/sales/salesdashboard": "reporte de ventas",
    "/dashboard/sales/product-report": "reporte de productos",
  }

  // 1. PRIORIDAD: Buscar match exacto de la ruta completa (incluye sub-rutas)
  if (routeContext.route && subRouteMap[routeContext.route]) {
    return subRouteMap[routeContext.route]
  }

  // 2. FALLBACK: Mapeo de sección general (comportamiento original)
  const entityMap: Record<string, string> = {
    sales: "venta",
    products: "producto",
    inventory: "producto",
    entries: "entrada de mercadería",
    accounting: "contabilidad",  // 🔧 Cambiado de "asiento contable" a genérico
    quotes: "cotización",
    orders: "orden",
    catalog: "catálogo",
    categories: "categoría",
    providers: "proveedor",
    stores: "tienda",
    brands: "marca",
    users: "usuario",
    cashregister: "caja",
    exchange: "tipo de cambio",
    messages: "mensaje",
    reports: "reporte",
  }

  return entityMap[routeContext.section] || null
}

/**
 * FIX #2: Detecta si la query contiene pronombres sin antecedente claro
 * Detecta pronombres al inicio O después de verbos comunes O al final de preguntas
 */
export function hasPronounWithoutAntecedent(query: string): boolean {
  const trimmed = query.trim()

  // Pronombres al inicio de la frase
  if (/^(la|el|lo|una?|este|esta|esto)\s+/i.test(trimmed)) {
    return true
  }

  // Pronombres después de verbos (cómo [verbo] la/el/una)
  if (/^(cómo|como)\s+(registro|creo|agrego|añado|edito|modifico|elimino|borro|veo|encuentro)\s+(la|el|lo|una?)\b/i.test(trimmed)) {
    return true
  }

  // Pronombres entre verbo y sustantivo implícito (dónde veo la/el)
  if (/^(dónde|donde)\s+(veo|encuentro|está)\s+(la|el|lo)\b/i.test(trimmed)) {
    return true
  }

  // ⭐ NUEVO: Pronombres al final de preguntas ("que hace esto", "para que sirve esto")
  if (/\b(esto|eso|esa|ese|esta|este)\s*\??$/i.test(trimmed)) {
    return true
  }

  // ⭐ NUEVO: Patrones de preguntas genéricas sobre contexto actual
  if (/^(qu[eé]|para\s+qu[eé]|c[oó]mo)\s+(hace|es|sirve|funciona)\s+(esto|eso|esa|ese|esta)\b/i.test(trimmed)) {
    return true
  }

  return false
}

/**
 * Determina si la entidad es femenina o masculina para concordancia gramatical
 */
function getArticle(entity: string): "la" | "el" {
  const feminineEntities = ["venta", "cotización", "entrada de mercadería", "categoría", "marca", "tienda"]
  return feminineEntities.some(e => entity.includes(e)) ? "la" : "el"
}

/**
 * FIX #2: Expande la query reemplazando pronombres con la entidad inferida
 * Ejemplo: "cómo registro una nueva?" → "cómo registro una nueva venta?"
 */
export function expandQueryWithEntity(
  query: string,
  routeContext: RouteContext
): string {
  if (!hasPronounWithoutAntecedent(query)) {
    return query
  }

  const entity = inferEntityFromRoute(routeContext)
  if (!entity) {
    return query
  }

  const article = getArticle(entity)
  const trimmedQuery = query.trim()

  // Patrones de pronombres a reemplazar (más flexibles y específicos)
  const patterns = [
    // ⭐ NUEVO: "que hace esto" → "que hace la caja"
    {
      regex: /^(qu[eé]|para\s+qu[eé])\s+(hace|es|sirve|funciona)\s+(esto|eso|esa|ese|esta)\??$/i,
      replacement: `$1 $2 ${article} ${entity}?`
    },
    // ⭐ NUEVO: "como funciona esto" → "como funciona la caja"
    {
      regex: /^(c[oó]mo)\s+(funciona|trabaja|opera)\s+(esto|eso)\??$/i,
      replacement: `$1 $2 ${article} ${entity}?`
    },
    // ⭐ NUEVO: "para que sirve esto" → "para que sirve la caja"
    {
      regex: /^para\s+qu[eé]\s+(sirve|es)\s+(esto|eso)\??$/i,
      replacement: `para qué $1 ${article} ${entity}?`
    },
    // "cómo registro una nueva?" → "cómo registro una nueva venta?"
    {
      regex: /^(cómo|como)\s+(registro|creo|agrego|añado)\s+una?\s+(nuev[ao]s?)\??$/i,
      replacement: `cómo $2 una nueva ${entity}?`
    },
    // "cómo la edito?" → "cómo edito la venta?"
    {
      regex: /^(cómo|como)\s+(la|el)\s+(edito|modifico|cambio)\??$/i,
      replacement: `cómo $3 ${article} ${entity}?`
    },
    // "cómo edito la?" → "cómo edito la venta?"
    {
      regex: /^(cómo|como)\s+(edito|modifico|cambio)\s+(la|el)\??$/i,
      replacement: `cómo $2 ${article} ${entity}?`
    },
    // "cómo elimino la?" → "cómo elimino la cotización?"
    {
      regex: /^(cómo|como)\s+(elimino|borro|quito)\s+(la|el)\??$/i,
      replacement: `cómo $2 ${article} ${entity}?`
    },
    // "dónde veo el?" → "dónde veo el producto?"
    {
      regex: /^(dónde|donde)\s+(veo|encuentro|está)\s+(la|el|lo)\??$/i,
      replacement: `$1 $2 ${article} ${entity}?`
    },
    // "la edito" → "edito la venta" (sin redundancia de pronombre)
    {
      regex: /^(la|el)\s+(edito|modifico|elimino|borro)$/i,
      replacement: `$2 ${article} ${entity}`
    },
  ]

  for (const pattern of patterns) {
    if (pattern.regex.test(trimmedQuery)) {
      const result = trimmedQuery.replace(pattern.regex, pattern.replacement)
      return result
    }
  }

  // Fallback: agregar entidad después del primer pronombre encontrado
  // Prioriza pronombres después de verbos
  if (/^(cómo|como)\s+\w+\s+(la|el|una?)\b/i.test(trimmedQuery)) {
    return trimmedQuery.replace(/\b(la|el|una?)\b/i, `${article} ${entity}`)
  }

  // Fallback final: pronombre al inicio
  return trimmedQuery.replace(/^(la|el|lo|una?|este|esta)\s+/i, `${article} ${entity} `)
}
