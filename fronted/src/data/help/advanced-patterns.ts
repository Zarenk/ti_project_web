/**
 * Patrones avanzados para detección de preguntas complejas
 * Maneja: negaciones, condicionales, comparaciones, ambigüedades
 */

export interface NegativeQuestionPattern {
  pattern: RegExp
  type: "cannot" | "not_working" | "why_not" | "missing"
  troubleshootingIntent: string
}

export interface ConditionalQuestionPattern {
  pattern: RegExp
  type: "if_then" | "what_if" | "consequences"
}

export interface ComparisonQuestionPattern {
  pattern: RegExp
  type: "difference" | "which_better" | "comparison"
}

export interface AmbiguousQuestionPattern {
  pattern: RegExp
  clarificationNeeded: string[]
}

/**
 * Detecta preguntas NEGATIVAS (problemas)
 * Ejemplos: "por qué NO puedo", "no funciona", "no me deja"
 */
export const negativeQuestionPatterns: NegativeQuestionPattern[] = [
  {
    pattern: /(?:por\s*qu[eé]|porque)\s+no\s+(puedo|funciona|me\s+deja|aparece|se\s+puede|veo)/i,
    type: "why_not",
    troubleshootingIntent: "diagnose_blocker",
  },
  {
    pattern: /no\s+(puedo|me\s+deja|logro|consigo)\s+(guardar|crear|eliminar|editar|ver|acceder|entrar)/i,
    type: "cannot",
    troubleshootingIntent: "permission_or_error",
  },
  {
    pattern: /no\s+(funciona|sirve|anda|va|carga|responde|abre)/i,
    type: "not_working",
    troubleshootingIntent: "technical_issue",
  },
  {
    pattern: /no\s+(encuentro|veo|aparece|est[aá]|sale|hay)/i,
    type: "missing",
    troubleshootingIntent: "missing_element",
  },
  {
    pattern: /\b(error|falla|fallo|problema|issue)\b/i,
    type: "not_working",
    troubleshootingIntent: "error_diagnosis",
  },
]

/**
 * Detecta preguntas CONDICIONALES
 * Ejemplos: "si elimino X, qué pasa con Y", "qué pasa si"
 */
export const conditionalQuestionPatterns: ConditionalQuestionPattern[] = [
  {
    pattern: /si\s+(\w+)\s+.*[,]\s*(?:qu[eé]|que)\s+(pasa|sucede|ocurre)/i,
    type: "if_then",
  },
  {
    pattern: /(?:qu[eé]|que)\s+(pasa|sucede|ocurre)\s+si/i,
    type: "what_if",
  },
  {
    pattern: /si\s+(elimino|borro|quito|cambio|modifico|actualizo)/i,
    type: "consequences",
  },
  {
    pattern: /puedo\s+recuperar.*(?:eliminado|borrado|perdido)/i,
    type: "consequences",
  },
]

/**
 * Detecta preguntas COMPARATIVAS
 * Ejemplos: "cuál es la diferencia entre", "mejor X o Y"
 */
export const comparisonQuestionPatterns: ComparisonQuestionPattern[] = [
  {
    pattern: /(?:cu[aá]l|cual)\s+(?:es\s+)?la\s+diferencia\s+entre/i,
    type: "difference",
  },
  {
    pattern: /(?:qu[eé]|que)\s+diferencia\s+hay\s+entre/i,
    type: "difference",
  },
  {
    pattern: /(?:mejor|preferible)\s+.*\s+o\s+/i,
    type: "which_better",
  },
  {
    pattern: /(?:comparar|comparaci[oó]n)\s+entre/i,
    type: "comparison",
  },
  {
    pattern: /\bvs\b|\bversus\b/i,
    type: "comparison",
  },
]

/**
 * Detecta preguntas AMBIGUAS (necesitan clarificación)
 * Ejemplos: "como hago eso", "no funciona", "donde está"
 */
