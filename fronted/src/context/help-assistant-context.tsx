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
import { usePathname, useRouter } from "next/navigation"
import { authFetch } from "@/utils/auth-fetch"
import { parseIntent } from "@/data/help/intents/intent-parser"
import { resolveEntities, type ResolvedProduct } from "@/data/help/tools/entity-resolver"
import { executeTool, getTool } from "@/data/help/tools/tool-registry"
import type { ToolContext } from "@/data/help/tools/tool-types"
import type { ParsedIntent } from "@/data/help/intents/intent-types"
import {
  resolveSection,
  getSectionById,
  type ChatMessage,
  type HelpSection,
} from "@/data/help"
import {
  detectUrgency,
  detectUserType,
  expandQueryWithEntity,
} from "@/data/help/contextual-helper"
import { matchLocalEnhanced } from "@/context/help-local-matcher"
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
  registerBackendSender,
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
  type RouteContext,
} from "@/data/help/route-detection"
import { useChatUserId } from "@/hooks/use-chat-user-id"
import {
  trackUnmatchedQuery,
  trackMatchedQuery,
  getMostAskedUnmatched,
} from "@/data/help/learning-system"
import { autoCorrect } from "@/data/help/fuzzy-matcher"
import { fetchSSE } from "@/lib/sse-fetch"

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
  /** Mascot minimized state — shared so other floating elements can avoid overlap */
  isMascotMinimized: boolean
  setIsMascotMinimized: (minimized: boolean) => void
  /** Tool confirmation handlers */
  confirmToolAction: (messageId: string) => Promise<void>
  cancelToolAction: (messageId: string) => void
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

  // Backend sync is handled by registerBackendSender() in flushPendingSessions()
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
  const router = useRouter()

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
  const [isMascotMinimized, setIsMascotMinimizedRaw] = useState(false)

  // Load minimized state from localStorage on mount (avoids hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem("help-mascot-minimized")
    if (stored === "true") setIsMascotMinimizedRaw(true)
  }, [])

  const setIsMascotMinimized = useCallback((minimized: boolean) => {
    setIsMascotMinimizedRaw(minimized)
    localStorage.setItem("help-mascot-minimized", String(minimized))
  }, [])

  // FASE 2: Get user ID for sentiment analysis tracking
  const chatUserId = useChatUserId()

  const wavingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSectionRef = useRef(currentSection)

  // FASE 3: Initialize offline support + FASE 2: Semantic search on mount
  useEffect(() => {
    // Register backend sender for adaptive learning sessions
    registerBackendSender(async (sessions) => {
      await authFetch("/help/learning/sessions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions }),
      })
    })

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

  // ════════════════════════════════════════════════════════════════════════
  // OPERATIONAL TOOL SYSTEM
  // ════════════════════════════════════════════════════════════════════════

  /** Build tool context for executing tools */
  const buildToolContext = useCallback((): ToolContext => ({
    authFetch,
    organizationId: null, // Resolved automatically by authFetch tenant headers
    companyId: null,
    userId: chatUserId ?? null,
    router,
    currentStoreId: undefined, // TODO: get from tenant context when available
  }), [chatUserId, router])

  /** Execute a tool intent (query = direct, mutation = confirmation card) */
  const executeToolIntent = useCallback(async (
    intent: ParsedIntent,
    userMsgId: string,
  ) => {
    const tool = getTool(intent.intent)
    if (!tool) {
      setMessages(prev => [...prev, {
        id: generateUniqueMessageId(),
        role: "assistant",
        content: "No encontré la herramienta para esa acción.",
        source: "tool",
        timestamp: Date.now(),
        toolResult: { type: "error", title: "Error", message: "Herramienta no disponible" },
      }])
      setMascotState("responding")
      setTimeout(() => setMascotState("idle"), 2000)
      return
    }

    // Resolve entities (product names → IDs, etc.)
    const resolvedEntities = await resolveEntities(intent.entities, authFetch)

    // Build params from resolved entities
    const params: Record<string, unknown> = {}
    for (const entity of resolvedEntities) {
      if (entity.type === "product" && entity.resolved) {
        const p = entity.resolved as ResolvedProduct
        params.productId = p.id
        params.productName = p.name
        params.price = p.priceSell || p.price
      } else if (entity.type === "client" && entity.resolved) {
        const c = entity.resolved as { id: number; name: string }
        params.clientId = c.id
      } else if (entity.type === "quantity") {
        params.quantity = entity.value
      } else if (entity.type === "period") {
        params.period = entity.value
      } else if (entity.type === "section") {
        params.section = entity.raw
      } else if (entity.type === "product" && !entity.resolved) {
        // Product not found — use raw text as search query
        params.query = entity.raw
      }
    }

    // MUTATION: Show confirmation card first
    if (tool.type === "mutation") {
      const productName = params.productName ?? params.query ?? "?"
      const quantity = params.quantity ?? "?"

      // Check if product was resolved
      if (intent.entities.some(e => e.type === "product") && !params.productId) {
        setMessages(prev => [...prev, {
          id: generateUniqueMessageId(),
          role: "assistant",
          content: `No encontré un producto que coincida con "${params.query ?? ""}". Intenta con un nombre más específico.`,
          source: "tool",
          timestamp: Date.now(),
          toolResult: { type: "error", title: "Producto no encontrado", message: "Intenta con otro nombre" },
        }])
        setMascotState("responding")
        setTimeout(() => setMascotState("idle"), 2000)
        return
      }

      const confirmationFields = [
        ...(params.productName ? [{ label: "Producto", value: String(params.productName) }] : []),
        ...(params.quantity != null ? [{ label: "Cantidad", value: String(params.quantity) }] : []),
        ...(params.price != null ? [{ label: "Precio", value: `S/ ${Number(params.price).toFixed(2)}` }] : []),
      ]

      const confirmMsg: ChatMessage = {
        id: generateUniqueMessageId(),
        role: "assistant",
        content: `Confirma la acción: ${tool.name}`,
        source: "tool",
        timestamp: Date.now(),
        toolConfirmation: {
          toolId: tool.id,
          title: tool.name,
          description: `${quantity}x ${productName}`,
          fields: confirmationFields,
          params,
        },
      }
      setMessages(prev => [...prev, confirmMsg])
      setMascotState("responding")
      return
    }

    // QUERY or NAVIGATION: Execute directly
    const ctx = buildToolContext()
    const result = await executeTool(tool.id, params, ctx)

    const assistantMsg: ChatMessage = {
      id: generateUniqueMessageId(),
      role: "assistant",
      content: result.message ?? result.title,
      source: "tool",
      timestamp: Date.now(),
      toolResult: {
        type: result.type as "table" | "stats" | "message" | "navigation" | "error",
        title: result.title,
        data: result.data,
        message: result.message,
      },
    }
    setMessages(prev => [...prev, assistantMsg])
    setMascotState("responding")
    setTimeout(() => setMascotState("idle"), 2000)
  }, [buildToolContext])

  /** Confirm a pending mutation (called from ToolConfirmationCard) */
  const confirmToolAction = useCallback(async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId)
    if (!msg?.toolConfirmation) return

    const { toolId, params } = msg.toolConfirmation
    const ctx = buildToolContext()
    const result = await executeTool(toolId, params, ctx)

    // Update the confirmation message with resolved state
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? {
            ...m,
            toolConfirmation: {
              ...m.toolConfirmation!,
              resolved: true,
              resolvedMessage: result.success
                ? result.message ?? "Acción completada"
                : `Error: ${result.message}`,
            },
          }
        : m,
    ))
    setMascotState("responding")
    setTimeout(() => setMascotState("idle"), 2000)
  }, [messages, buildToolContext])

  /** Cancel a pending mutation */
  const cancelToolAction = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? {
            ...m,
            toolConfirmation: {
              ...m.toolConfirmation!,
              resolved: true,
              resolvedMessage: "Acción cancelada",
            },
          }
        : m,
    ))
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

      // ═══ OPERATIONAL INTENT DETECTION (runs BEFORE Q&A pipeline) ═══
      try {
        const intent = parseIntent(text, currentSection)
        if (intent) {
          console.log("[CHATBOT] Operational intent detected:", intent.intent, "confidence:", intent.confidence)
          await executeToolIntent(intent, tempId)
          return // Skip Q&A pipeline entirely
        }
      } catch (err) {
        console.error("[CHATBOT] Intent parser error (falling through to Q&A):", err)
        // Fall through to Q&A pipeline on error
      }

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

        // FASE 2: Intentar búsqueda semántica como fallback (threshold bajado para capturar más)
        const semanticResults = semanticSearch(queryToProcess, 3, 0.30)
        console.log("[CHATBOT DEBUG] Semantic search results:", semanticResults.map(r => ({
          id: r.entry.id,
          question: r.entry.question,
          score: r.score
        })))

        if (semanticResults.length > 0 && semanticResults[0].score >= 0.40) {
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

        // Si semantic search tiene resultados parciales (0.30-0.40), ofrecer "¿Quisiste decir?"
        const partialSuggestions = semanticResults
          .filter(r => r.score >= 0.30)
          .slice(0, 3)
          .map(r => r.entry.question)

        let noMatchContent: string
        if (partialSuggestions.length > 0) {
          noMatchContent = `No encontré una respuesta exacta, pero quizás te refieres a:\n\n${partialSuggestions.map(q => `• ${q}`).join('\n')}\n\n_Intenta reformular tu pregunta o haz clic en una sugerencia del panel._`
        } else {
          noMatchContent = generateNoMatchResponse(text, currentSection)
        }

        const assistantMsg: ChatMessage = {
          id: generateUniqueMessageId(),
          role: "assistant",
          content: noMatchContent,
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
          // Weak or no local match - use backend with SSE streaming
          const startTime = Date.now()
          const streamMsgId = generateUniqueMessageId()

          // Create a placeholder streaming message
          const streamingMsg: ChatMessage = {
            id: streamMsgId,
            role: "assistant",
            content: "",
            source: "ai",
            timestamp: Date.now(),
            isStreaming: true,
          }
          setMessages((prev) => [...prev, streamingMsg])

          try {
            await new Promise<void>((resolve, reject) => {
              const abortCtrl = fetchSSE(
                "/help/ask/stream",
                { question: text, section: currentSection, route: pathname },
                {
                  onChunk: (chunkText) => {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamMsgId
                          ? { ...msg, content: msg.content + chunkText }
                          : msg,
                      ),
                    )
                    setMascotState("responding")
                  },
                  onDone: (data) => {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamMsgId
                          ? {
                              ...msg,
                              id: `db-${data.messageId}`,
                              content: data.fullText || msg.content,
                              source: data.source as "ai" | "static" | "promoted",
                              isStreaming: false,
                            }
                          : msg,
                      ),
                    )
                    setMascotState("responding")

                    trackInteraction({
                      query: queryToProcess,
                      section: currentSection,
                      matchFound: true,
                      matchedEntryId: `db-${data.messageId}`,
                      source: data.source as "ai" | "static" | "promoted",
                      responseTimeMs: Date.now() - startTime,
                      hasSteps: false,
                    })
                    resolve()
                  },
                  onMessage: (data) => {
                    // Non-streamed response (static/promoted from embeddings)
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamMsgId
                          ? {
                              ...msg,
                              id: `db-${data.messageId}`,
                              content: data.answer,
                              source: data.source as "ai" | "static" | "promoted",
                              isStreaming: false,
                            }
                          : msg,
                      ),
                    )
                    setMascotState("responding")

                    trackInteraction({
                      query: queryToProcess,
                      section: currentSection,
                      matchFound: true,
                      matchedEntryId: `db-${data.messageId}`,
                      source: data.source as "ai" | "static" | "promoted",
                      responseTimeMs: Date.now() - startTime,
                      hasSteps: false,
                    })
                    resolve()
                  },
                  onError: (error) => {
                    reject(new Error(error))
                  },
                },
              )

              // Timeout: abort after 30 seconds
              setTimeout(() => {
                abortCtrl.abort()
                reject(new Error("Stream timeout"))
              }, 30_000)
            })
          } catch {
            // Remove the streaming placeholder if it has no content
            setMessages((prev) => {
              const streamMsg = prev.find((m) => m.id === streamMsgId)
              if (streamMsg && !streamMsg.content) {
                // Remove empty streaming msg and try fallback
                return prev.filter((m) => m.id !== streamMsgId)
              }
              // If it has partial content, keep it and mark as done
              return prev.map((m) =>
                m.id === streamMsgId ? { ...m, isStreaming: false } : m,
              )
            })

            // Fallback: try non-streaming endpoint
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

              if (res.ok) {
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

                trackInteraction({
                  query: queryToProcess,
                  section: currentSection,
                  matchFound: true,
                  matchedEntryId: `db-${data.messageId}`,
                  source: data.source as "ai" | "static" | "promoted",
                  responseTimeMs: Date.now() - startTime,
                  hasSteps: Boolean(data.steps && data.steps.length > 0),
                })
              } else {
                throw new Error("Non-streaming fallback failed")
              }
            } catch {
              // Final fallback: local match or generic error
              if (localMatch) {
                const fullAnswer = [
                  localMatch.prefix || "",
                  localMatch.answer,
                  localMatch.quickAction ? `\n\n⚡ **Acción rápida:** ${localMatch.quickAction}` : "",
                ].filter(Boolean).join("")

                setMessages((prev) => [...prev, {
                  id: generateUniqueMessageId(),
                  role: "assistant" as const,
                  content: fullAnswer,
                  source: "static" as const,
                  steps: localMatch.steps,
                  timestamp: Date.now(),
                }])
              } else {
                setMessages((prev) => [...prev, {
                  id: generateUniqueMessageId(),
                  role: "assistant" as const,
                  content: "Lo siento, no pude conectar con el asistente. Intenta de nuevo en unos segundos.",
                  source: "static" as const,
                  timestamp: Date.now(),
                }])
              }
              setMascotState("responding")

              trackInteraction({
                query: queryToProcess,
                section: currentSection,
                matchFound: Boolean(localMatch),
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
      isMascotMinimized,
      setIsMascotMinimized,
      confirmToolAction,
      cancelToolAction,
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
      isMascotMinimized,
      setIsMascotMinimized,
      confirmToolAction,
      cancelToolAction,
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
