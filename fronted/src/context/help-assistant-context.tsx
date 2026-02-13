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
import {
  initOfflineDB,
  preloadOfflineData,
  setupOfflineDetection,
  isOnline,
  searchOffline,
} from "@/data/help/offline-support"
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

let messageCounter = 0

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
 */
function matchLocalEnhanced(
  text: string,
  currentSection: string,
  conversationHistory: ChatMessage[],
): {
  answer: string;
  steps?: Array<{ text: string; image?: string }>;
  score: number;
  prefix?: string; // Contextual prefix (empathy, urgency)
  quickAction?: string; // Suggested quick action
  contextMatch?: ContextMatch; // FASE 3: Conversation context
} | null {
  // First try exact courtesy match for instant responses
  const courtesyAnswer = matchCourtesy(text)
  if (courtesyAnswer) {
    return { answer: courtesyAnswer, score: 1.0 }
  }

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

    return {
      answer: formatted.answer,
      steps: formatted.steps,
      score: 0.9, // High confidence for context-based matches
      contextMatch: contextAnalysis,
    }
  }

  // Detect context before matching
  const urgency = detectUrgency(text)
  const userType = detectUserType(text)
  const frustration = detectFrustration(text)

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
      adapted.adaptedAnswer,
      adapted.steps,
      contextAnalysis
    )

    return {
      answer: prefix + formatted.answer,
      steps: formatted.steps,
      score: contextualMatch.confidence,
      prefix,
      quickAction: contextualMatch.quickAction,
      contextMatch: contextAnalysis,
    }
  }

  // Fallback to enhanced matcher with expanded vocabulary
  let results = findMatchingEntries(text, allHelpEntries, 0.6)

  if (results.length === 0) return null

  // PRIORIZACIÓN AUTOMÁTICA: Boost entries de la sección actual
  // Esto hace que respuestas relevantes a la ubicación actual tengan prioridad
  results = prioritizeCurrentSection(results.map(r => ({
    ...r,
    section: r.entry.section
  })), currentSection, 0.15)

  // Re-ordenar por score después del boost
  results.sort((a, b) => b.score - a.score)

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

    return {
      answer: prefix + formatted.answer,
      steps: formatted.steps,
      score: adjustedScore,
      prefix: prefix || undefined,
      contextMatch: contextAnalysis,
    }
  }

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

  const wavingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSectionRef = useRef(currentSection)

  // FASE 3: Initialize offline support on mount
  useEffect(() => {
    // Initialize offline DB
    initOfflineDB().then(() => {
      // Preload help data for offline use
      const { HELP_SECTIONS } = require("@/data/help")
      const allSections: HelpSection[] = HELP_SECTIONS
      const allEntries = allSections.flatMap(s => s.entries)
      preloadOfflineData(allEntries, allSections).catch(console.error)
    }).catch(console.error)

    // Setup offline detection
    const cleanup = setupOfflineDetection(
      () => setIsOffline(false),
      () => setIsOffline(true)
    )

    // Set initial offline state
    setIsOffline(!isOnline())

    return cleanup
  }, [])

  // Load conversation history from backend on mount
  useEffect(() => {
    if (historyLoaded) return

    async function loadHistory() {
      try {
        const res = await authFetch("/help/conversation")
        if (res.ok) {
          const data = (await res.json()) as BackendMessage[]
          if (data.length > 0) {
            setMessages(data.map(backendToChat))
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

  // Proactive tip on section visit + FASE 3: track behavior
  useEffect(() => {
    if (currentSection === prevSectionRef.current) return
    prevSectionRef.current = currentSection

    // FASE 3: Track section visit for behavior analysis
    trackSectionVisit(currentSection)

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
  }, [currentSection])

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

      // Optimistic user message
      const tempId = `local-${++messageCounter}`
      const userMsg: ChatMessage = {
        id: tempId,
        role: "user",
        content: text,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])
      setMascotState("thinking")

      // FIX CRÍTICO: Validar query antes de procesar
      const queryValidation = validateQuery(text)

      // Si es meta-question (sobre el chatbot mismo), responder directamente
      if (isMetaQuestion(text)) {
        const assistantMsg: ChatMessage = {
          id: `local-${++messageCounter}`,
          role: "assistant",
          content: generateMetaResponse(),
          source: "static",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setMascotState("responding")
        setTimeout(() => setMascotState("idle"), 2000)
        return
      }

      // Si la query no es válida (genérica, queja, etc.), usar respuesta sugerida
      if (!queryValidation.isValid && queryValidation.suggestedResponse) {
        const assistantMsg: ChatMessage = {
          id: `local-${++messageCounter}`,
          role: "assistant",
          content: queryValidation.suggestedResponse,
          source: "static",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setMascotState("responding")
        setTimeout(() => setMascotState("idle"), 2000)
        return
      }

      // Fast-path: Enhanced local matching with contextual awareness + conversation memory (instant, no network)
      const localMatch = matchLocalEnhanced(text, currentSection, messages)

      // FIX CRÍTICO: Validar que la respuesta sea relevante
      const responseValidation = localMatch ? validateResponse(
        text,
        localMatch.answer,
        localMatch.score,
        "enhanced"
      ) : null

      // FIX CRÍTICO: Si hay match pero no es relevante, explicar por qué
      if (localMatch && (!responseValidation?.isRelevant || localMatch.score < 0.7)) {
        const assistantMsg: ChatMessage = {
          id: `local-${++messageCounter}`,
          role: "assistant",
          content: generateNoMatchResponse(text, currentSection),
          source: "static",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setMascotState("responding")
        setTimeout(() => setMascotState("idle"), 2000)
        return
      }

      if (localMatch && localMatch.score >= 0.7 && responseValidation?.isRelevant) {
        // Strong local match - respond immediately with contextual adaptation
        const fullAnswer = [
          localMatch.prefix || "",
          localMatch.answer,
          localMatch.quickAction ? `\n\n⚡ **Acción rápida:** ${localMatch.quickAction}` : "",
        ].filter(Boolean).join("")

        const assistantMsg: ChatMessage = {
          id: `local-${++messageCounter}`,
          role: "assistant",
          content: fullAnswer,
          source: "static",
          steps: localMatch.steps,
          timestamp: Date.now(),
          // FASE 3: Mark contextual responses
          isContextual: localMatch.contextMatch?.isFollowUp || false,
          previousTopic: localMatch.contextMatch?.previousTopic,
        }
        setMessages((prev) => [...prev, assistantMsg])
        setMascotState("responding")

        // Persist in background (fire and forget)
        authFetch("/help/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text,
            section: currentSection,
            route: pathname,
          }),
        }).catch(() => {/* ignore */})
      } else {
        // FASE 3: If offline, use offline search as fallback
        if (isOffline) {
          const offlineResults = await searchOffline(text, currentSection)
          if (offlineResults.length > 0) {
            const topResult = offlineResults[0]
            const assistantMsg: ChatMessage = {
              id: `local-${++messageCounter}`,
              role: "assistant",
              content: `📴 **Modo Offline**\n\n${topResult.answer}\n\n_Estás sin conexión. Mostrando información guardada localmente._`,
              source: "static",
              steps: topResult.steps,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            setMascotState("responding")
          } else {
            const assistantMsg: ChatMessage = {
              id: `local-${++messageCounter}`,
              role: "assistant",
              content: "📴 Estás sin conexión y no tengo información guardada sobre eso. Intenta de nuevo cuando tengas internet.",
              source: "static",
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            setMascotState("responding")
          }
        } else {
          // Weak or no local match - use backend (semantic embeddings + AI)
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
        } catch {
          // Fallback to local match if backend fails and we have any match
          if (localMatch) {
            const fullAnswer = [
              localMatch.prefix || "",
              localMatch.answer,
              localMatch.quickAction ? `\n\n⚡ **Acción rápida:** ${localMatch.quickAction}` : "",
            ].filter(Boolean).join("")

            const assistantMsg: ChatMessage = {
              id: `local-${++messageCounter}`,
              role: "assistant",
              content: fullAnswer,
              source: "static",
              steps: localMatch.steps,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            setMascotState("responding")
          } else {
            const assistantMsg: ChatMessage = {
              id: `local-${++messageCounter}`,
              role: "assistant",
              content:
                "Lo siento, no pude conectar con el asistente. Intenta de nuevo en unos segundos.",
              source: "static",
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            setMascotState("responding")
          }
        }
        } // Close the else block for isOffline check
      }

      setTimeout(() => setMascotState("idle"), 2000)
    },
    [currentSection, pathname, isOffline],
  )

  const sendFeedback = useCallback(
    async (messageId: string, feedback: "POSITIVE" | "NEGATIVE") => {
      // Update local state immediately
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, feedback } : msg,
        ),
      )

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
    [],
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
