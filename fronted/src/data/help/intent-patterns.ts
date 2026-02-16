/**
 * Patrones de intención para mejorar la comprensión del contexto
 * y las diferentes formas en que los usuarios expresan sus necesidades.
 */

export interface IntentPattern {
  intent: string;
  patterns: RegExp[];
  relatedEntries: string[];
}

export const intentPatterns: IntentPattern[] = [
  {
    intent: "create_something",
    patterns: [
      /^(como|cómo)\s+(creo|hago|agrego|añado|registro|doy de alta)/i,
      /^(necesito|quiero|deseo)\s+(crear|hacer|agregar|registrar)/i,
      /^(donde|dónde)\s+(creo|hago|agrego|registro)/i,
      /^(puedo|podria|podría)\s+(crear|hacer|agregar)/i,
    ],
    relatedEntries: ["create", "add", "new", "register"],
  },
  {
    intent: "edit_something",
    patterns: [
      /^(como|cómo)\s+(edito|modifico|cambio|actualizo|corrijo)/i,
      /^(necesito|quiero)\s+(editar|modificar|cambiar|actualizar)/i,
      /^(donde|dónde)\s+(edito|modifico|cambio)/i,
    ],
    relatedEntries: ["edit", "modify", "update", "change"],
  },
  {
    intent: "delete_something",
    patterns: [
      /^(como|cómo)\s+(elimino|borro|quito|doy de baja)/i,
      /^(necesito|quiero)\s+(eliminar|borrar|quitar)/i,
      /^(puedo|podria|podría)\s+(eliminar|borrar)/i,
    ],
    relatedEntries: ["delete", "remove", "deactivate"],
  },
  {
    intent: "find_something",
    patterns: [
      /^(como|cómo)\s+(busco|encuentro|localizo|filtro|veo)/i,
      /^(donde|dónde)\s+(veo|está|están|encuentro)/i,
      /^(necesito|quiero)\s+(ver|buscar|encontrar)/i,
    ],
    relatedEntries: ["search", "find", "filter", "view", "list"],
  },
  {
    intent: "understand_concept",
    patterns: [
      /^(que|qué)\s+(es|significa|son)/i,
      /^(para que|para qué)\s+(sirve|se usa)/i,
      /^(por que|por qué)\s+(necesito|debo|tengo que)/i,
      /^(como|cómo)\s+(funciona|trabaja|opera)/i,
      /(como|cómo)\s+(funciona|trabaja)\s+(\w+)\s+(en|dentro de|en la)\s+/i,
    ],
    relatedEntries: ["what", "why", "concept", "importance", "how", "works"],
  },
  {
    intent: "troubleshoot",
    patterns: [
      /^(por que|por qué|porque|porqué)\s+(no|nunca)/i,
      /^no\s+(puedo|funciona|aparece|veo)/i,
      /^(tengo un|hay un)\s+(problema|error)/i,
      /^(que|qué)\s+pasa\s+(cuando|si)/i,
    ],
    relatedEntries: ["error", "problem", "troubleshoot", "fix"],
  },
  {
    intent: "configure",
    patterns: [
      /^(como|cómo)\s+(configuro|ajusto|personalizo|seteo)/i,
      /^(donde|dónde)\s+(configuro|cambio la configuración)/i,
      /^(necesito|quiero)\s+(configurar|ajustar)/i,
    ],
    relatedEntries: ["config", "settings", "setup", "configure"],
  },
  {
    intent: "export_import",
    patterns: [
      /^(como|cómo)\s+(exporto|descargo|guardo|saco)/i,
      /^(como|cómo)\s+(importo|cargo|subo|traigo)/i,
      /^(necesito|quiero)\s+(exportar|descargar|importar)/i,
    ],
    relatedEntries: ["export", "import", "download", "upload"],
  },
  {
    intent: "report_analytics",
    patterns: [
      /^(como|cómo)\s+(veo|genero|obtengo)\s+(reporte|informe|estadística)/i,
      /^(donde|dónde)\s+(veo|están)\s+(los|las)\s+(reporte|estadística|venta)/i,
    ],
    relatedEntries: ["report", "analytics", "statistics", "dashboard"],
  },
];

/**
 * Detectar la intención de una consulta
 */
export function detectIntent(query: string): string[] {
  const detectedIntents: string[] = [];

  for (const { intent, patterns } of intentPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        detectedIntents.push(intent);
        break;
      }
    }
  }

  return detectedIntents;
}

/**
 * Obtener entradas relacionadas basadas en la intención
 */
export function getRelatedEntriesByIntent(query: string): string[] {
  const intents = detectIntent(query);
  const relatedTerms = new Set<string>();

  intentPatterns
    .filter(p => intents.includes(p.intent))
    .forEach(p => p.relatedEntries.forEach(term => relatedTerms.add(term)));

  return Array.from(relatedTerms);
}
