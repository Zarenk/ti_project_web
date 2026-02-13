/**
 * SUITE DE PRUEBAS DEL CHATBOT
 *
 * Sistema completo de testing para afinar el chatbot y validar respuestas.
 * Incluye casos de prueba para todos los escenarios y métricas de precisión.
 */

import { findMatchingEntries } from "./enhanced-matcher"
import { validateQuery, validateResponse, isMetaQuestion } from "./query-validation"
import { allHelpEntries } from "."
import type { HelpEntry } from "./types"

export interface TestCase {
  id: string
  category: "valida" | "generica" | "queja" | "meta" | "ambigua" | "incorrecta"
  query: string
  section: string
  expectedBehavior: string
  expectedMatch?: string // ID de la entry esperada
  shouldValidate: boolean
  minimumScore?: number
}

/**
 * CASOS DE PRUEBA COMPLETOS
 */
export const TEST_CASES: TestCase[] = [
  // ========== QUEJAS DEL USUARIO ==========
  {
    id: "queja-1",
    category: "queja",
    query: "no te pregunté sobre eso",
    section: "sales",
    expectedBehavior: "Detectar como queja, disculparse y pedir reformular",
    shouldValidate: false,
  },
  {
    id: "queja-2",
    category: "queja",
    query: "eso no es lo que pedí",
    section: "products",
    expectedBehavior: "Detectar como queja, disculparse",
    shouldValidate: false,
  },
  {
    id: "queja-3",
    category: "queja",
    query: "no me estás entendiendo",
    section: "inventory",
    expectedBehavior: "Detectar como queja, disculparse",
    shouldValidate: false,
  },
  {
    id: "queja-4",
    category: "queja",
    query: "estás respondiendo cualquier cosa",
    section: "general",
    expectedBehavior: "Detectar como queja, disculparse",
    shouldValidate: false,
  },

  // ========== PREGUNTAS GENÉRICAS ==========
  {
    id: "generica-1",
    category: "generica",
    query: "que mas informacion me puedes dar",
    section: "sales",
    expectedBehavior: "Pedir clarificación con ejemplos de preguntas específicas",
    shouldValidate: false,
  },
  {
    id: "generica-2",
    category: "generica",
    query: "dame algo mas",
    section: "products",
    expectedBehavior: "Pedir clarificación",
    shouldValidate: false,
  },
  {
    id: "generica-3",
    category: "generica",
    query: "ayuda",
    section: "inventory",
    expectedBehavior: "Pedir clarificación con ejemplos",
    shouldValidate: false,
  },
  {
    id: "generica-4",
    category: "generica",
    query: "qué puedo hacer",
    section: "general",
    expectedBehavior: "Dar overview de funcionalidades",
    shouldValidate: false,
  },

  // ========== META-PREGUNTAS ==========
  {
    id: "meta-1",
    category: "meta",
    query: "que haces",
    section: "general",
    expectedBehavior: "Presentarse como asistente virtual",
    shouldValidate: true, // Meta questions son válidas pero tienen respuesta especial
  },
  {
    id: "meta-2",
    category: "meta",
    query: "quien eres",
    section: "general",
    expectedBehavior: "Presentarse",
    shouldValidate: true,
  },
  {
    id: "meta-3",
    category: "meta",
    query: "eres un robot",
    section: "general",
    expectedBehavior: "Presentarse como IA asistente",
    shouldValidate: true,
  },

  // ========== PREGUNTAS VÁLIDAS - VENTAS ==========
  {
    id: "valida-sales-1",
    category: "valida",
    query: "como hago una venta",
    section: "sales",
    expectedBehavior: "Responder con pasos para crear venta",
    expectedMatch: "sales-create",
    shouldValidate: true,
    minimumScore: 0.8,
  },
  {
    id: "valida-sales-2",
    category: "valida",
    query: "como registro una venta",
    section: "sales",
    expectedBehavior: "Responder con pasos para crear venta",
    expectedMatch: "sales-create",
    shouldValidate: true,
    minimumScore: 0.8,
  },
  {
    id: "valida-sales-3",
    category: "valida",
    query: "donde veo el historial de ventas",
    section: "sales",
    expectedBehavior: "Explicar cómo ver historial",
    expectedMatch: "sales-history",
    shouldValidate: true,
    minimumScore: 0.75,
  },
  {
    id: "valida-sales-4",
    category: "valida",
    query: "como imprimo una factura",
    section: "sales",
    expectedBehavior: "Explicar impresión de comprobantes",
    expectedMatch: "sales-invoice",
    shouldValidate: true,
    minimumScore: 0.75,
  },

  // ========== PREGUNTAS VÁLIDAS - PRODUCTOS ==========
  {
    id: "valida-products-1",
    category: "valida",
    query: "como creo un producto",
    section: "products",
    expectedBehavior: "Pasos para crear producto",
    expectedMatch: "products-create",
    shouldValidate: true,
    minimumScore: 0.85,
  },
  {
    id: "valida-products-2",
    category: "valida",
    query: "como agrego imagenes a un producto",
    section: "products",
    expectedBehavior: "Explicar carga de imágenes",
    expectedMatch: "products-images",
    shouldValidate: true,
    minimumScore: 0.75,
  },
  {
    id: "valida-products-3",
    category: "valida",
    query: "como cambio el precio de un producto",
    section: "products",
    expectedBehavior: "Explicar edición de precios",
    expectedMatch: "products-price",
    shouldValidate: true,
    minimumScore: 0.75,
  },

  // ========== PREGUNTAS VÁLIDAS - INVENTARIO ==========
  {
    id: "valida-inventory-1",
    category: "valida",
    query: "como veo mi stock",
    section: "inventory",
    expectedBehavior: "Explicar vista de inventario",
    expectedMatch: "inventory-view",
    shouldValidate: true,
    minimumScore: 0.75,
  },
  {
    id: "valida-inventory-2",
    category: "valida",
    query: "donde veo mi inventario",
    section: "inventory",
    expectedBehavior: "Explicar vista de inventario",
    expectedMatch: "inventory-view",
    shouldValidate: true,
    minimumScore: 0.75,
  },
  {
    id: "valida-inventory-3",
    category: "valida",
    query: "como configuro alertas de stock bajo",
    section: "inventory",
    expectedBehavior: "Explicar alertas de stock",
    expectedMatch: "inventory-alert",
    shouldValidate: true,
    minimumScore: 0.7,
  },

  // ========== PREGUNTAS VÁLIDAS - CONTABILIDAD ==========
  {
    id: "valida-accounting-1",
    category: "valida",
    query: "como creo un asiento contable",
    section: "accounting",
    expectedBehavior: "Pasos para crear asiento",
    expectedMatch: "accounting-create-entry",
    shouldValidate: true,
    minimumScore: 0.8,
  },
  {
    id: "valida-accounting-2",
    category: "valida",
    query: "como veo el libro mayor",
    section: "accounting",
    expectedBehavior: "Explicar libro mayor",
    expectedMatch: "accounting-ledger",
    shouldValidate: true,
    minimumScore: 0.75,
  },
  {
    id: "valida-accounting-3",
    category: "valida",
    query: "como hago el cierre contable",
    section: "accounting",
    expectedBehavior: "Explicar cierre contable",
    expectedMatch: "accounting-closing",
    shouldValidate: true,
    minimumScore: 0.75,
  },

  // ========== PREGUNTAS VÁLIDAS - CATÁLOGO ==========
  {
    id: "valida-catalog-1",
    category: "valida",
    query: "como veo mi catalogo",
    section: "catalog",
    expectedBehavior: "Explicar vista de catálogo",
    expectedMatch: "catalog-view",
    shouldValidate: true,
    minimumScore: 0.75,
  },
  {
    id: "valida-catalog-2",
    category: "valida",
    query: "como exporto el catalogo",
    section: "catalog",
    expectedBehavior: "Explicar exportación",
    expectedMatch: "catalog-export",
    shouldValidate: true,
    minimumScore: 0.75,
  },

  // ========== PREGUNTAS AMBIGUAS (edge cases) ==========
  {
    id: "ambigua-1",
    category: "ambigua",
    query: "como lo hago",
    section: "sales",
    expectedBehavior: "Pedir más contexto (¿qué específicamente?)",
    shouldValidate: false,
  },
  {
    id: "ambigua-2",
    category: "ambigua",
    query: "donde está",
    section: "products",
    expectedBehavior: "Pedir clarificación (¿dónde está qué?)",
    shouldValidate: false,
  },
  {
    id: "ambigua-3",
    category: "ambigua",
    query: "no funciona",
    section: "inventory",
    expectedBehavior: "Pedir detalles (¿qué no funciona?)",
    shouldValidate: true, // Válida pero requiere contexto
    minimumScore: 0.5,
  },

  // ========== PREGUNTAS INCORRECTAS/FUERA DE SCOPE ==========
  {
    id: "incorrecta-1",
    category: "incorrecta",
    query: "cual es la capital de francia",
    section: "general",
    expectedBehavior: "Responder que está fuera de scope, ofrecer ayuda con el sistema",
    shouldValidate: true, // Técnicamente válida pero no relevante
    minimumScore: 0.0, // No debería encontrar match
  },
  {
    id: "incorrecta-2",
    category: "incorrecta",
    query: "como cocino arroz",
    section: "sales",
    expectedBehavior: "Responder que está fuera de scope",
    shouldValidate: true,
    minimumScore: 0.0,
  },
]