export const ambiguousQuestionPatterns: AmbiguousQuestionPattern[] = [
  {
    pattern: /(?:como|c[oó]mo)\s+(?:hago|se\s+hace)\s+(?:eso|esto|aquello)/i,
    clarificationNeeded: [
      "¿Podrías ser más específico?",
      "¿Te refieres a crear algo nuevo, editar algo existente, o eliminar?",
    ],
  },
  {
    pattern: /^(?:no\s+funciona|no\s+sirve|no\s+va)$/i,
    clarificationNeeded: [
      "¿Qué es lo que no funciona exactamente?",
      "¿El sistema completo, un módulo específico, o una función en particular?",
    ],
  },
  {
    pattern: /^(?:donde\s+est[aá]|d[oó]nde\s+est[aá])$/i,
    clarificationNeeded: [
      "¿Qué estás buscando?",
      "¿Un módulo, un botón, un reporte, o información específica?",
    ],
  },
  {
    pattern: /^(?:ayuda|help|socorro)$/i,
    clarificationNeeded: [
      "¡Claro! Estoy aquí para ayudarte.",
      "¿Con qué necesitas ayuda específicamente?",
      "¿Ventas, productos, inventario, reportes, u otra cosa?",
    ],
  },
  // ========== FASE 1 - MEJORA #4: PATTERNS AMBIGUOS ADICIONALES ==========
  {
    pattern: /(?:como|cómo)\s+(?:lo|la|los|las)\s+(?:hago|uso|veo|encuentro)/i,
    clarificationNeeded: [
      "¿A qué te refieres específicamente?",
      "¿Podrías dar más detalles sobre qué quieres hacer?",
    ],
  },
  {
    pattern: /^(?:esto|eso|aquello)\s+(?:qu[eé]|que)\s+(?:es|hace|sirve)/i,
    clarificationNeeded: [
      "¿Podrías ser más específico?",
      "¿Te refieres a un botón, una sección, o una función del sistema?",
    ],
  },
  {
    pattern: /^(?:est[aá]|esta)\s+(?:mal|bien|raro|rota|equivocado)/i,
    clarificationNeeded: [
      "¿Qué está mal exactamente?",
      "¿Ves algún error o mensaje específico? ¿En qué parte del sistema?",
    ],
  },
  {
    pattern: /(?:no|nunca)\s+(?:me|te)\s+(?:sale|aparece|funciona)\s*$/i,
    clarificationNeeded: [
      "¿Qué es lo que no aparece?",
      "¿Un producto, un botón, un reporte, o algo más?",
    ],
  },
  {
    pattern: /^(?:cómo|como)\s+(?:es|se hace)\s+(?:eso|esto)\??$/i,
    clarificationNeeded: [
      "¿Podrías especificar a qué proceso te refieres?",
      "Por ejemplo: una venta, un reporte, una configuración...",
    ],
  },
  {
    pattern: /^(?:dónde|donde)\s+(?:va|pongo|guardo|registro)\s+(?:eso|esto|la|el)\??$/i,
    clarificationNeeded: [
      "¿Qué quieres guardar o registrar?",
      "¿Es un producto, una venta, un proveedor, o algo más?",
    ],
  },
  {
    pattern: /^(?:y|pero)\s+(?:si|cuando)/i,
    clarificationNeeded: [
      "Parece que tu pregunta depende de un contexto previo.",
      "¿Podrías reformularla de forma completa?",
    ],
  },
  {
    pattern: /^(?:que|qué)\s+(?:pasa|sucede|ocurre)\s+(?:si|cuando)/i,
    clarificationNeeded: [
      "¿En qué escenario específico estás pensando?",
      "Por ejemplo: al eliminar algo, al cambiar un precio, etc.",
    ],
  },
  {
    pattern: /(?:me|te)\s+(?:da|sale|muestra)\s+(?:un\s+)?error/i,
    clarificationNeeded: [
      "¿Qué error te muestra exactamente?",
      "¿Hay algún mensaje de error específico? ¿En qué parte del sistema ocurre?",
    ],
  },
]

