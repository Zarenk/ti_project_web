/**
 * FASE 1 - MEJORA #5: Sistema de Detección de Pre-Requisitos
 *
 * Detecta cuando un usuario intenta realizar una acción que requiere
 * pasos previos completados, y le sugiere automáticamente qué hacer primero.
 *
 * Ejemplo: Usuario quiere hacer una venta pero no tiene productos creados
 */

export interface Prerequisite {
  /** ID de la acción que requiere pre-requisitos */
  actionId: string
  /** IDs de las acciones que deben completarse primero */
  requires: string[]
  /** Mensaje amigable explicando qué falta */
  message: string
  /** Pregunta para guiar proactivamente */
  autoSuggest: string
  /** Prioridad de las sugerencias (0 = más importante) */
  priority?: number
}

/**
 * Mapa de pre-requisitos por acción
 */
export const PREREQUISITES_MAP: Record<string, Prerequisite> = {
  // ========== VENTAS ==========
  "sales-new": {
    actionId: "sales-new",
    requires: ["products-create"],
    message:
      "Para hacer una venta, primero necesitas tener **productos creados** en el sistema.\n\nSin productos, no podrás agregar nada al carrito de venta.",
    autoSuggest: "¿Quieres que te guíe para crear tu primer producto?",
    priority: 0,
  },

  // ========== ENTRADAS/COMPRAS ==========
  "entries-new": {
    actionId: "entries-new",
    requires: ["providers-create", "stores-create"],
    message:
      "Para registrar un ingreso de mercadería necesitas:\n\n1. **Tener un proveedor** creado (de quien compraste)\n2. **Tener una tienda** configurada (donde llegará la mercadería)",
    autoSuggest:
      "¿Quieres crear un proveedor primero? Después te guío para crear la tienda.",
    priority: 0,
  },

  "entries-from-pdf": {
    actionId: "entries-from-pdf",
    requires: ["providers-create"],
    message:
      "Para importar una factura PDF, primero debes tener al menos **un proveedor** registrado.\n\nEl sistema necesita asociar la factura a un proveedor existente.",
    autoSuggest: "¿Quieres crear el proveedor ahora?",
    priority: 1,
  },

  // ========== COTIZACIONES ==========
  "quotes-new": {
    actionId: "quotes-new",
    requires: ["products-create"],
    message:
      "Para crear una cotización necesitas tener **productos** en tu catálogo.\n\nAsí podrás seleccionarlos y agregarlos a la cotización.",
    autoSuggest: "¿Te ayudo a crear productos primero?",
    priority: 0,
  },

  // ========== INVENTARIO ==========
  "inventory-transfer": {
    actionId: "inventory-transfer",
    requires: ["stores-create"],
    message:
      "Para transferir stock entre tiendas, necesitas tener al menos **2 tiendas** configuradas.\n\nActualmente tienes menos de 2 tiendas.",
    autoSuggest: "¿Quieres crear una nueva tienda?",
    priority: 1,
  },

  "inventory-labels": {
    actionId: "inventory-labels",
    requires: ["products-create"],
    message:
      "Para imprimir etiquetas de productos, primero debes tener **productos creados** en el sistema.",
    autoSuggest: "¿Quieres crear productos ahora?",
    priority: 2,
  },

  // ========== CATÁLOGO ==========
  "catalog-export": {
    actionId: "catalog-export",
    requires: ["products-create", "categories-create"],
    message:
      "Para generar un catálogo necesitas:\n\n1. **Productos** creados\n2. **Categorías** (opcional pero recomendado)\n\nUn catálogo sin productos estaría vacío.",
    autoSuggest: "¿Te guío para crear productos y categorías?",
    priority: 0,
  },

  // ========== REPORTES ==========
  "reports-sales": {
    actionId: "reports-sales",
    requires: ["sales-new"],
    message:
      "Para ver reportes de ventas, primero necesitas tener **ventas registradas** en el sistema.\n\nActualmente no hay datos para mostrar.",
    autoSuggest: "¿Quieres aprender cómo hacer tu primera venta?",
    priority: 1,
  },

  "accounting-export-fiscal": {
    actionId: "accounting-export-fiscal",
    requires: ["accounting-create-entry"],
    message:
      "Para exportar libros contables (PLE, SUNAT), necesitas tener **asientos contables** registrados.\n\nUn libro vacío no tiene sentido exportar.",
    autoSuggest: "¿Quieres aprender cómo crear asientos contables?",
    priority: 1,
  },
}

