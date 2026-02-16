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
  source?: "static" | "ai" | "promoted"
  feedback?: "POSITIVE" | "NEGATIVE" | null
  steps?: HelpStep[]
  timestamp: number
  /** FASE 3: Indicates if this message used conversation context */
  isContextual?: boolean
  previousTopic?: string
  /** Indicates if this is a system message (section change, separator, etc.) */
  isSystemMessage?: boolean
}
