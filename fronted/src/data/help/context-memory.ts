import type { ChatMessage, HelpEntry } from "./types"

/**
 * FASE 3.1: Context Memory System
 *
 * Provides conversation memory and context-aware matching:
 * - Detects follow-up questions ("y eso cómo lo hago?", "y luego?")
 * - References previous questions in responses
 * - Maintains conversation continuity
 */

export interface ContextMatch {
  isFollowUp: boolean
  previousTopic?: string
  previousEntry?: HelpEntry
  relatedEntries: HelpEntry[]
  contextPrefix?: string
}

/** Patterns that indicate a follow-up question */
const FOLLOW_UP_PATTERNS = [
  /^(y|pero|entonces|luego|despues|y\s+luego|y\s+despues|y\s+entonces)\s+/i,
  /^(eso|esto|lo)\s+(como|c[oó]mo|donde|d[oó]nde|cuando|cu[aá]ndo|por\s+qu[eé])/i,
  /^(como|c[oó]mo)\s+(lo|la|los|las|eso|esto)/i,
  /^(donde|d[oó]nde)\s+(est[aá]|esta|encuentro|veo|lo\s+veo)/i,
  /^(qu[eé]|que)\s+(es|significa|quiere\s+decir|pasa\s+si)/i,
  /^(y\s+si|y\s+qu[eé]\s+pasa|y\s+que\s+pasa|que\s+pasa\s+si)/i,
  /^(cu[aá]l|cual|cuales|cu[aá]les)\s+(de|es|son)/i,
  /^(tambi[eé]n|tambien|adem[aá]s|ademas)/i,
]

/** Patterns that indicate continuity ("next step" type questions) */
const CONTINUITY_PATTERNS = [
  /^(siguiente|pr[oó]ximo|despu[eé]s|luego)\s+(paso|opci[oó]n)/i,
  /^(y\s+ahora|ahora)\s+(qu[eé]|que|como|c[oó]mo)/i,
  /^(ya\s+)?hice\s+eso/i,
  /^qu[eé]\s+m[aá]s/i,
]

/** Extract the core topic from a question */
function extractTopic(question: string): string {
  // Remove common question words to get the core topic
  return question
    .toLowerCase()
    .replace(/^(como|c[oó]mo|donde|d[oó]nde|cuando|cu[aá]ndo|por\s+qu[eé]|qu[eé]|que|cual|cu[aá]l)\s+/i, "")
    .replace(/\?$/,

 "")
    .trim()
}

/** Check if a question is a follow-up to the previous conversation */
export function isFollowUpQuestion(query: string): boolean {
  const normalized = query.trim().toLowerCase()

  // Check follow-up patterns
  if (FOLLOW_UP_PATTERNS.some(pattern => pattern.test(normalized))) {
    return true
  }

  // Check continuity patterns
  if (CONTINUITY_PATTERNS.some(pattern => pattern.test(normalized))) {
    return true
  }

  // Very short questions often indicate follow-up (e.g., "y eso?", "cómo?")
  if (normalized.length < 15 && /^(y|pero|entonces)\s/.test(normalized)) {
    return true
  }

  return false
}

/**
 * Analyze conversation context using sliding window with weighted messages
 * Recent messages have more weight than older ones
 */