/**
 * Resultado de una prueba individual
 */
export interface TestResult {
  testCase: TestCase
  passed: boolean
  queryValidation: ReturnType<typeof validateQuery>
  isMeta: boolean
  matches: ReturnType<typeof findMatchingEntries>
  topMatch?: {
    entry: HelpEntry
    score: number
    matchType: string
  }
  responseValidation?: ReturnType<typeof validateResponse>
  issues: string[]
  suggestions: string[]
}

/**
 * Ejecuta un caso de prueba individual
 */
export function runTestCase(testCase: TestCase): TestResult {
  const issues: string[] = []
  const suggestions: string[] = []

  // 1. Validar query
  const queryValidation = validateQuery(testCase.query)

  // 2. Detectar meta-question
  const isMeta = isMetaQuestion(testCase.query)

  // 3. Buscar matches
  const matches = findMatchingEntries(testCase.query, allHelpEntries)
  const topMatch = matches[0]
    ? {
        entry: matches[0].entry,
        score: matches[0].score,
        matchType: matches[0].matchType,
      }
    : undefined

  // 4. Validar respuesta si hay match
  let responseValidation: ReturnType<typeof validateResponse> | undefined
  if (topMatch) {
    responseValidation = validateResponse(
      testCase.query,
      topMatch.entry.answer,
      topMatch.score,
      topMatch.matchType
    )
  }

  // 5. Verificar comportamiento esperado
  let passed = true

  // Check 1: Query validation
  if (testCase.shouldValidate && !queryValidation.isValid) {
    passed = false
    issues.push(`❌ Query debería ser válida pero fue rechazada (reason: ${queryValidation.reason})`)
  }

  if (!testCase.shouldValidate && queryValidation.isValid) {
    passed = false
    issues.push(`❌ Query debería ser inválida (${testCase.category}) pero fue aceptada`)
  }

  // Check 2: Meta-question detection
  if (testCase.category === "meta" && !isMeta) {
    passed = false
    issues.push("❌ Meta-question no fue detectada")
  }

  // Check 3: Expected match
  if (testCase.expectedMatch && topMatch) {
    if (topMatch.entry.id !== testCase.expectedMatch) {
      passed = false
      issues.push(
        `❌ Match incorrecto: esperado '${testCase.expectedMatch}', obtenido '${topMatch.entry.id}' (score: ${topMatch.score.toFixed(2)})`
      )
      suggestions.push(
        `Considerar agregar alias o keywords para mejorar matching de '${testCase.query}'`
      )
    }
  }

  // Check 4: Minimum score
  if (testCase.minimumScore && topMatch) {
    if (topMatch.score < testCase.minimumScore) {
      passed = false
      issues.push(
        `⚠️ Score bajo: ${topMatch.score.toFixed(2)} < ${testCase.minimumScore} (esperado)`
      )
      suggestions.push(`Mejorar keywords o aliases para aumentar score`)
    }
  }

  // Check 5: Response validation
  if (topMatch && responseValidation && !responseValidation.isRelevant) {
    passed = false
    issues.push(
      `❌ Respuesta no relevante (reason: ${responseValidation.reason}, confidence: ${responseValidation.confidence.toFixed(2)})`
    )
  }

  // Check 6: Out of scope queries
  if (testCase.category === "incorrecta" && topMatch && topMatch.score > 0.5) {
    passed = false
    issues.push(
      `❌ Query fuera de scope obtuvo match con score ${topMatch.score.toFixed(2)} (debería ser bajo)`
    )
    suggestions.push("El threshold puede necesitar ajuste para este tipo de queries")
  }

  return {
    testCase,
    passed,
    queryValidation,
    isMeta,
    matches: matches.slice(0, 3), // Top 3
    topMatch,
    responseValidation,
    issues,
    suggestions,
  }
}

