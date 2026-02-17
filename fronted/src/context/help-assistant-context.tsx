"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import { authFetch } from "@/utils/auth-fetch"
import {
  resolveSection,
  getSectionById,
  allHelpEntries,
  type ChatMessage,
  type HelpSection,
} from "@/data/help"
import { courtesySection } from "@/data/help/sections/courtesy"
import { findMatchingEntries } from "@/data/help/enhanced-matcher"
import {
  getContextualHelp,
  detectUrgency,
  detectUserType,
  detectFrustration,
  adaptResponseToContext,
  expandQueryWithEntity,
} from "@/data/help/contextual-helper"
import {
  analyzeConversationContext,
  contextAwareSearch,
  formatContextAwareResponse,
  type ContextMatch,
} from "@/data/help/context-memory"
import {
  trackSectionVisit,
  trackQuestionAsked,
  getProactiveSuggestion,
  generateProactiveTipMessage,
  isUserStruggling,
} from "@/data/help/proactive-suggestions"
import { syncQueue } from "@/lib/sync-queue"
import {
  detectPrerequisitesInQuery,
  generatePrerequisiteResponse,
} from "@/data/help/prerequisites"
import {
  semanticSearch,
  initializeSemanticSearch,
  type SemanticSearchResult,
} from "@/data/help/semantic-search"
import { helpResponseCache, semanticSearchCache } from "@/lib/intelligent-cache"
import {
  analyzeSentiment,
  adaptResponseToSentiment,
  detectFrustrationEscalation,
  type SentimentAnalysis,
} from "@/data/help/sentiment-analysis"
import {
  initOfflineDB,
  preloadOfflineData,
  setupOfflineDetection,
  isOnline,
  searchOffline,
} from "@/data/help/offline-support"
import {
  recordLearningSession,
  promoteAnswer,
  getPromotedAnswer,
  analyzePatternsAndSuggest,
  cleanupAnalysisWorker,
  type LearningSession,
} from "@/data/help/adaptive-learning"
import {
  validateQuery,
  validateResponse,
  generateNoMatchResponse,
  isMetaQuestion,
  generateMetaResponse,
} from "@/data/help/query-validation"
import {
  detectCurrentSection,
  getSectionDisplayName,
  generateContextualGreeting,
  getContextualSuggestions,
  prioritizeCurrentSection,
  type RouteContext,
} from "@/data/help/route-detection"
import { useChatUserId } from "@/hooks/use-chat-user-id"
import {
  trackUnmatchedQuery,
  trackMatchedQuery,
  getMostAskedUnmatched,
} from "@/data/help/learning-system"
import { autoCorrect } from "@/data/help/fuzzy-matcher"

type MascotState = "idle" | "waving" | "thinking" | "responding"

interface HelpAssistantContextType {
  currentSection: string
  routeContext: RouteContext // DETECCIÓN AUTOMÁTICA: Contexto completo de la ruta
  sectionMeta: HelpSection | undefined
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  mascotState: MascotState
  messages: ChatMessage[]
  showProactiveTip: boolean
  dismissTip: () => void
  sendMessage: (text: string) => Promise<void>
  sendFeedback: (messageId: string, feedback: "POSITIVE" | "NEGATIVE") => Promise<void>
  /** FASE 3: Offline mode indicator */
  isOffline: boolean
  /** MEDIUM-TERM OPTIMIZATION #2: Pagination */
  hasMoreMessages: boolean
  isLoadingMore: boolean
  loadOlderMessages: () => Promise<void>
}

const HelpAssistantContext = createContext<HelpAssistantContextType | undefined>(
  undefined,
)

const VISITED_KEY = "help-visited-sections"

