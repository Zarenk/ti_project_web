/**
 * Motor de búsqueda mejorado que usa sinónimos, patrones de intención,
 * corrección automática de errores y normalización de texto
 * para entender mejor las consultas del usuario.
 */

import { helpSynonyms, expandQueryWithSynonyms, normalizeTerms } from "./synonyms"
import { detectIntent, getRelatedEntriesByIntent } from "./intent-patterns"
import {
  autoCorrect,
  expandQueryWithCorrections,
  detectPotentialErrors,
  generateDidYouMean,
  robustMatch,
} from "./fuzzy-matcher"
import {
  detectNegativeQuestion,
  detectConditionalQuestion,
  detectComparisonQuestion,
  detectAmbiguousQuestion,
  splitMultipleQuestions,
  generateTroubleshootingResponse,
  generateConditionalResponse,
  generateComparisonResponse,
} from "./advanced-patterns"
import type { HelpEntry } from "./types"

export interface MatchResult {
  entry: HelpEntry;
  score: number;
  matchType: "exact" | "alias" | "synonym" | "keyword" | "intent" | "fuzzy" | "autocorrect";
  correctedQuery?: string; // Si se aplicó autocorrección
  didYouMean?: string[]; // Sugerencias alternativas
}

/**
 * Normalizar texto para comparación:
 * - Minúsculas
 * - Sin tildes
 * - Sin puntuación extra
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover tildes
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calcular similitud entre dos strings usando Levenshtein simplificado
 */
function calculateSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1.0;

  // Similitud básica: palabras en común
  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));

  return intersection.size / Math.max(wordsA.size, wordsB.size);
}

/**
 * Obtener threshold adaptativo basado en el tipo de match
 * Matches más precisos requieren mayor confianza
 */
function getAdaptiveThreshold(matchType: MatchResult["matchType"]): number {
  const thresholds: Record<MatchResult["matchType"], number> = {
    exact: 0.95,      // Matches exactos deben ser muy precisos
    alias: 0.85,      // Aliases con buena confianza
    autocorrect: 0.80, // Autocorrección confiable
    synonym: 0.75,    // Sinónimos buenos pero no perfectos
    keyword: 0.60,    // Keywords permiten más flexibilidad
    intent: 0.55,     // Intención puede ser amplia (el section boost la refina)
    fuzzy: 0.55,      // Fuzzy matching más permisivo
  }

  return thresholds[matchType] ?? 0.55
}

/**
 * Buscar entradas que coincidan con la consulta usando múltiples estrategias
 * incluyendo autocorrección de errores
 *
 * NOTA: Usa threshold adaptativo - cada tipo de match tiene su propio threshold
 */