/**
 * Detecta si una acción tiene pre-requisitos
 */
export function getPrerequisites(actionId: string): Prerequisite | null {
  return PREREQUISITES_MAP[actionId] || null
}

/**
 * Verifica si una query menciona una acción que requiere pre-requisitos
 */
export function detectPrerequisitesInQuery(
  query: string,
): Prerequisite | null {
  const normalizedQuery = query.toLowerCase()

  // Patrones que indican intención de hacer ventas
  if (
    /(?:como|cómo)\s+(?:hago|registro|creo)\s+(?:una|mi)?\s*(?:primera)?\s*venta/i.test(
      normalizedQuery,
    ) ||
    /(?:quiero|necesito)\s+(?:vender|hacer|registrar)\s+(?:una|mi)?\s*(?:primera)?\s*venta/i.test(
      normalizedQuery,
    )
  ) {
    return getPrerequisites("sales-new")
  }

  // Patrones que indican intención de registrar ingresos
  if (
    /(?:como|cómo)\s+(?:registro|ingreso|cargo|creo)\s+(?:una|un)?\s*(?:compra|entrada|mercad[eí]a)/i.test(
      normalizedQuery,
    ) ||
    /(?:quiero|necesito)\s+(?:registrar|crear|hacer)\s+(?:una|un)?\s*entrada/i.test(
      normalizedQuery,
    ) ||
    /(?:lleg[oó]|recibi|tengo)\s+(?:mercad[eí]a|productos?)/i.test(
      normalizedQuery,
    )
  ) {
    return getPrerequisites("entries-new")
  }

  // Patrones que indican intención de crear cotizaciones
  if (
    /(?:como|cómo)\s+(?:hago|creo|genero)\s+(?:una|un)?\s*(?:cotizaci[oó]n|presupuesto)/i.test(
      normalizedQuery,
    ) ||
    /(?:quiero|necesito)\s+(?:generar|crear|hacer)\s+(?:una|un)?\s*(?:cotizaci[oó]n|presupuesto)/i.test(
      normalizedQuery,
    )
  ) {
    return getPrerequisites("quotes-new")
  }

  // Patrones que indican intención de transferir stock
  if (
    /(?:como|cómo)\s+(?:transfiero|paso|muevo)\s+(?:stock|inventario|productos?)/i.test(
      normalizedQuery,
    ) ||
    /(?:quiero|necesito)\s+(?:transferir|pasar|mover)\s+(?:stock|inventario|productos?)/i.test(
      normalizedQuery,
    )
  ) {
    return getPrerequisites("inventory-transfer")
  }

  // Patrones que indican intención de exportar catálogo
  if (
    /(?:como|cómo)\s+(?:exporto|genero|creo)\s+(?:el|un)?\s*cat[aá]logo/i.test(
      normalizedQuery,
    )
  ) {
    return getPrerequisites("catalog-export")
  }

  // Patrones que indican intención de ver reportes
  if (
    /(?:como|cómo)\s+(?:veo|genero)\s+(?:el|un)?\s*(?:reporte|informe)\s+(?:de|sobre)?\s*ventas?/i.test(
      normalizedQuery,
    ) ||
    /(?:cuanto|cuánto)\s+(?:vend[ií]|he vendido)/i.test(normalizedQuery)
  ) {
    return getPrerequisites("reports-sales")
  }

  return null
}

/**
 * Genera una respuesta con sugerencia de pre-requisito
 */
export function generatePrerequisiteResponse(
  prerequisite: Prerequisite,
): string {
  return `${prerequisite.message}\n\n**Sugerencia:**\n${prerequisite.autoSuggest}`
}

/**
 * Verifica si un usuario ha completado ciertos pre-requisitos
 * (esto requeriría integración con el backend para verificar datos reales)
 */
export function hasCompletedPrerequisites(
  actionId: string,
  completedActions: string[],
): boolean {
  const prereq = getPrerequisites(actionId)
  if (!prereq) return true // No tiene pre-requisitos

  return prereq.requires.every((required) =>
    completedActions.includes(required),
  )
}

/**
 * Obtiene la lista de pre-requisitos faltantes
 */
export function getMissingPrerequisites(
  actionId: string,
  completedActions: string[],
): string[] {
  const prereq = getPrerequisites(actionId)
  if (!prereq) return []

  return prereq.requires.filter(
    (required) => !completedActions.includes(required),
  )
}
