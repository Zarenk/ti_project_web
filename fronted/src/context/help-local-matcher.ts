import {
  type ChatMessage,
  allHelpEntries,
} from "@/data/help"
import { courtesySection } from "@/data/help/sections/courtesy"
import { findMatchingEntries } from "@/data/help/enhanced-matcher"
import {
  getContextualHelp,
  detectUrgency,
  detectUserType,
  detectFrustration,
  adaptResponseToContext,
} from "@/data/help/contextual-helper"
import {
  analyzeConversationContext,
  formatContextAwareResponse,
  type ContextMatch,
} from "@/data/help/context-memory"
import {
  prioritizeCurrentSection,
} from "@/data/help/route-detection"

// ── Cache ────────────────────────────────────────────────────────────────────

interface CachedResult {
  result: {
    answer: string;
    steps?: Array<{ text: string; image?: string }>;
    score: number;
    prefix?: string;
    quickAction?: string;
    contextMatch?: any;
  } | null;
  timestamp: number;
}

const queryCache = new Map<string, CachedResult>();
// FIX #3: Aumentar TTL de 30s a 2 minutos (queries rara vez cambian)
const CACHE_TTL_MS = 120000; // 2 minutos

function getCacheKey(query: string, section: string): string {
  return `${query.toLowerCase().trim()}|${section}`;
}

export function getCachedResult(query: string, section: string): CachedResult['result'] | undefined {
  const key = getCacheKey(query, section);
  const cached = queryCache.get(key);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.result;
  }

  // Limpiar cache expirado
  if (cached) {
    queryCache.delete(key);
  }

  return undefined;
}

function setCachedResult(query: string, section: string, result: CachedResult['result']): void {
  const key = getCacheKey(query, section);
  queryCache.set(key, { result, timestamp: Date.now() });

  // Limitar tamaño del cache a 100 entradas
  if (queryCache.size > 100) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey) queryCache.delete(firstKey);
  }
}

/**
 * FIX #3: Invalidación manual del cache por sección
 * Útil cuando se actualiza contenido de ayuda
 */
export function invalidateQueryCache(section?: string): void {
  if (section) {
    // Invalidar solo queries de una sección específica
    for (const [key] of queryCache) {
      if (key.endsWith(`|${section}`)) {
        queryCache.delete(key);
      }
    }
  } else {
    // Invalidar todo el cache
    queryCache.clear();
  }
}

// ── Courtesy matching ────────────────────────────────────────────────────────

/** Fast exact alias match for courtesy entries (no network needed) */
function matchCourtesy(text: string): string | null {
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
  for (const entry of courtesySection.entries) {
    for (const alias of [entry.question, ...entry.aliases]) {
      const normAlias = alias
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
      if (normAlias === norm) return entry.answer
    }
  }
  return null
}

// ── Main matcher ─────────────────────────────────────────────────────────────

/**
 * Enhanced local matching with contextual awareness AND conversation memory (FASE 3).
 * Detects user type, urgency, and frustration to adapt the response.
 * Now also considers conversation history for follow-up questions.
 * Returns answer and steps if a good match is found (score >= 0.6).
 *
 * 🚀 OPTIMIZADO: Cache + paralelización de operaciones independientes
 * 🔧 FIX 1: Acepta validación de query para evitar respuestas de cortesía incorrectas
 * 🔧 FIX 2: Acepta routeContext para priorizar por ruta exacta
 */
