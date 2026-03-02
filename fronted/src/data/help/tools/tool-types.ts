/**
 * Tipos para el registro de herramientas del chatbot operacional.
 * Cada ChatTool es una acción que el chatbot puede ejecutar (query, mutation, navigation).
 */

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

export interface ChatTool {
  id: string
  name: string
  description: string
  type: "query" | "mutation" | "navigation"
  parameters: ToolParameter[]
  requiredPermissions?: string[]
  execute: (
    params: Record<string, unknown>,
    context: ToolContext,
  ) => Promise<ToolResult>
}

export interface ToolParameter {
  name: string
  type: "number" | "string" | "date" | "boolean"
  required: boolean
  description: string
}

export interface ToolContext {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>
  organizationId: number | null
  companyId: number | null
  userId: number | null
  router: AppRouterInstance
  currentStoreId?: number
}

export interface ToolResult {
  success: boolean
  type: "table" | "stats" | "confirmation" | "navigation" | "message" | "error"
  title: string
  data?: unknown
  message?: string
  navigateTo?: string
}

export interface ToolConfirmationData {
  toolId: string
  title: string
  description: string
  fields: { label: string; value: string }[]
  params: Record<string, unknown>
}

export interface ToolTableData {
  summary?: { count: number; total?: number }
  rows: Record<string, unknown>[]
  columns: string[]
}

export interface ToolStatsData {
  cards: { label: string; value: number; format: "number" | "currency" | "percentage" }[]
}