/**
 * Detecta si una pregunta es negativa
 */
export function detectNegativeQuestion(query: string): {
  isNegative: boolean;
  type?: NegativeQuestionPattern["type"];
  intent?: string;
} {
  for (const pattern of negativeQuestionPatterns) {
    if (pattern.pattern.test(query)) {
      return {
        isNegative: true,
        type: pattern.type,
        intent: pattern.troubleshootingIntent,
      }
    }
  }
  return { isNegative: false }
}

/**
 * Detecta si una pregunta es condicional
 */
export function detectConditionalQuestion(query: string): {
  isConditional: boolean;
  type?: ConditionalQuestionPattern["type"];
} {
  for (const pattern of conditionalQuestionPatterns) {
    if (pattern.pattern.test(query)) {
      return {
        isConditional: true,
        type: pattern.type,
      }
    }
  }
  return { isConditional: false }
}

/**
 * Detecta si una pregunta es comparativa
 */
export function detectComparisonQuestion(query: string): {
  isComparison: boolean;
  type?: ComparisonQuestionPattern["type"];
} {
  for (const pattern of comparisonQuestionPatterns) {
    if (pattern.pattern.test(query)) {
      return {
        isComparison: true,
        type: pattern.type,
      }
    }
  }
  return { isComparison: false }
}

/**
 * Detecta si una pregunta es ambigua y necesita clarificación
 */
export function detectAmbiguousQuestion(query: string): {
  isAmbiguous: boolean;
  clarifications?: string[];
} {
  const trimmed = query.trim()

  // Preguntas muy cortas (probablemente ambiguas)
  if (trimmed.split(/\s+/).length <= 2) {
    for (const pattern of ambiguousQuestionPatterns) {
      if (pattern.pattern.test(trimmed)) {
        return {
          isAmbiguous: true,
          clarifications: pattern.clarificationNeeded,
        }
      }
    }
  }

  // Preguntas con pronombres sin antecedente claro
  const pronounWithoutContext = /\b(eso|esto|aquello|esa|esta|aquella)\b/i
  if (pronounWithoutContext.test(trimmed) && trimmed.split(/\s+/).length < 6) {
    return {
      isAmbiguous: true,
      clarifications: [
        "¿Podrías ser más específico?",
        "¿A qué te refieres exactamente?",
      ],
    }
  }

  return { isAmbiguous: false }
}

/**
 * Divide preguntas múltiples en preguntas individuales
 * Ejemplo: "como creo un producto y lo vendo y lo facturo"
 * → ["como creo un producto", "como vendo", "como facturo"]
 */
