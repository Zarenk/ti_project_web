import type { HelpEntry } from "./types"

/**
 * FASE 3.2: Proactive Suggestions System
 *
 * Tracks user behavior and suggests help proactively:
 * - Time spent on sections
 * - Repeated visits to the same page
 * - Common question patterns
 * - "People who asked X also looked at Y"
 */

interface UserBehaviorData {
  sectionVisits: Record<string, number>
  sectionTimeSpent: Record<string, number>
  lastSectionEntry: Record<string, number>
  questionsAsked: string[]
  strugglingIndicators: number
}

const BEHAVIOR_STORAGE_KEY = "help-user-behavior"
const STRUGGLE_THRESHOLD = 3 // Return to same section 3+ times suggests struggle
const TIME_THRESHOLD_MS = 120_000 // 2 minutes in a section suggests need for help

/** Load user behavior data from localStorage */
export function loadUserBehavior(): UserBehaviorData {
  try {
    const stored = localStorage.getItem(BEHAVIOR_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as UserBehaviorData
    }
  } catch {
    // Ignore parse errors
  }

  return {
    sectionVisits: {},
    sectionTimeSpent: {},
    lastSectionEntry: {},
    questionsAsked: [],
    strugglingIndicators: 0,
  }
}

/** Save user behavior data to localStorage */
export function saveUserBehavior(data: UserBehaviorData): void {
  try {
    localStorage.setItem(BEHAVIOR_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

/** Track section visit */
export function trackSectionVisit(section: string): void {
  const behavior = loadUserBehavior()
  const now = Date.now()

  // Update visit count
  behavior.sectionVisits[section] = (behavior.sectionVisits[section] || 0) + 1

  // Calculate time spent in previous section
  for (const [prevSection, entryTime] of Object.entries(behavior.lastSectionEntry)) {
    if (prevSection !== section) {
      const timeSpent = now - entryTime
      behavior.sectionTimeSpent[prevSection] = (behavior.sectionTimeSpent[prevSection] || 0) + timeSpent
    }
  }

  // Record entry time for current section
  behavior.lastSectionEntry[section] = now

  // Detect struggling (returning to same section multiple times)
  if (behavior.sectionVisits[section] >= STRUGGLE_THRESHOLD) {
    behavior.strugglingIndicators++
  }

  saveUserBehavior(behavior)
}

/** Track question asked */
export function trackQuestionAsked(question: string): void {
  const behavior = loadUserBehavior()

  // Add to questions list (keep last 50)
  behavior.questionsAsked.push(question)
  if (behavior.questionsAsked.length > 50) {
    behavior.questionsAsked.shift()
  }

  saveUserBehavior(behavior)
}

/** Check if user is struggling in current section */
export function isUserStruggling(section: string): boolean {
  const behavior = loadUserBehavior()

  // Multiple visits to same section
  if (behavior.sectionVisits[section] >= STRUGGLE_THRESHOLD) {
    return true
  }

  // Long time spent in section
  const timeSpent = behavior.sectionTimeSpent[section] || 0
  if (timeSpent > TIME_THRESHOLD_MS) {
    return true
  }

  return false
}

/** Get proactive suggestion for current section */
export function getProactiveSuggestion(
  section: string,
  allEntries: HelpEntry[]
): {
  suggestion: string
  entry?: HelpEntry
  reason: "struggle" | "time" | "common" | "related"
} | null {
  const behavior = loadUserBehavior()

  // Reason 1: User is struggling (multiple visits)
  if (behavior.sectionVisits[section] >= STRUGGLE_THRESHOLD) {
    const sectionEntries = allEntries.filter(entry =>
      entry.route?.includes(section) || entry.keywords?.includes(section)
    )

    if (sectionEntries.length > 0) {
      const topEntry = sectionEntries[0]
      return {
        suggestion: `Veo que has visitado esta sección ${behavior.sectionVisits[section]} veces. ¿Necesitas ayuda con algo en particular?`,
        entry: topEntry,
        reason: "struggle",
      }
    }
  }

  // Reason 2: User has spent significant time
  const now = Date.now()
  const entryTime = behavior.lastSectionEntry[section]
  if (entryTime && (now - entryTime) > TIME_THRESHOLD_MS) {
    const sectionEntries = allEntries.filter(entry =>
      entry.route?.includes(section) || entry.keywords?.includes(section)
    )

    if (sectionEntries.length > 0) {
      const topEntry = sectionEntries[0]
      return {
        suggestion: `¿Necesitas ayuda? Llevas un tiempo en esta sección. Puedo ayudarte con lo que necesites.`,
        entry: topEntry,
        reason: "time",
      }
    }
  }

  // Reason 3: First time in a complex section
  if (!behavior.sectionVisits[section] || behavior.sectionVisits[section] === 1) {
    const complexSections = ["accounting", "entries", "tenancy", "sales", "inventory"]

    if (complexSections.includes(section)) {
      const sectionEntries = allEntries.filter(entry =>
        entry.route?.includes(section) || entry.keywords?.includes(section)
      )

      if (sectionEntries.length > 0) {
        const topEntry = sectionEntries[0]
        return {
          suggestion: `¡Bienvenido a ${getSectionName(section)}! Esta es una sección con varias funcionalidades. ¿Quieres que te muestre por dónde empezar?`,
          entry: topEntry,
          reason: "common",
        }
      }
    }
  }

  return null
}

/** Get section display name */
function getSectionName(section: string): string {
  const names: Record<string, string> = {
    accounting: "Contabilidad",
    entries: "Ingresos de Mercadería",
    tenancy: "Organizaciones",
    sales: "Ventas",
    inventory: "Inventario",
    products: "Productos",
    users: "Usuarios",
    providers: "Proveedores",
    categories: "Categorías",
    stores: "Tiendas",
    quotes: "Cotizaciones",
    cashregister: "Caja",
    messages: "Mensajes",
    orders: "Pedidos",
    catalog: "Catálogo",
  }

  return names[section] || section
}

/** Get "people also asked" suggestions based on question patterns */
export function getPeopleAlsoAsked(
  currentQuestion: string,
  allEntries: HelpEntry[]
): HelpEntry[] {
  const behavior = loadUserBehavior()

  // Find common co-occurring questions from behavior data
  const recentQuestions = behavior.questionsAsked.slice(-10)

  // Normalize current question
  const normalizedCurrent = normalizeForMatching(currentQuestion)

  // Find questions that were asked in similar contexts
  const relatedQuestions: string[] = []
  for (let i = 0; i < recentQuestions.length - 1; i++) {
    const question = recentQuestions[i]
    const nextQuestion = recentQuestions[i + 1]

    if (normalizeForMatching(question).includes(normalizedCurrent) ||
        normalizedCurrent.includes(normalizeForMatching(question))) {
      relatedQuestions.push(nextQuestion)
    }
  }

  // Find entries matching related questions
  const relatedEntries: HelpEntry[] = []
  for (const relatedQ of relatedQuestions) {
    const entry = allEntries.find(e =>
      normalizeForMatching(e.question).includes(normalizeForMatching(relatedQ)) ||
      e.aliases.some(alias => normalizeForMatching(alias).includes(normalizeForMatching(relatedQ)))
    )

    if (entry && !relatedEntries.some(e => e.id === entry.id)) {
      relatedEntries.push(entry)
    }
  }

  return relatedEntries.slice(0, 3)
}

/** Normalize text for matching */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
}

/** Get suggested next steps based on current context */
export function getSuggestedNextSteps(
  section: string,
  lastQuestionAsked: string | null,
  allEntries: HelpEntry[]
): HelpEntry[] {
  // Common workflow patterns
  const workflowPatterns: Record<string, string[]> = {
    products: ["products-create", "products-images", "products-specs", "products-price"],
    sales: ["sales-create", "sales-payment", "sales-invoice", "sales-print"],
    entries: ["entries-create", "entries-pdf", "entries-provider", "entries-draft"],
    inventory: ["inventory-view", "inventory-filter", "inventory-alert", "inventory-transfer"],
    accounting: ["accounting-create-entry", "accounting-journal", "accounting-ledger", "accounting-trial-balance"],
  }

  const workflow = workflowPatterns[section]
  if (!workflow) return []

  // Find current step if question was asked
  let currentStepIndex = -1
  if (lastQuestionAsked) {
    const matchedEntry = allEntries.find(entry =>
      entry.question.toLowerCase().includes(lastQuestionAsked.toLowerCase()) ||
      entry.aliases.some(alias => alias.toLowerCase().includes(lastQuestionAsked.toLowerCase()))
    )

    if (matchedEntry) {
      currentStepIndex = workflow.indexOf(matchedEntry.id)
    }
  }

  // Suggest next step in workflow
  const nextStepIds = currentStepIndex >= 0
    ? workflow.slice(currentStepIndex + 1, currentStepIndex + 3)
    : workflow.slice(0, 2)

  return allEntries.filter(entry => nextStepIds.includes(entry.id))
}

/** Generate proactive tip message */
export function generateProactiveTipMessage(section: string): string {
  const tips: Record<string, string> = {
    accounting: "💡 ¿Sabías que puedes importar asientos contables desde Excel? Pregúntame cómo.",
    sales: "💡 Consejo: Puedes usar F2 para agregar productos rápidamente en una venta.",
    products: "💡 Tip: Sube múltiples imágenes de producto para que tus clientes vean más detalles.",
    inventory: "💡 Configura alertas de stock bajo para que te notifiquen automáticamente.",
    entries: "💡 Puedes importar facturas PDF para crear ingresos automáticamente.",
    quotes: "💡 Las cotizaciones se pueden convertir en ventas con un solo clic.",
    tenancy: "💡 Cada organización puede tener su propio esquema de productos personalizado.",
  }

  return tips[section] || "💡 ¿Necesitas ayuda con algo? Estoy aquí para asistirte."
}

/** Analytics: Get most common questions */
export function getMostCommonQuestions(limit: number = 5): Array<{ question: string; count: number }> {
  const behavior = loadUserBehavior()

  const questionCounts: Record<string, number> = {}
  for (const question of behavior.questionsAsked) {
    const normalized = normalizeForMatching(question)
    questionCounts[normalized] = (questionCounts[normalized] || 0) + 1
  }

  return Object.entries(questionCounts)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Clear user behavior data (for testing or reset) */
export function clearUserBehavior(): void {
  try {
    localStorage.removeItem(BEHAVIOR_STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}