export function analyzeConversationContext(
  query: string,
  conversationHistory: ChatMessage[],
  allEntries: HelpEntry[]
): ContextMatch {
  const isFollowUp = isFollowUpQuestion(query)

  if (!isFollowUp || conversationHistory.length === 0) {
    return {
      isFollowUp: false,
      relatedEntries: [],
    }
  }

  // Use sliding window of last 5 messages with decreasing weights
  const WINDOW_SIZE = 5
  const WEIGHTS = [0.10, 0.15, 0.20, 0.25, 0.30] // More recent = more weight

  // Get last N user messages
  const recentUserMessages = conversationHistory
    .filter(msg => msg.role === "user")
    .slice(-WINDOW_SIZE)

  if (recentUserMessages.length === 0) {
    return {
      isFollowUp: true,
      relatedEntries: [],
    }
  }

  // Extract topics from recent messages with weights
  const topicScores = new Map<string, number>()
  const contextTopics = new Set<string>()

  recentUserMessages.forEach((msg, idx) => {
    const topic = extractTopic(msg.content)
    if (topic && topic.length > 3) {
      contextTopics.add(topic)

      // Apply weight based on position (newer = higher weight)
      const weight = WEIGHTS[idx] || 0.10
      const currentScore = topicScores.get(topic) || 0
      topicScores.set(topic, currentScore + weight)
    }
  })

  // Get most relevant topic (highest weighted score)
  let previousTopic: string | undefined
  let maxScore = 0

  topicScores.forEach((score, topic) => {
    if (score > maxScore) {
      maxScore = score
      previousTopic = topic
    }
  })

  // Find related entries based on weighted context
  let relatedEntries: HelpEntry[] = []
  let previousEntry: HelpEntry | undefined

  if (previousTopic) {
    // Find the entry that matches the most relevant topic
    previousEntry = allEntries.find(entry => {
      const normalizedQuestion = entry.question.toLowerCase()
      return normalizedQuestion.includes(previousTopic!) ||
        entry.aliases.some(alias => alias.toLowerCase().includes(previousTopic!))
    })

    // Get related entries using relatedActions
    if (previousEntry?.relatedActions) {
      relatedEntries = allEntries.filter(entry =>
        previousEntry?.relatedActions?.includes(entry.id)
      )
    }

    // Also find entries matching any of the context topics
    const contextMatches = allEntries.filter(entry => {
      const entryText = (entry.question + ' ' + entry.aliases.join(' ')).toLowerCase()
      return Array.from(contextTopics).some(topic => entryText.includes(topic))
    })

    // Merge and deduplicate
    relatedEntries = Array.from(new Set([...relatedEntries, ...contextMatches]))
  }

  // Generate contextual prefix with confidence
  let contextPrefix: string | undefined
  if (previousTopic) {
    const confidence = Math.round(maxScore * 100)
    contextPrefix = `📌 *Relacionado con "${previousTopic}" (confianza: ${confidence}%)*\n\n`
  }

  return {
    isFollowUp: true,
    previousTopic,
    previousEntry,
    relatedEntries,
    contextPrefix,
  }
}

/** Get conversation summary for display */
export function getConversationSummary(
  conversationHistory: ChatMessage[]
): {
  totalQuestions: number
  topicsDiscussed: string[]
  lastTopic?: string
} {
  const userMessages = conversationHistory.filter(msg => msg.role === "user")
  const topics = userMessages.map(msg => extractTopic(msg.content)).filter(t => t.length > 3)

  // Deduplicate topics
  const uniqueTopics = Array.from(new Set(topics))

  return {
    totalQuestions: userMessages.length,
    topicsDiscussed: uniqueTopics.slice(-5), // Last 5 unique topics
    lastTopic: topics[topics.length - 1],
  }
}

/** Enhanced search that considers conversation context */
export function contextAwareSearch(
  query: string,
  allEntries: HelpEntry[],
  conversationHistory: ChatMessage[],
  currentSection: string
): {
  entries: HelpEntry[]
  context: ContextMatch
  searchStrategy: "follow-up" | "context-aware" | "standard"
} {
  const context = analyzeConversationContext(query, conversationHistory, allEntries)

  // Strategy 1: Follow-up question - prioritize related entries
  if (context.isFollowUp && context.relatedEntries.length > 0) {
    return {
      entries: context.relatedEntries,
      context,
      searchStrategy: "follow-up",
    }
  }

  // Strategy 2: Context-aware - boost entries from previous topics
  if (context.previousTopic) {
    const topicKeywords = context.previousTopic.split(/\s+/).filter(w => w.length > 3)
    const contextBoosted = allEntries
      .map(entry => {
        let boost = 0
        const entryText = `${entry.question} ${entry.answer}`.toLowerCase()

        // Boost if entry contains previous topic keywords
        topicKeywords.forEach(keyword => {
          if (entryText.includes(keyword)) boost += 0.2
        })

        return { entry, boost }
      })
      .filter(item => item.boost > 0)
      .sort((a, b) => b.boost - a.boost)
      .map(item => item.entry)

    if (contextBoosted.length > 0) {
      return {
        entries: contextBoosted.slice(0, 5),
        context,
        searchStrategy: "context-aware",
      }
    }
  }

  // Strategy 3: Standard search (fallback)
  return {
    entries: [],
    context,
    searchStrategy: "standard",
  }
}

/** Format response with context awareness */
export function formatContextAwareResponse(
  answer: string,
  steps: Array<{ text: string; image?: string }> | undefined,
  context: ContextMatch
): {
  answer: string
  steps?: Array<{ text: string; image?: string }>
} {
  let finalAnswer = answer

  // Add contextual prefix if available
  if (context.contextPrefix) {
    finalAnswer = context.contextPrefix + answer
  }

  // Add "next steps" hint if this was a follow-up
  if (context.isFollowUp && context.relatedEntries.length > 1) {
    const otherRelated = context.relatedEntries
      .slice(0, 3)
      .map(e => `• ${e.question}`)
      .join("\n")

    finalAnswer += `\n\n💡 **También podrías necesitar:**\n${otherRelated}`
  }

  return {
    answer: finalAnswer,
    steps,
  }
}