/**
 * Ejecuta toda la suite de pruebas
 */
export function runTestSuite(filter?: {
  category?: TestCase["category"]
  section?: string
}): {
  results: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    passRate: number
    byCategory: Record<string, { passed: number; total: number; rate: number }>
  }
} {
  // Filtrar casos de prueba
  let cases = TEST_CASES
  if (filter?.category) {
    cases = cases.filter((c) => c.category === filter.category)
  }
  if (filter?.section) {
    cases = cases.filter((c) => c.section === filter.section)
  }

  // Ejecutar pruebas
  const results = cases.map(runTestCase)

  // Calcular métricas
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  const failed = total - passed
  const passRate = total > 0 ? (passed / total) * 100 : 0

  // Métricas por categoría
  const byCategory: Record<string, { passed: number; total: number; rate: number }> = {}
  const categories = Array.from(new Set(TEST_CASES.map((c) => c.category)))

  categories.forEach((category) => {
    const categoryResults = results.filter((r) => r.testCase.category === category)
    const categoryPassed = categoryResults.filter((r) => r.passed).length
    const categoryTotal = categoryResults.length

    byCategory[category] = {
      passed: categoryPassed,
      total: categoryTotal,
      rate: categoryTotal > 0 ? (categoryPassed / categoryTotal) * 100 : 0,
    }
  })

  return {
    results,
    summary: {
      total,
      passed,
      failed,
      passRate,
      byCategory,
    },
  }
}

