/**
 * Motor de detección de intención operacional.
 * Se ejecuta ANTES del pipeline Q&A. Si detecta un intent con alta confianza,
 * se ejecuta la herramienta correspondiente. Si no, el flujo Q&A continúa intacto.
 */

import type { ParsedIntent, ParsedEntity, OperationalIntentPattern } from "./intent-types"
import { extractEntities } from "./entity-extractor"

const CONFIDENCE_THRESHOLD = 0.80

// ══════════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE INTENTS OPERACIONALES
// ══════════════════════════════════════════════════════════════════════════════

export const OPERATIONAL_INTENT_PATTERNS: OperationalIntentPattern[] = [
  // ══ INVENTARIO ══
  {
    intent: "inventory.add",
    patterns: [
      /(?:agrega|añade|ingresa|registra|mete)\s+(\d+)\s+(?:unidades?\s+(?:de\s+)?)?(.+?)(?:\s+al\s+inventario|\s+al\s+stock)?$/i,
      /(?:entrada|compra)\s+(?:de\s+)?(\d+)\s+(.+)/i,
      /(?:stock|inventario)\s+(?:de\s+)?(.+?)\s+(?:agregar|sumar)\s+(\d+)/i,
    ],
    entitySlots: ["quantity", "product"],
    type: "mutation",
    requiredEntities: ["quantity", "product"],
  },

  // ══ VENTAS - Listar ══
  {
    intent: "sale.list",
    patterns: [
      /(?:muestra|dame|ver|listar?|enseña|mostrar)\s+(?:las?\s+)?ventas?\s+(?:de\s+)?(hoy|ayer|esta semana|este mes|últim[oa]s?\s+\d+\s+días?)/i,
      /(?:últimas?|recientes?)\s+(\d+)?\s*ventas?/i,
      /ventas?\s+(?:del?\s+)?(hoy|ayer|esta semana|este mes)/i,
    ],
    entitySlots: ["period"],
    type: "query",
  },

  // ══ VENTAS - Estadísticas ══
  {
    intent: "sale.stats",
    patterns: [
      /(?:estadísticas?|stats?|resumen|totales?)\s+(?:de\s+)?ventas?\s*(?:de\s+)?(hoy|este mes|esta semana|ayer)?/i,
      /(?:cuánto|cuanto)\s+(?:se\s+)?(?:vendió|vendimos?|facturamos?)\s*(?:hoy|este mes|esta semana|ayer)?/i,
      /(?:total|monto)\s+(?:de\s+)?ventas?\s+(?:de\s+)?(hoy|este mes|esta semana|ayer)/i,
    ],
    entitySlots: ["period"],
    type: "query",
  },

  // ══ VENTAS - Crear ══
  {
    intent: "sale.create",
    patterns: [
      /(?:haz|crea|registra|nueva)\s+(?:una?\s+)?venta\s+(?:de\s+)?(\d+)\s+(.+?)(?:\s+a\s+(.+))?$/i,
      /(?:vende|vender)\s+(\d+)\s+(.+?)(?:\s+a\s+(.+))?$/i,
    ],
    entitySlots: ["quantity", "product", "client"],
    type: "mutation",
    requiredEntities: ["quantity", "product"],
  },

  // ══ CAJA REGISTRADORA ══
  {
    intent: "cashregister.view",
    patterns: [
      /(?:muestra|dame|ver|abrir?|mostrar)\s+(?:la?\s+)?(?:caja|registros?\s+de\s+caja|movimientos?\s+de\s+caja)/i,
      /(?:estado|balance|saldo)\s+(?:de\s+)?(?:la?\s+)?caja/i,
      /(?:cuánto|cuanto)\s+(?:hay|tiene)\s+(?:en\s+)?(?:la?\s+)?caja/i,
    ],
    entitySlots: [],
    type: "query",
  },

  // ══ PRODUCTOS - Buscar ══
  {
    intent: "product.search",
    patterns: [
      /(?:busca|encuentra|buscar)\s+(?:el?\s+)?(?:producto?\s+)?(.+)/i,
      /(?:stock|existencia|cuánto[s]?\s+(?:hay|queda))\s+(?:de\s+)?(.+)/i,
      /(?:cuántos?|cuantos?)\s+(.+?)\s+(?:hay|quedan?|tenemos?)/i,
    ],
    entitySlots: ["product"],
    type: "query",
  },

  // ══ PRODUCTOS - Stock bajo ══
  {
    intent: "product.lowstock",
    patterns: [
      /(?:productos?\s+(?:con\s+)?(?:stock\s+)?bajo|stock\s+bajo|bajo\s+stock|sin\s+stock|agotados?)/i,
      /(?:qué|que)\s+(?:productos?\s+)?(?:se\s+)?(?:están?\s+)?agotando/i,
    ],
    entitySlots: [],
    type: "query",
  },

  // ══ ESTADÍSTICAS GENERALES ══
  {
    intent: "stats.dashboard",
    patterns: [
      /(?:estadísticas?|stats?|resumen|dashboard|métricas?)\s+(?:del?\s+)?(mes|semana|día|hoy)/i,
      /(?:cómo|como)\s+(?:va|vamos?|está)\s+(?:el\s+)?(?:negocio|mes|semana)/i,
      /(?:dame|muestra|mostrar)\s+(?:un?\s+)?(?:resumen|panorama|reporte)\s*(?:del?\s+)?(mes|semana|hoy)?/i,
    ],
    entitySlots: ["period"],
    type: "query",
  },

  // ══ NAVEGACIÓN ══
  {
    intent: "navigate.to",
    patterns: [
      /(?:llévame|ir|ve|navega|abre|abrir)\s+(?:a\s+)?(?:la?\s+)?(?:sección\s+(?:de\s+)?)?(productos?|ventas?|inventario|contabilidad|caja|clientes?|proveedores?|entradas?|marcas?|categorías?|tiendas?|configuración|reportes?|cotizaciones?)/i,
    ],
    entitySlots: ["section"],
    type: "navigation",
  },
]