export function findMatchingEntries(
  query: string,
  entries: HelpEntry[],
  minScore: number = 0.65, // Threshold base para fuzzy matching
  currentSection?: string // Sección actual para boost contextual
): MatchResult[] {
  const results: MatchResult[] = [];

  // 0. Detectar y corregir errores automáticamente
  const { corrected: correctedQuery, changed: wasAutoCorrected } = autoCorrect(query);
  const errorDetection = detectPotentialErrors(query);

  // Usar la query corregida si tiene errores
  const baseQuery = errorDetection.hasErrors && errorDetection.confidence > 0.5
    ? correctedQuery
    : query;

  const normalizedQuery = normalizeText(baseQuery);

  // Expandir consulta con sinónimos Y correcciones
  const expandedQueries = [
    ...expandQueryWithSynonyms(baseQuery),
    ...expandQueryWithCorrections(query),
  ];
  const normalizedQueries = [...new Set(expandedQueries.map(normalizeText))];

  // Detectar intención
  const intents = detectIntent(baseQuery);
  const intentKeywords = getRelatedEntriesByIntent(baseQuery);

  // Preparar sugerencias "Did you mean"
  const allQuestions = entries.map(e => e.question);
  const didYouMeanSuggestions = wasAutoCorrected
    ? generateDidYouMean(query, allQuestions, 0.75)
    : [];

  entries.forEach((entry) => {
    let bestScore = 0;
    let bestMatchType: MatchResult["matchType"] = "fuzzy";

    // 1. Coincidencia exacta con la pregunta
    const normalizedQuestion = normalizeText(entry.question);
    if (normalizedQueries.some(q => normalizedQuestion.includes(q) || q.includes(normalizedQuestion))) {
      bestScore = 1.0;
      bestMatchType = "exact";
    }

    // 2. Coincidencia con aliases
    if (bestScore < 0.9 && entry.aliases) {
      const normalizedAliases = entry.aliases.map(normalizeText);
      for (const nq of normalizedQueries) {
        for (const alias of normalizedAliases) {
          if (alias.includes(nq) || nq.includes(alias)) {
            const score = 0.9;
            if (score > bestScore) {
              bestScore = score;
              bestMatchType = "alias";
            }
          }
        }
      }
    }

    // 3. Coincidencia con keywords (si existen)
    if (bestScore < 0.8 && (entry as any).keywords) {
      const keywords = (entry as any).keywords as string[];
      const normalizedKeywords = keywords.map(normalizeText);

      for (const nq of normalizedQueries) {
        const queryWords = nq.split(" ");
        const matchingKeywords = normalizedKeywords.filter(kw =>
          queryWords.some(word => kw.includes(word) || word.includes(kw))
        );

        if (matchingKeywords.length > 0) {
          const ratio = matchingKeywords.length / Math.min(keywords.length, 8);
          const score = 0.60 + Math.min(ratio, 1) * 0.20;
          if (score > bestScore) {
            bestScore = score;
            bestMatchType = "keyword";
          }
        }
      }
    }

    // 4. Coincidencia por intención
    if (bestScore < 0.7 && intents.length > 0) {
      const entryId = entry.id.toLowerCase();
      const entryQuestion = normalizeText(entry.question);
      const matchingIntentKeywords = intentKeywords.filter(keyword =>
        entryId.includes(keyword) || entryQuestion.includes(keyword)
      );

      if (matchingIntentKeywords.length > 0) {
        const ratio = matchingIntentKeywords.length / intentKeywords.length;
        const score = 0.55 + ratio * 0.20;
        if (score > bestScore) {
          bestScore = score;
          bestMatchType = "intent";
        }
      }
    }

    // 5. Similitud difusa mejorada con la pregunta y aliases
    if (bestScore < 0.6) {
      const textsToCompare = [
        entry.question,
        ...(entry.aliases || [])
      ];

      for (const text of textsToCompare) {
        for (const nq of normalizedQueries) {
          // Usar robust matching que combina múltiples estrategias
          const robustResult = robustMatch(nq, normalizeText(text));
          if (robustResult.score > bestScore) {
            bestScore = robustResult.score;
            bestMatchType = "fuzzy";
          }
        }
      }
    }

    // 6. Boost por autocorrección exitosa
    if (wasAutoCorrected && bestScore > 0.5) {
      bestScore = Math.min(bestScore * 1.1, 1.0); // Bonus del 10%
      bestMatchType = "autocorrect" as MatchResult["matchType"];
    }

    // 7. Section context boost: entries de la sección actual obtienen +0.15
    // Esto permite que matches marginales en la sección correcta pasen el threshold
    if (currentSection && bestScore > 0.3 && entry.id.startsWith(currentSection + "-")) {
      bestScore = Math.min(bestScore + 0.15, 1.0);
    }

    // Obtener threshold adaptativo para este tipo de match
    const adaptiveThreshold = getAdaptiveThreshold(bestMatchType)

    // Solo incluir si supera el threshold adaptativo
    // Esto permite que matches de alta calidad (exact, alias) sean más estrictos
    // mientras que matches fuzzy pueden ser más permisivos
    if (bestScore >= adaptiveThreshold) {
      const matchResult: MatchResult = {
        entry,
        score: bestScore,
        matchType: bestMatchType,
      };

      // Incluir información de corrección si aplica
      if (wasAutoCorrected) {
        matchResult.correctedQuery = correctedQuery;
      }

      // Incluir sugerencias "Did you mean" solo en el mejor resultado
      if (results.length === 0 && didYouMeanSuggestions.length > 0) {
        matchResult.didYouMean = didYouMeanSuggestions;
      }

      results.push(matchResult);
    }
  });

  // Ordenar por score descendente
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Extraer entidades de la consulta (productos, clientes, etc.)
 */
export function extractEntities(query: string): {
  entities: string[];
  cleanQuery: string;
} {
  const normalized = normalizeText(query);
  const entities: string[] = [];

  // Patrones para extraer entidades
  const patterns = [
    { type: "product", regex: /(?:producto|articulo|item)\s+["']([^"']+)["']/gi },
    { type: "client", regex: /(?:cliente|comprador)\s+["']([^"']+)["']/gi },
    { type: "number", regex: /\b\d+\b/g },
  ];

  let cleanQuery = normalized;

  patterns.forEach(({ type, regex }) => {
    let match;
    while ((match = regex.exec(normalized)) !== null) {
      entities.push(`${type}:${match[1] || match[0]}`);
      cleanQuery = cleanQuery.replace(match[0], "");
    }
  });

  return {
    entities,
    cleanQuery: cleanQuery.trim(),
  };
}

/**
 * Sugerencias de consultas relacionadas
 */
export function suggestRelatedQueries(query: string, entries: HelpEntry[]): string[] {
  const matches = findMatchingEntries(query, entries, 0.4);
  const suggestions = new Set<string>();

  matches.slice(0, 5).forEach(({ entry }) => {
    suggestions.add(entry.question);
    if (entry.aliases) {
      entry.aliases.slice(0, 2).forEach(alias => suggestions.add(alias));
    }
  });

  return Array.from(suggestions).slice(0, 5);
}