export function splitMultipleQuestions(query: string): {
  parts: string[];
  wasplit: boolean;
  guidanceMessage?: string;
} {
  // Detectar conjunciones "y" / "también" / "además" / "luego" / "después"
  const conjunctions = /\s+y\s+(?:tambi[eé]n\s+)?(?:luego\s+)?(?:despu[eé]s\s+)?|\s+tambi[eé]n\s+|\s+adem[aá]s\s+|\s+luego\s+|\s+despu[eé]s\s+/i

  // Verbos de acción expandidos (50+ verbos comunes)
  const actionVerbs = /(creo|crear|hago|hacer|vendo|vender|elimino|eliminar|borro|borrar|edito|editar|cambio|cambiar|actualizo|actualizar|veo|ver|consulto|consultar|genero|generar|registro|registrar|agrego|agregar|añado|añadir|modifico|modificar|guardo|guardar|exporto|exportar|importo|importar|descargo|descargar|imprimo|imprimir|envío|enviar|configuro|configurar|ajusto|ajustar|calculo|calcular|comparo|comparar|filtro|filtrar|ordeno|ordenar|subo|subir|bajo|bajar|activo|activar|desactivo|desactivar|bloqueo|bloquear|desbloqueo|desbloquear|copio|copiar|muevo|mover|transfiero|transferir|sincronizo|sincronizar)/gi

  const matches = query.match(actionVerbs)

  if (matches && matches.length > 1 && conjunctions.test(query)) {
    // Intentar dividir por conjunciones
    const rawParts = query.split(conjunctions).map((part) => part.trim())

    // Filtrar partes válidas (más de 3 caracteres)
    const validParts = rawParts.filter((p) => p.length > 3)

    if (validParts.length > 1) {
      // Detectar si las partes subsiguientes son fragmentos incompletos
      // Ej: "como creo un producto" + "lo vendo" → "lo vendo" necesita contexto
      const completeParts = validParts.map((part, index) => {
        // Si la parte empieza con pronombre sin verbo completo, intentar completarla
        if (index > 0 && /^(lo|la|los|las|le|les)\s+/i.test(part)) {
          // Extraer el verbo del inicio de la consulta original
          const baseQuestion = query.match(/^(como|c[oó]mo|de\s+qu[eé]\s+manera)/i)
          if (baseQuestion) {
            return `${baseQuestion[0]} ${part}`
          }
        }
        return part
      })

      return {
        parts: completeParts,
        wasplit: true,
        guidanceMessage:
          "He dividido tu pregunta en pasos. Te voy a responder cada uno:",
      }
    }
  }

  // Detectar listas numeradas (1. 2. 3. o 1) 2) 3))
  const numberedList = query.match(/(\d+[\.\)])\s*([^0-9]+)/g)
  if (numberedList && numberedList.length > 1) {
    const parts = numberedList.map((item) =>
      item.replace(/^\d+[\.\)]\s*/, "").trim(),
    )
    return {
      parts,
      wasplit: true,
      guidanceMessage:
        "Veo que tienes varios pasos. Te voy a ayudar con cada uno:",
    }
  }

  // Detectar preguntas separadas por comas con verbos
  if (matches && matches.length > 1 && query.includes(",")) {
    const commaParts = query.split(",").map((p) => p.trim())
    if (commaParts.length > 1 && commaParts.every((p) => p.length > 5)) {
      return {
        parts: commaParts,
        wasplit: true,
        guidanceMessage: "Te voy a ayudar con cada pregunta:",
      }
    }
  }

  // No se pudo dividir, retornar original
  return {
    parts: [query],
    wasplit: false,
  }
}

/**
 * Genera respuesta combinada para preguntas múltiples divididas
 */
export function generateMultiPartResponse(
  parts: string[],
  answers: Array<{ question: string; answer: string }>,
): string {
  let response = "He dividido tu consulta en pasos:\n\n"

  parts.forEach((part, index) => {
    const correspondingAnswer = answers.find((a) =>
      part.toLowerCase().includes(a.question.toLowerCase()),
    )

    response += `**${index + 1}. ${part}**\n`
    if (correspondingAnswer) {
      response += `${correspondingAnswer.answer}\n\n`
    } else {
      response += `Para este paso, por favor especifica más detalles o pregunta directamente sobre esta acción.\n\n`
    }
  })

  return response
}

/**
 * Genera respuesta para pregunta negativa (troubleshooting)
 */