// ══════════════════════════════════════════════════════════════════════════════
// MOTOR DE PARSING
// ══════════════════════════════════════════════════════════════════════════════

/** Frases que claramente son preguntas Q&A y NO intents operacionales */
const QA_INDICATORS = [
  /^¿/,
  /^(qué|que)\s+(es|significa|son)\b/i,
  /^(cómo|como)\s+(funciona|se usa|se hace)\b/i,
  /^(para qué|para que)\s+(sirve|se usa)\b/i,
  /^(por qué|por que)\s+(necesito|debo)\b/i,
  /^(explica|explicame|dime qué)\b/i,
]

/**
 * Detecta si el mensaje del usuario es un intent operacional ejecutable.
 * Retorna null si no se detecta intent (el flujo Q&A continúa normal).
 */
export function parseIntent(
  text: string,
  currentSection?: string,
): ParsedIntent | null {
  const normalized = text.toLowerCase().trim()

  // Demasiado corto para ser un intent operacional
  if (normalized.length < 5) return null

  // Frases claramente Q&A → no intentar parsear como acción
  for (const qaRegex of QA_INDICATORS) {
    if (qaRegex.test(normalized)) return null
  }

  let bestMatch: ParsedIntent | null = null
  let bestScore = 0

  for (const pattern of OPERATIONAL_INTENT_PATTERNS) {
    // Boost si el intent es relevante para la sección actual
    const sectionBoost = pattern.section && pattern.section === currentSection ? 0.05 : 0

    for (const regex of pattern.patterns) {
      const match = normalized.match(regex)
      if (!match) continue

      const entities = extractEntities(match, pattern.entitySlots)
      const score = calculateConfidence(match, entities, pattern) + sectionBoost

      if (score > bestScore) {
        bestScore = score
        bestMatch = {
          intent: pattern.intent,
          entities,
          confidence: Math.min(score, 1),
          originalText: text,
          type: pattern.type,
        }
      }
    }
  }

  return bestMatch && bestMatch.confidence >= CONFIDENCE_THRESHOLD ? bestMatch : null
}

/** Calcula confianza basada en calidad del match y entidades extraídas */
function calculateConfidence(
  match: RegExpMatchArray,
  entities: ParsedEntity[],
  pattern: OperationalIntentPattern,
): number {
  let score = 0.8 // Base score por match de regex

  // +0.1 si capturó todas las entidades requeridas
  if (pattern.requiredEntities?.length) {
    const extractedTypes = new Set<string>(entities.map(e => e.type))
    const allRequired = pattern.requiredEntities.every(r => extractedTypes.has(r))
    if (allRequired) score += 0.1
    else score -= 0.2 // Penalizar si faltan entidades requeridas
  }

  // +0.05 si el match cubre gran parte del texto (no hay mucho residuo)
  const matchedLength = match[0].length
  const totalLength = match.input?.length ?? matchedLength
  const coverage = matchedLength / totalLength
  if (coverage > 0.8) score += 0.05

  // +0.05 si tiene entidades no vacías
  if (entities.length > 0 && entities.every(e => e.raw.length > 0)) {
    score += 0.05
  }

  return score
}