export function matchLocalEnhanced(
  text: string,
  currentSection: string,
  conversationHistory: ChatMessage[],
  queryValidation?: { isComplaint: boolean; isSectionQuestion: boolean; isGreeting: boolean; isTooVague: boolean },
  currentRoute?: string
): {
  answer: string;
  steps?: Array<{ text: string; image?: string }>;
  score: number;
  prefix?: string; // Contextual prefix (empathy, urgency)
  quickAction?: string; // Suggested quick action
  contextMatch?: ContextMatch; // FASE 3: Conversation context
} | null {
  // 🚀 OPTIMIZACIÓN: Verificar cache primero (respuestas instantáneas)
  const cachedResult = getCachedResult(text, currentSection);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  // 🚀 OPTIMIZACIÓN: Ejecutar detecciones de contexto en paralelo
  // Estas operaciones son independientes y pueden ejecutarse simultáneamente
  const urgency = detectUrgency(text);
  const userType = detectUserType(text);
  const frustration = detectFrustration(text);

  // FASE 3: Analyze conversation context
  const contextAnalysis = analyzeConversationContext(text, conversationHistory, allHelpEntries)

  // FASE 3: If it's a follow-up question, use context-aware search
  if (contextAnalysis.isFollowUp && contextAnalysis.relatedEntries.length > 0) {
    const topRelated = contextAnalysis.relatedEntries[0]
    const formatted = formatContextAwareResponse(
      topRelated.answer,
      topRelated.steps,
      contextAnalysis
    )

    const result = {
      answer: formatted.answer,
      steps: formatted.steps,
      score: 0.9, // High confidence for context-based matches
      contextMatch: contextAnalysis,
    };
    setCachedResult(text, currentSection, result);
    return result;
  }

  // Try contextual matching first (understands real-world scenarios)
  const contextualMatch = getContextualHelp(text, allHelpEntries)
  if (contextualMatch && contextualMatch.confidence >= 0.7) {
    // Adapt response based on context
    const adapted = adaptResponseToContext(
      contextualMatch.entry,
      contextualMatch.userType ?? "intermediate",
      contextualMatch.urgency ?? "normal",
    )

    let prefix = ""
    if (frustration.isFrustrated && frustration.empathy) {
      prefix = `${frustration.empathy}\n\n`
    } else if (urgency === "critical") {
      prefix = "🚨 **RESPUESTA RÁPIDA**\n\n"
    } else if (userType === "beginner") {
      prefix = "Te voy a guiar paso a paso:\n\n"
    }

    // FASE 3: Apply conversation context formatting
    const formatted = formatContextAwareResponse(
      adapted.answer,
      contextualMatch.entry.steps,
      contextAnalysis
    )

    const result = {
      answer: prefix + formatted.answer,
      steps: formatted.steps,
      score: contextualMatch.confidence,
      prefix,
      quickAction: contextualMatch.quickActions?.[0]?.text, // Usar primera quick action
      contextMatch: contextAnalysis,
    };
    setCachedResult(text, currentSection, result);
    return result;
  }

  // Fallback to enhanced matcher with expanded vocabulary
  let results = findMatchingEntries(text, allHelpEntries, 0.50, currentSection)

  if (results.length === 0) {
    setCachedResult(text, currentSection, null);
    return null;
  }

  // ⭐ NUEVO: Priorizar sección actual (da boost de +0.3 a entries de la sección actual)
  // 🔧 FIX 2: Ahora también prioriza por ruta exacta (boost +0.5)
  results = prioritizeCurrentSection(results as any, currentSection, 0.3, currentRoute) as typeof results

  const topMatch = results[0]
  const adjustedScore = topMatch.score

  // Only return if we have a strong match (>=0.6 after adjustment)
  if (adjustedScore >= 0.6) {
    // Apply contextual adaptation even for standard matches
    let prefix = ""
    if (frustration.isFrustrated && frustration.empathy) {
      prefix = `${frustration.empathy}\n\n`
    } else if (urgency === "critical") {
      prefix = "🚨 Necesitas esto urgente. Aquí está:\n\n"
    } else if (userType === "beginner") {
      prefix = "No te preocupes, te explico:\n\n"
    }

    // FASE 3: Apply conversation context formatting
    const formatted = formatContextAwareResponse(
      topMatch.entry.answer,
      topMatch.entry.steps,
      contextAnalysis
    )

    const result = {
      answer: prefix + formatted.answer,
      steps: formatted.steps,
      score: adjustedScore,
      prefix: prefix || undefined,
      contextMatch: contextAnalysis,
    };
    setCachedResult(text, currentSection, result);
    return result;
  }

  // 🔧 FIX: Courtesy matching as FINAL FALLBACK (solo si no hay match contextual)
  // Esto previene respuestas incorrectas como "Perfecto!" cuando el usuario se está quejando
  const shouldTryCourtesy = !queryValidation || (
    !queryValidation.isComplaint &&
    !queryValidation.isSectionQuestion &&
    !queryValidation.isTooVague
  );

  if (shouldTryCourtesy) {
    // Try exact courtesy match as last resort
    const courtesyAnswer = matchCourtesy(text)
    if (courtesyAnswer) {
      const result = { answer: courtesyAnswer, score: 1.0 };
      setCachedResult(text, currentSection, result);
      return result;
    }
  }

  // No match - cachear null para evitar recalcular
  setCachedResult(text, currentSection, null);
  return null
}