export function generateTroubleshootingResponse(
  type: NegativeQuestionPattern["type"],
  intent: string,
): string {
  const troubleshootingSteps: Record<string, string> = {
    permission_or_error: `Vamos a diagnosticar el problema:

1. ¿Qué mensaje de error exacto te aparece? (si hay alguno)
2. ¿Tienes los permisos necesarios para esta acción?
3. ¿Ya intentaste refrescar la página? (F5)
4. ¿Funciona en otro navegador?

Si el problema persiste, por favor comparte:
• El mensaje de error completo
• Qué estabas intentando hacer
• En qué módulo estabas`,

    technical_issue: `Entiendo que hay un problema técnico. Probemos estos pasos:

1. Refresca la página (F5 o Ctrl+R)
2. Limpia el caché del navegador
3. Verifica tu conexión a internet
4. Prueba en modo incógnito
5. Prueba en otro navegador

Si nada funciona, necesitamos más información:
• ¿Qué estabas haciendo cuando ocurrió?
• ¿Hay algún mensaje de error?
• ¿Funciona en otro dispositivo?`,

    missing_element: `No encuentras algo en la interfaz. Verifiquemos:

1. ¿Estás en el módulo correcto?
2. ¿Tienes permisos para ver ese elemento?
3. ¿Ya probaste usar el buscador? (Ctrl+F en el navegador)
4. ¿Podría estar oculto o colapsado?

Dime exactamente qué estás buscando y te ayudo a encontrarlo.`,

    diagnose_blocker: `Hay algo que te está bloqueando. Investiguemos:

1. ¿Es la primera vez que intentas hacer esto?
2. ¿Te funcionó antes y ahora no?
3. ¿Ves algún mensaje o indicación en pantalla?
4. ¿Otros usuarios pueden hacerlo?

Cuéntame más detalles para poder ayudarte mejor.`,

    error_diagnosis: `Hay un error en el sistema. Para ayudarte necesito:

1. El mensaje de error EXACTO (cópialo si puedes)
2. Qué estabas haciendo justo antes
3. Si es la primera vez que pasa
4. Si ocurre siempre o solo a veces

Con esa información puedo darte una solución específica.`,
  }

  return troubleshootingSteps[intent] || troubleshootingSteps.technical_issue
}

/**
 * Genera respuesta para pregunta condicional
 */
export function generateConditionalResponse(
  type: ConditionalQuestionPattern["type"],
): string {
  const responses: Record<string, string> = {
    if_then: `Esa es una excelente pregunta sobre las consecuencias de una acción.

**En general:**
• Eliminar registros NO elimina datos relacionados automáticamente (por seguridad)
• Modificar datos NO afecta registros históricos (mantiene integridad)
• Puedes deshacer la mayoría de acciones si actúas rápido

¿Podrías ser más específico sobre qué acción quieres realizar?
Así te puedo decir exactamente qué pasará.`,

    what_if: `Buena pregunta preventiva. Las consecuencias dependen de la acción específica:

**Acciones reversibles:**
✅ Editar información
✅ Cambiar precios
✅ Actualizar stock

**Acciones que requieren precaución:**
⚠️ Eliminar productos con historial de ventas
⚠️ Borrar clientes con facturas
⚠️ Modificar asientos contables cerrados

¿Qué acción específica estás considerando?`,

    consequences: `Es importante conocer las consecuencias antes de actuar.

**Regla general:**
• Si eliminas algo CON datos relacionados → el sistema te avisará
• Si eliminas algo SIN datos relacionados → se borra completamente
• Algunos datos críticos NO se pueden eliminar (solo desactivar)

Dime exactamente qué quieres hacer y te explico qué pasará.`,
  }

  return responses[type] || responses.if_then
}

/**
 * Genera respuesta para pregunta comparativa
 */
export function generateComparisonResponse(entities: string[]): string {
  // En el futuro, esto buscará en una base de comparaciones
  // Por ahora, respuesta genérica
  return `Entiendo que quieres saber la diferencia entre ${entities[0] || "estas opciones"} y ${entities[1] || "otras"}.

**Para darte una comparación precisa, necesito más contexto:**
• ¿En qué módulo estás trabajando?
• ¿Qué aspecto te interesa comparar? (funcionalidad, uso, ventajas)

Mientras tanto, aquí van algunas diferencias generales entre conceptos comunes:

**Factura vs Boleta:**
• Factura: para empresas, deducible de impuestos
• Boleta: para consumidor final, no deducible

**Producto vs Servicio:**
• Producto: bien tangible, con stock
• Servicio: intangible, sin stock

**Entrada vs Compra:**
• Entrada: registro de mercadería que ingresa
• Compra: transacción comercial con proveedor

¿Cuál de estas te interesa?`
}