function getVisitedSections(): Set<string> {
  try {
    const raw = localStorage.getItem(VISITED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function markSectionVisited(sectionId: string) {
  try {
    const visited = getVisitedSections()
    visited.add(sectionId)
    localStorage.setItem(VISITED_KEY, JSON.stringify([...visited]))
  } catch {
    /* localStorage not available */
  }
}

/**
 * Genera un ID único garantizado para mensajes locales.
 * Usa crypto.randomUUID() si está disponible, sino timestamp + random.
 */
function generateUniqueMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `local-${crypto.randomUUID()}`
  }
  // Fallback: timestamp + random para garantizar unicidad
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * 🚀 OPTIMIZACIÓN: Cache de resultados de búsqueda
 * TTL de 30 segundos para consultas idénticas
 */
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

function getCachedResult(query: string, section: string): CachedResult['result'] | undefined {
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
function invalidateQueryCache(section?: string): void {
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

/**
 * 🧠 COMPREHENSIVE LEARNING TRACKER
 * Registra TODAS las interacciones del chatbot para aprendizaje continuo.
 * Fire-and-forget (no bloquea el UI).
 */
function trackInteraction(params: {
  query: string
  section: string
  matchFound: boolean
  matchScore?: number
  matchedEntryId?: string
  source?: "static" | "ai" | "promoted" | "offline"
  responseTimeMs?: number
  isMetaQuestion?: boolean
  isInvalidQuery?: boolean
  hasSteps?: boolean
  userType?: "beginner" | "intermediate" | "advanced"
  urgency?: "normal" | "high" | "critical"
  isContextual?: boolean
  userFeedback?: "POSITIVE" | "NEGATIVE"
}) {
  // Registrar en localStorage (rápido, local)
  recordLearningSession({
    query: params.query,
    normalizedQuery: params.query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    matchFound: params.matchFound,
    matchScore: params.matchScore,
    matchedEntryId: params.matchedEntryId,
    userFeedback: params.userFeedback || null,
    timestamp: Date.now(),
    section: params.section,
    source: params.source,
    responseTimeMs: params.responseTimeMs,
    isMetaQuestion: params.isMetaQuestion,
    isInvalidQuery: params.isInvalidQuery,
    hasSteps: params.hasSteps,
    userType: params.userType,
    urgency: params.urgency,
    isContextual: params.isContextual,
  })

  // TODO: Enviar al backend de forma asíncrona (batch cada X segundos)
  // Esta parte se implementaría más adelante con un buffer que envía
  // múltiples sesiones en un solo request para optimizar
}

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
function matchLocalEnhanced(
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
      contextualMatch.userType,
      contextualMatch.urgency,
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
  let results = findMatchingEntries(text, allHelpEntries, 0.6, currentSection)

  if (results.length === 0) {
    setCachedResult(text, currentSection, null);
    return null;
  }

  // 🚀 FIX: Removido sort redundante - findMatchingEntries ya retorna ordenado
  // results.sort((a, b) => b.score - a.score) ← ELIMINADO

  // ⭐ NUEVO: Priorizar sección actual (da boost de +0.3 a entries de la sección actual)
  // 🔧 FIX 2: Ahora también prioriza por ruta exacta (boost +0.5)
  results = prioritizeCurrentSection(results, currentSection, 0.3, currentRoute)

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

interface BackendMessage {
  id: number
  role: "USER" | "ASSISTANT"
  content: string
  source: "STATIC" | "AI" | "PROMOTED" | null
  feedback: "POSITIVE" | "NEGATIVE" | null
  createdAt: string
}

interface AskResponse {
  messageId: number
  answer: string
  source: "static" | "ai" | "promoted"
  steps?: Array<{ text: string; image?: string }>
}

function backendToChat(msg: BackendMessage): ChatMessage {
  const sourceMap: Record<string, "static" | "ai" | "promoted"> = {
    STATIC: "static",
    AI: "ai",
    PROMOTED: "promoted",
  }
  return {
    id: `db-${msg.id}`,
    role: msg.role === "USER" ? "user" : "assistant",
    content: msg.content,
    source: msg.source ? sourceMap[msg.source] : undefined,
    feedback: msg.feedback,
    timestamp: new Date(msg.createdAt).getTime(),
  }
}

export function HelpAssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // NUEVA DETECCIÓN AUTOMÁTICA: Detecta sección desde la URL
  const routeContext = useMemo<RouteContext>(() => detectCurrentSection(pathname), [pathname])
  const currentSection = routeContext.section

  const sectionMeta = useMemo(
    () => getSectionById(currentSection),
    [currentSection],
  )

  const [isOpen, setIsOpen] = useState(false)
  const [mascotState, setMascotState] = useState<MascotState>("idle")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showProactiveTip, setShowProactiveTip] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [isOffline, setIsOffline] = useState(false) // FASE 3: Offline state

  // FASE 2: Get user ID for sentiment analysis tracking
  const chatUserId = useChatUserId()

  const wavingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSectionRef = useRef(currentSection)

  // FASE 3: Initialize offline support + FASE 2: Semantic search on mount
  useEffect(() => {
    // Initialize offline DB
    initOfflineDB().then(() => {
      // Preload help data for offline use
      const { HELP_SECTIONS } = require("@/data/help")
      const allSections: HelpSection[] = HELP_SECTIONS
      const allEntries = allSections.flatMap(s => s.entries)
      preloadOfflineData(allEntries, allSections).catch(console.error)

      // FASE 2: Initialize semantic search engine
      console.log("[HelpContext] Initializing semantic search...")
      initializeSemanticSearch(allSections)
    }).catch(console.error)

    // Setup offline detection
    const cleanupOffline = setupOfflineDetection(
      () => setIsOffline(false),
      () => setIsOffline(true)
    )

    // Set initial offline state
    setIsOffline(!isOnline())

    // Cleanup on unmount
    return () => {
      cleanupOffline()
      // 🚀 WEB WORKER: Cleanup analysis worker
      cleanupAnalysisWorker()
    }
  }, [])

  // MEDIUM-TERM OPTIMIZATION #2: Load conversation history with pagination
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    if (historyLoaded) return

    async function loadHistory() {
      try {
        const res = await authFetch("/help/conversation?limit=50&offset=0")
        if (res.ok) {
          const data = (await res.json()) as BackendMessage[]
          if (data.length > 0) {
            // Backend returns DESC (newest first), reverse to ASC (oldest first)
            const reversedMessages = data.reverse().map(backendToChat)
            setMessages(reversedMessages)
            // If we got less than 50, there's no more to load
            setHasMoreMessages(data.length === 50)
          } else {
            setHasMoreMessages(false)
          }
        }
      } catch {
        // Silently fail — user just won't see history
      } finally {
        setHistoryLoaded(true)
      }
    }

    void loadHistory()
  }, [historyLoaded])

  // MEDIUM-TERM OPTIMIZATION #2: Load older messages
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages) return

    setIsLoadingMore(true)
    try {
      const currentOffset = messages.length
      const res = await authFetch(`/help/conversation?limit=50&offset=${currentOffset}`)
      if (res.ok) {
        const data = (await res.json()) as BackendMessage[]
        if (data.length > 0) {
          // Reverse to ASC and prepend to existing messages
          const olderMessages = data.reverse().map(backendToChat)
          setMessages((prev) => [...olderMessages, ...prev])
          // Check if there's more to load
          setHasMoreMessages(data.length === 50)
        } else {
          setHasMoreMessages(false)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingMore(false)
    }
  }, [messages.length, isLoadingMore, hasMoreMessages])

  // Proactive tip on section visit + FASE 3: track behavior
  useEffect(() => {
    if (currentSection === prevSectionRef.current) return
    prevSectionRef.current = currentSection

    // FASE 3: Track section visit for behavior analysis
    trackSectionVisit(currentSection)

    // FIX #1: Add visual separator when section changes with chat open
    if (isOpen && messages.length > 0) {
      const sectionLabel = sectionMeta?.label || currentSection
      const separator: ChatMessage = {
        id: `separator-${Date.now()}`,
        role: "assistant",
        content: `── Cambiaste a la sección de ${sectionLabel} ──`,
        timestamp: Date.now(),
        source: "static",
        isSystemMessage: true,
      }
      setMessages((prev) => [...prev, separator])
    }

    const visited = getVisitedSections()
    const isFirstVisit = !visited.has(currentSection) && currentSection !== "general"

    // FASE 3: Check if user is struggling
    const struggling = isUserStruggling(currentSection)

    if (isFirstVisit || struggling) {
      markSectionVisited(currentSection)
      setShowProactiveTip(true)
      setMascotState("waving")

      if (wavingTimerRef.current) clearTimeout(wavingTimerRef.current)
      wavingTimerRef.current = setTimeout(() => {
        setMascotState("idle")
      }, 4000)
    } else {
      markSectionVisited(currentSection)
    }
  }, [currentSection, isOpen, messages.length, sectionMeta])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (wavingTimerRef.current) clearTimeout(wavingTimerRef.current)
    }
  }, [])

  const dismissTip = useCallback(() => {
    setShowProactiveTip(false)
    setMascotState("idle")
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      // FASE 3: Track question for behavior analysis
      trackQuestionAsked(text)

      // 🔧 FIX 4 CRÍTICO: Corregir typos ANTES de procesar
      const { corrected: correctedText } = autoCorrect(text)
      const textToUse = correctedText

      // 🔍 DIAGNOSTIC LOGGING
      console.log("[CHATBOT DEBUG] ========================================")
      console.log("[CHATBOT DEBUG] Original query:", text)
      console.log("[CHATBOT DEBUG] After autocorrect:", correctedText)
      console.log("[CHATBOT DEBUG] Current section:", currentSection)
      console.log("[CHATBOT DEBUG] Current pathname:", pathname)

      // FIX #2: Expandir query si tiene pronombres sin antecedente
      const expandedText = expandQueryWithEntity(textToUse, routeContext)
      const queryToProcess = expandedText
      console.log("[CHATBOT DEBUG] After expansion:", queryToProcess)

      // FASE 2: Analizar sentimiento del usuario (usar texto corregido)
      const userId = chatUserId ? String(chatUserId) : undefined
      const sentimentAnalysis = analyzeSentiment(textToUse, userId)

      // Log si hay escalación necesaria
      if (sentimentAnalysis.needsEscalation) {
        console.warn("[Sentiment] User needs escalation:", {
          sentiment: sentimentAnalysis.sentiment,
          intensity: sentimentAnalysis.intensity,
          score: sentimentAnalysis.score,
        })
      }

      // Optimistic user message (mostrar texto original)
      const tempId = generateUniqueMessageId()
      const userMsg: ChatMessage = {
        id: tempId,
        role: "user",
        content: text,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])
      setMascotState("thinking")

      // FIX CRÍTICO: Validar query antes de procesar (con sección actual)
      // 🔧 FIX: Pasar pathname para respuestas específicas de sub-secciones
      const queryValidation = validateQuery(queryToProcess, currentSection, userId, pathname)
      console.log("[CHATBOT DEBUG] Query validation:", {
        isValid: queryValidation.isValid,
        reason: queryValidation.reason,
        hasSuggestedResponse: Boolean(queryValidation.suggestedResponse)
      })

      // Si es meta-question (sobre el chatbot mismo), responder directamente
      if (isMetaQuestion(queryToProcess)) {
        const startTime = Date.now()
        const assistantMsg: ChatMessage = {
          id: generateUniqueMessageId(),
          role: "assistant",
          content: generateMetaResponse(),
          source: "static",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setMascotState("responding")

        // 🧠 TRACK: Meta-question
        trackInteraction({
          query: queryToProcess,
          section: currentSection,
          matchFound: true,
          matchScore: 1.0,
          source: "static",
          responseTimeMs: Date.now() - startTime,
          isMetaQuestion: true,
          hasSteps: false,
        })

        setTimeout(() => setMascotState("idle"), 2000)
        return
      }

      // Si la query no es válida (genérica, queja, etc.), usar respuesta sugerida
      if (!queryValidation.isValid && queryValidation.suggestedResponse) {
        const startTime = Date.now()
        const assistantMsg: ChatMessage = {
          id: generateUniqueMessageId(),
          role: "assistant",
          content: queryValidation.suggestedResponse,
          source: "static",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setMascotState("responding")

        // 🧠 TRACK: Invalid query
        trackInteraction({
          query: queryToProcess,
          section: currentSection,
          matchFound: false,
          source: "static",
          responseTimeMs: Date.now() - startTime,
          isInvalidQuery: true,
          hasSteps: false,
        })

        setTimeout(() => setMascotState("idle"), 2000)
        return
      }

      // FASE 1 - MEJORA #5: Detectar pre-requisitos (prevenir flujos bloqueados)
      const prerequisite = detectPrerequisitesInQuery(queryToProcess)
      if (prerequisite) {
        const startTime = Date.now()
        const prereqMsg: ChatMessage = {
          id: generateUniqueMessageId(),
          role: "assistant",
          content: generatePrerequisiteResponse(prerequisite),
          source: "static",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, prereqMsg])
        setMascotState("responding")

        // 🧠 TRACK: Prerequisite detected
        trackInteraction({
          query: queryToProcess,
          section: currentSection,
          matchFound: true,
          matchScore: 1.0,
          source: "prerequisite",
          responseTimeMs: Date.now() - startTime,
          hasSteps: false,
        })

        setTimeout(() => setMascotState("idle"), 2000)
        return
      }

      // FASE 2: Check intelligent cache first (ultra-fast path: 10ms)
      const cacheKey = `query:${queryToProcess.toLowerCase().trim()}`
      const cachedResponse = helpResponseCache.get(cacheKey)

      if (cachedResponse) {
        console.log("[Cache] HIT - Returning cached response")
        const startTime = Date.now()

        // Adaptar respuesta según sentimiento detectado
        const adaptedResponse = adaptResponseToSentiment(cachedResponse, sentimentAnalysis)

        const assistantMsg: ChatMessage = {
          id: generateUniqueMessageId(),
          role: "assistant",
          content: adaptedResponse,
          source: "cache",
          timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, assistantMsg])
        setMascotState("responding")

        // Track cache hit
        trackInteraction({
          query: queryToProcess,
          section: currentSection,
          matchFound: true,
          matchScore: 1.0,
          source: "cache",
          responseTimeMs: Date.now() - startTime,
          hasSteps: false,
        })

        setTimeout(() => setMascotState("idle"), 2000)
        return
      }

      // Fast-path: Enhanced local matching with contextual awareness + conversation memory (instant, no network)
      // 🔧 FIX 1: Pasar validación para evitar respuestas de cortesía incorrectas
      // 🔧 FIX 2: Pasar ruta actual para priorizar por ruta exacta
      const localMatch = matchLocalEnhanced(queryToProcess, currentSection, messages, queryValidation, routeContext.route)
      console.log("[CHATBOT DEBUG] Local match result:", {
        found: Boolean(localMatch),
        score: localMatch?.score,
        question: localMatch?.question
      })

      // FIX CRÍTICO: Validar que la respuesta sea relevante
      const responseValidation = localMatch ? validateResponse(
        text,
        localMatch.answer,
        localMatch.score,
        "enhanced"
      ) : null
      console.log("[CHATBOT DEBUG] Response validation:", {
        hasMatch: Boolean(localMatch),
        isRelevant: responseValidation?.isRelevant,
        confidenceLevel: responseValidation?.confidenceLevel
      })

      // FIX CRÍTICO: Si hay match pero no es relevante, intentar semantic search
      if (localMatch && (!responseValidation?.isRelevant || localMatch.score < 0.7)) {
        console.log("[CHATBOT DEBUG] Local match weak or not relevant, trying semantic search...")
        console.log("[CHATBOT DEBUG] Reason: isRelevant =", responseValidation?.isRelevant, "| score =", localMatch.score)
        const startTime = Date.now()

        // FASE 2: Intentar búsqueda semántica como fallback
        const semanticResults = semanticSearch(queryToProcess, 3, 0.4)
        console.log("[CHATBOT DEBUG] Semantic search results:", semanticResults.map(r => ({
          id: r.entry.id,
          question: r.entry.question,
          score: r.score
        })))

        if (semanticResults.length > 0) {
          const best = semanticResults[0]
          console.log(`[Semantic] Found match: ${best.entry.question} (score: ${best.score})`)

          // Adaptar respuesta según sentimiento
          const answer = adaptResponseToSentiment(best.entry.answer, sentimentAnalysis)

          // Guardar en cache
          helpResponseCache.set(cacheKey, best.entry.answer)

          const assistantMsg: ChatMessage = {
            id: generateUniqueMessageId(),
            role: "assistant",
            content: answer,
            source: "semantic",
            steps: best.entry.steps,
            timestamp: Date.now(),
          }

          setMessages((prev) => [...prev, assistantMsg])
          setMascotState("responding")

          // Track semantic match
          const detectedUserType = detectUserType(text)
          const detectedUrgency = detectUrgency(text)

          trackInteraction({
            query: queryToProcess,
            section: currentSection,
            matchFound: true,
            matchScore: best.score,
            source: "semantic",
            responseTimeMs: Date.now() - startTime,
            hasSteps: Boolean(best.entry.steps),
            userType: detectedUserType === "beginner" ? "beginner" : detectedUserType === "owner" || detectedUserType === "accountant" ? "advanced" : "intermediate",
            urgency: detectedUrgency === "critical" || detectedUrgency === "high" ? detectedUrgency : "normal",
          })

          // ⭐ NUEVO: Registrar query exitosa para aprendizaje
          trackMatchedQuery(
            queryToProcess,
            best.entry.id || "unknown",
            best.entry.question,
            best.score,
            currentSection
          )

          setTimeout(() => setMascotState("idle"), 2000)
          return
        }

        // Si semantic search tampoco encuentra nada, usar no match response
        const assistantMsg: ChatMessage = {
          id: generateUniqueMessageId(),
          role: "assistant",
          content: generateNoMatchResponse(text, currentSection),
          source: "static",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setMascotState("responding")

        // 🧠 TRACK: No match found (local + semantic)
        const detectedUserType = detectUserType(text)
        const detectedUrgency = detectUrgency(text)

        trackInteraction({
          query: queryToProcess,
          section: currentSection,
          matchFound: false,
          matchScore: localMatch?.score || 0,
          source: "static",
          responseTimeMs: Date.now() - startTime,
          hasSteps: false,
          userType: detectedUserType === "beginner" ? "beginner" : detectedUserType === "owner" || detectedUserType === "accountant" ? "advanced" : "intermediate",
          urgency: detectedUrgency === "critical" || detectedUrgency === "high" ? detectedUrgency : "normal",
        })

        // ⭐ NUEVO: Registrar query sin respuesta para aprendizaje
        trackUnmatchedQuery(queryToProcess, currentSection, sentimentAnalysis.sentiment)

        setTimeout(() => setMascotState("idle"), 2000)
        return
      }

      if (localMatch && localMatch.score >= 0.7 && responseValidation?.isRelevant) {
        const startTime = Date.now()

        // 🧠 ADAPTIVE LEARNING: Usar respuesta promovida si existe
        const entryId = generateUniqueMessageId()
        const promoted = getPromotedAnswer(entryId)
        const answerToUse = promoted && promoted.confidence >= 0.7
          ? promoted.promotedAnswer
          : localMatch.answer

        const detectedUserType = detectUserType(text)
        const detectedUrgency = detectUrgency(text)

        // Strong local match - respond immediately with contextual adaptation
        const baseAnswer = [
          localMatch.prefix || "",
          answerToUse,
          localMatch.quickAction ? `\n\n⚡ **Acción rápida:** ${localMatch.quickAction}` : "",
          promoted ? `\n\n_✨ Respuesta mejorada basada en ${promoted.positiveVotes} votos positivos_` : "",
        ].filter(Boolean).join("")

        // FASE 2: Adaptar respuesta según sentimiento detectado
        const fullAnswer = adaptResponseToSentiment(baseAnswer, sentimentAnalysis)

        // FASE 2: Guardar en cache para respuestas futuras
        helpResponseCache.set(cacheKey, baseAnswer)

        const assistantMsg: ChatMessage = {
          id: entryId,
          role: "assistant",
          content: fullAnswer,
          source: promoted ? "promoted" : "static",
          steps: localMatch.steps,
          timestamp: Date.now(),
          // FASE 3: Mark contextual responses
          isContextual: localMatch.contextMatch?.isFollowUp || false,
          previousTopic: localMatch.contextMatch?.previousTopic,
        }
        setMessages((prev) => [...prev, assistantMsg])
        setMascotState("responding")

        // 🧠 TRACK: Successful local match
        trackInteraction({
          query: queryToProcess,
          section: currentSection,
          matchFound: true,
          matchScore: localMatch.score,
          matchedEntryId: entryId,
          source: promoted ? "promoted" : "static",
          responseTimeMs: Date.now() - startTime,
          hasSteps: Boolean(localMatch.steps && localMatch.steps.length > 0),
          userType: detectedUserType === "beginner" ? "beginner" : detectedUserType === "owner" || detectedUserType === "accountant" ? "advanced" : "intermediate",
          urgency: detectedUrgency === "critical" || detectedUrgency === "high" ? detectedUrgency : "normal",
          isContextual: localMatch.contextMatch?.isFollowUp || false,
        })

        // ⭐ NUEVO: Registrar query exitosa para aprendizaje
        trackMatchedQuery(
          queryToProcess,
          entryId,
          localMatch.question || "unknown",
          localMatch.score,
          currentSection
        )

        // MEDIUM-TERM OPTIMIZATION #1: Persist in background with offline retry queue
        // Instead of fire-and-forget, use syncQueue for exponential backoff retry
        syncQueue.add("/help/ask", {
          question: text,
          section: currentSection,
          route: pathname,
        }).catch(() => {
          // Still ignore failures - syncQueue will retry up to 5 times
        })
      } else {
        // FASE 3: If offline, use offline search as fallback
        if (isOffline) {
          const startTime = Date.now()
          const offlineResults = await searchOffline(text, currentSection)

          if (offlineResults.length > 0) {
            const topResult = offlineResults[0]
            const assistantMsg: ChatMessage = {
              id: generateUniqueMessageId(),
              role: "assistant",
              content: `📴 **Modo Offline**\n\n${topResult.answer}\n\n_Estás sin conexión. Mostrando información guardada localmente._`,
              source: "static",
              steps: topResult.steps,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            setMascotState("responding")

            // 🧠 TRACK: Offline search with results
            trackInteraction({
              query: queryToProcess,
              section: currentSection,
              matchFound: true,
              matchScore: 0.8, // Approximate score for offline results
              source: "offline",
              responseTimeMs: Date.now() - startTime,
              hasSteps: Boolean(topResult.steps && topResult.steps.length > 0),
            })
          } else {
            const assistantMsg: ChatMessage = {
              id: generateUniqueMessageId(),
              role: "assistant",
              content: "📴 Estás sin conexión y no tengo información guardada sobre eso. Intenta de nuevo cuando tengas internet.",
              source: "static",
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            setMascotState("responding")

            // 🧠 TRACK: Offline search without results
            trackInteraction({
              query: queryToProcess,
              section: currentSection,
              matchFound: false,
              source: "offline",
              responseTimeMs: Date.now() - startTime,
              hasSteps: false,
            })
          }
        } else {
          // Weak or no local match - use backend (semantic embeddings + AI)
          const startTime = Date.now()

          try {
            const res = await authFetch("/help/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: text,
              section: currentSection,
              route: pathname,
            }),
          })

          if (!res.ok) throw new Error("Error al consultar el asistente")

          const data = (await res.json()) as AskResponse
          const assistantMsg: ChatMessage = {
            id: `db-${data.messageId}`,
            role: "assistant",
            content: data.answer,
            source: data.source,
            steps: data.steps,
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, assistantMsg])
          setMascotState("responding")

          // 🧠 TRACK: Backend/AI response
          trackInteraction({
            query: queryToProcess,
            section: currentSection,
            matchFound: true,
            matchedEntryId: `db-${data.messageId}`,
            source: data.source as "ai" | "static" | "promoted",
            responseTimeMs: Date.now() - startTime,
            hasSteps: Boolean(data.steps && data.steps.length > 0),
          })
        } catch {
          // MEDIUM-TERM OPTIMIZATION #1: On failure, add to retry queue for eventual persistence
          syncQueue.add("/help/ask", {
            question: text,
            section: currentSection,
            route: pathname,
          }).catch(() => {/* Queue will retry */})

          // Fallback to local match if backend fails and we have any match
          if (localMatch) {
            const fullAnswer = [
              localMatch.prefix || "",
              localMatch.answer,
              localMatch.quickAction ? `\n\n⚡ **Acción rápida:** ${localMatch.quickAction}` : "",
            ].filter(Boolean).join("")

            const assistantMsg: ChatMessage = {
              id: generateUniqueMessageId(),
              role: "assistant",
              content: fullAnswer,
              source: "static",
              steps: localMatch.steps,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            setMascotState("responding")

            // 🧠 TRACK: Backend error - fallback to local match
            trackInteraction({
              query: queryToProcess,
              section: currentSection,
              matchFound: true,
              matchScore: localMatch.score,
              source: "static",
              responseTimeMs: Date.now() - startTime,
              hasSteps: Boolean(localMatch.steps && localMatch.steps.length > 0),
            })
          } else {
            const assistantMsg: ChatMessage = {
              id: generateUniqueMessageId(),
              role: "assistant",
              content:
                "Lo siento, no pude conectar con el asistente. Intenta de nuevo en unos segundos.",
              source: "static",
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            setMascotState("responding")

            // 🧠 TRACK: Backend error - no fallback
            trackInteraction({
              query: queryToProcess,
              section: currentSection,
              matchFound: false,
              source: "static",
              responseTimeMs: Date.now() - startTime,
              hasSteps: false,
            })
          }
        }
        } // Close the else block for isOffline check
      }

      setTimeout(() => setMascotState("idle"), 2000)
    },
    [currentSection, pathname, isOffline, chatUserId, routeContext, messages],
  )

  const sendFeedback = useCallback(
    async (messageId: string, feedback: "POSITIVE" | "NEGATIVE") => {
      // Update local state immediately
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, feedback } : msg,
        ),
      )

      // 🧠 ADAPTIVE LEARNING: Registrar feedback para mejorar respuestas
      const message = messages.find(m => m.id === messageId)
      if (message && message.role === "assistant") {
        // Encontrar la pregunta del usuario asociada
        const messageIndex = messages.findIndex(m => m.id === messageId)
        const userMessage = messages[messageIndex - 1]

        if (userMessage && userMessage.role === "user") {
          // Promover o degradar la respuesta basándose en feedback
          const entryId = message.id // Usar ID del mensaje como entryId por ahora
          promoteAnswer(entryId, message.content, feedback)

          // 🧠 TRACK: Registrar AMBOS tipos de feedback para análisis
          trackInteraction({
            query: userMessage.content,
            section: currentSection,
            matchFound: true,
            matchScore: feedback === "POSITIVE" ? 0.9 : 0.5,
            matchedEntryId: entryId,
            source: message.source as "static" | "ai" | "promoted" | undefined,
            userFeedback: feedback,
            hasSteps: Boolean(message.steps && message.steps.length > 0),
            isContextual: message.isContextual,
          })
        }
      }

      // Extract numeric ID from "db-123" format
      const numericId = messageId.startsWith("db-")
        ? parseInt(messageId.slice(3), 10)
        : null

      if (numericId) {
        try {
          await authFetch("/help/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: numericId, feedback }),
          })
        } catch {
          // Revert on failure
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, feedback: null } : msg,
            ),
          )
        }
      }
    },
    [messages, currentSection],
  )

  const value = useMemo<HelpAssistantContextType>(
    () => ({
      currentSection,
      routeContext, // DETECCIÓN AUTOMÁTICA: Contexto de ruta completo
      sectionMeta,
      isOpen,
      setIsOpen,
      mascotState,
      messages,
      showProactiveTip,
      dismissTip,
      sendMessage,
      sendFeedback,
      isOffline, // FASE 3: Offline indicator
      // MEDIUM-TERM OPTIMIZATION #2: Pagination
      hasMoreMessages,
      isLoadingMore,
      loadOlderMessages,
    }),
    [
      currentSection,
      routeContext,
      sectionMeta,
      isOpen,
      mascotState,
      messages,
      showProactiveTip,
      dismissTip,
      sendMessage,
      sendFeedback,
      isOffline,
      hasMoreMessages,
      isLoadingMore,
      loadOlderMessages,
    ],
  )

  return (
    <HelpAssistantContext.Provider value={value}>
      {children}
    </HelpAssistantContext.Provider>
  )
}

export function useHelpAssistant() {
  const ctx = useContext(HelpAssistantContext)
  if (!ctx) {
    throw new Error(
      "useHelpAssistant must be used within HelpAssistantProvider",
    )
  }
  return ctx
}