/**
 * Genera reporte de pruebas en formato markdown
 */
export function generateTestReport(suiteResults: ReturnType<typeof runTestSuite>): string {
  const { results, summary } = suiteResults

  let report = "# 🧪 REPORTE DE PRUEBAS DEL CHATBOT\n\n"

  // Summary
  report += "## 📊 Resumen General\n\n"
  report += `- **Total de pruebas**: ${summary.total}\n`
  report += `- **✅ Pasadas**: ${summary.passed}\n`
  report += `- **❌ Falladas**: ${summary.failed}\n`
  report += `- **📈 Tasa de éxito**: ${summary.passRate.toFixed(1)}%\n\n`

  // By category
  report += "## 📂 Resultados por Categoría\n\n"
  Object.entries(summary.byCategory).forEach(([category, stats]) => {
    const emoji = stats.rate === 100 ? "✅" : stats.rate >= 80 ? "⚠️" : "❌"
    report += `${emoji} **${category}**: ${stats.passed}/${stats.total} (${stats.rate.toFixed(1)}%)\n`
  })
  report += "\n"

  // Failed tests
  const failed = results.filter((r) => !r.passed)
  if (failed.length > 0) {
    report += "## ❌ Pruebas Fallidas\n\n"
    failed.forEach((result) => {
      report += `### ${result.testCase.id}: "${result.testCase.query}"\n\n`
      report += `**Categoría**: ${result.testCase.category}\n`
      report += `**Sección**: ${result.testCase.section}\n`
      report += `**Comportamiento esperado**: ${result.testCase.expectedBehavior}\n\n`

      if (result.topMatch) {
        report += `**Match obtenido**: ${result.topMatch.entry.id} (score: ${result.topMatch.score.toFixed(2)})\n`
      } else {
        report += `**Match obtenido**: Ninguno\n`
      }

      report += "\n**Issues**:\n"
      result.issues.forEach((issue) => {
        report += `- ${issue}\n`
      })

      if (result.suggestions.length > 0) {
        report += "\n**Sugerencias**:\n"
        result.suggestions.forEach((suggestion) => {
          report += `- 💡 ${suggestion}\n`
        })
      }

      report += "\n---\n\n"
    })
  } else {
    report += "## ✅ ¡Todas las pruebas pasaron!\n\n"
  }

  return report
}

/**
 * Formato de consola con colores (para desarrollo)
 */
export function logTestResults(suiteResults: ReturnType<typeof runTestSuite>): void {
  console.log("\n🧪 ===== SUITE DE PRUEBAS DEL CHATBOT =====\n")

  console.log("📊 RESUMEN:")
  console.log(`Total: ${suiteResults.summary.total}`)
  console.log(`✅ Pasadas: ${suiteResults.summary.passed}`)
  console.log(`❌ Falladas: ${suiteResults.summary.failed}`)
  console.log(`📈 Tasa de éxito: ${suiteResults.summary.passRate.toFixed(1)}%\n`)

  console.log("📂 POR CATEGORÍA:")
  Object.entries(suiteResults.summary.byCategory).forEach(([category, stats]) => {
    const emoji = stats.rate === 100 ? "✅" : stats.rate >= 80 ? "⚠️" : "❌"
    console.log(`${emoji} ${category}: ${stats.passed}/${stats.total} (${stats.rate.toFixed(1)}%)`)
  })

  const failed = suiteResults.results.filter((r) => !r.passed)
  if (failed.length > 0) {
    console.log("\n❌ PRUEBAS FALLIDAS:\n")
    failed.forEach((result) => {
      console.log(`\n${result.testCase.id}: "${result.testCase.query}"`)
      console.log(`  Categoría: ${result.testCase.category}`)
      console.log(`  Match: ${result.topMatch?.entry.id || "ninguno"} (score: ${result.topMatch?.score.toFixed(2) || "N/A"})`)
      console.log("  Issues:")
      result.issues.forEach((issue) => console.log(`    ${issue}`))
    })
  } else {
    console.log("\n✅ ¡Todas las pruebas pasaron!")
  }
}
