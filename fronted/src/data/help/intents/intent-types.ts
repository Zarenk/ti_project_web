/**
 * Tipos para el sistema de intención operacional del chatbot.
 * Permite clasificar mensajes como acciones ejecutables vs preguntas Q&A.
 */

export interface ParsedEntity {
  type: "product" | "client" | "store" | "quantity" | "amount" | "period" | "date" | "section"
  raw: string
  value?: unknown
  resolved?: unknown
}

export interface ParsedIntent {
  intent: string
  entities: ParsedEntity[]
  confidence: number
  originalText: string
  type: "query" | "mutation" | "navigation"
}

export interface OperationalIntentPattern {
  intent: string
  patterns: RegExp[]
  entitySlots: string[]
  type: "query" | "mutation" | "navigation"
  requiredEntities?: string[]
  section?: string
}
