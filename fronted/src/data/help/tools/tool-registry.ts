/**
 * Registro central de herramientas del chatbot.
 * Centraliza la ejecución y búsqueda de tools por ID.
 */

import type { ChatTool, ToolContext, ToolResult } from "./tool-types"
import { saleTools } from "./tools/sale-tools"
import { inventoryTools } from "./tools/inventory-tools"
import { cashregisterTools } from "./tools/cashregister-tools"
import { statsTools } from "./tools/stats-tools"
import { navigationTools } from "./tools/navigation-tools"

const ALL_TOOLS: ChatTool[] = [
  ...saleTools,
  ...inventoryTools,
  ...cashregisterTools,
  ...statsTools,
  ...navigationTools,
]

const toolMap = new Map(ALL_TOOLS.map(t => [t.id, t]))

export function getTool(id: string): ChatTool | undefined {
  return toolMap.get(id)
}

export function getAllTools(): ChatTool[] {
  return ALL_TOOLS
}

export async function executeTool(
  toolId: string,
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const tool = toolMap.get(toolId)
  if (!tool) {
    return {
      success: false,
      type: "error",
      title: "Error",
      message: "Herramienta no encontrada",
    }
  }

  try {
    return await tool.execute(params, context)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al ejecutar la acción"
    return { success: false, type: "error", title: "Error", message }
  }
}
