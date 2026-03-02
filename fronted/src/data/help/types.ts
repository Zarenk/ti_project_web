export interface HelpStep {
  text: string
  image?: string
}

export interface HelpEntry {
  id: string
  question: string
  aliases: string[]
  answer: string
  keywords?: string[]
  steps?: HelpStep[]
  relatedActions?: string[]
  route?: string
  roles?: string[]
}

export interface HelpSection {
  id: string
  label: string
  description: string
  welcomeMessage: string
  quickActions: string[]
  entries: HelpEntry[]
}

export interface HelpSearchResult {
  entry: HelpEntry
  score: number
  sectionId: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  source?: "static" | "ai" | "promoted" | "tool" | "cache" | "semantic" | "offline" | "prerequisite"
  feedback?: "POSITIVE" | "NEGATIVE" | null
  steps?: HelpStep[]
  timestamp: number
  /** FASE 3: Indicates if this message used conversation context */
  isContextual?: boolean
  previousTopic?: string
  /** Indicates if this is a system message (section change, separator, etc.) */
  isSystemMessage?: boolean
  /** Indicates if AI is currently streaming this message */
  isStreaming?: boolean
  /** Tool execution: result data from a query or mutation */
  toolResult?: ChatToolResult
  /** Tool execution: pending confirmation for a mutation */
  toolConfirmation?: ChatToolConfirmation
}

export interface ChatToolResult {
  type: "table" | "stats" | "message" | "navigation" | "error"
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
  message?: string
}

export interface ChatToolConfirmation {
  toolId: string
  title: string
  description: string
  fields: { label: string; value: string }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>
  resolved?: boolean
  resolvedMessage?: string
}
