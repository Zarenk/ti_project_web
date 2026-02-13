"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TEST_CASES,
  runTestSuite,
  runTestCase,
  generateTestReport,
  type TestResult,
  type TestCase,
} from "@/data/help/test-suite"

/**
 * Panel de Testing del Chatbot
 * Permite ejecutar pruebas y afinar el sistema
 */
export function HelpTestingPanel() {
  const [results, setResults] = useState<ReturnType<typeof runTestSuite> | null>(null)
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null)
  const [filter, setFilter] = useState<TestCase["category"] | "all">("all")
  const [running, setRunning] = useState(false)

  const runTests = async () => {
    setRunning(true)
    setSelectedTest(null)

    // Simular delay para ver el loading
    await new Promise((resolve) => setTimeout(resolve, 500))

    const filterObj = filter !== "all" ? { category: filter } : undefined
    const testResults = runTestSuite(filterObj)

    setResults(testResults)
    setRunning(false)
  }

  const downloadReport = () => {
    if (!results) return

    const report = generateTestReport(results)
    const blob = new Blob([report], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chatbot-test-report-${new Date().toISOString().split("T")[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getCategoryColor = (category: TestCase["category"]) => {
    const colors: Record<TestCase["category"], string> = {
      valida: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      generica: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      queja: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      meta: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      ambigua: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      incorrecta: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }
    return colors[category]
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 dark:text-green-400"
    if (score >= 0.65) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">🧪 Testing del Chatbot</h2>
        <p className="text-sm text-muted-foreground">
          Ejecuta pruebas para validar y afinar el sistema de ayuda
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controles de Prueba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Todas ({TEST_CASES.length})
            </Button>
            <Button
              variant={filter === "valida" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("valida")}
            >
              Válidas ({TEST_CASES.filter((c) => c.category === "valida").length})
            </Button>
            <Button
              variant={filter === "generica" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("generica")}
            >
              Genéricas ({TEST_CASES.filter((c) => c.category === "generica").length})
            </Button>
            <Button
              variant={filter === "queja" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("queja")}
            >
              Quejas ({TEST_CASES.filter((c) => c.category === "queja").length})
            </Button>
            <Button
              variant={filter === "meta" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("meta")}
            >
              Meta ({TEST_CASES.filter((c) => c.category === "meta").length})
            </Button>
            <Button
              variant={filter === "ambigua" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("ambigua")}
            >
              Ambiguas ({TEST_CASES.filter((c) => c.category === "ambigua").length})
            </Button>
            <Button
              variant={filter === "incorrecta" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("incorrecta")}
            >
              Incorrectas ({TEST_CASES.filter((c) => c.category === "incorrecta").length})
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={runTests} disabled={running} className="flex-1">
              {running ? "⏳ Ejecutando..." : "▶️ Ejecutar Pruebas"}
            </Button>
            {results && (
              <Button variant="outline" onClick={downloadReport}>
                📥 Descargar Reporte
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {results && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Pruebas</CardDescription>
              <CardTitle className="text-3xl">{results.summary.total}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pasadas</CardDescription>
              <CardTitle className="text-3xl text-green-600">{results.summary.passed}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Falladas</CardDescription>
              <CardTitle className="text-3xl text-red-600">{results.summary.failed}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tasa de Éxito</CardDescription>
              <CardTitle className="text-3xl">
                {results.summary.passRate.toFixed(1)}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Results by Category */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(results.summary.byCategory).map(([category, stats]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryColor(category as TestCase["category"])}>
                      {category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {stats.passed}/{stats.total} pruebas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full ${
                          stats.rate === 100
                            ? "bg-green-500"
                            : stats.rate >= 80
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${stats.rate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{stats.rate.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Test Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados Detallados</CardTitle>
            <CardDescription>
              Haz clic en una prueba para ver detalles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.results.map((result) => (
                <div
                  key={result.testCase.id}
                  className={`cursor-pointer rounded-lg border p-3 transition hover:bg-accent ${
                    selectedTest?.testCase.id === result.testCase.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedTest(result)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{result.passed ? "✅" : "❌"}</span>
                        <Badge className={getCategoryColor(result.testCase.category)} variant="outline">
                          {result.testCase.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {result.testCase.section}
                        </span>
                      </div>
                      <p className="font-medium">{result.testCase.query}</p>
                      {result.topMatch && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Match:</span>
                          <code className="rounded bg-muted px-1 py-0.5 text-xs">
                            {result.topMatch.entry.id}
                          </code>
                          <span className={`font-medium ${getScoreColor(result.topMatch.score)}`}>
                            {(result.topMatch.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Test Details */}
      {selectedTest && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles: {selectedTest.testCase.id}</CardTitle>
            <CardDescription>{selectedTest.testCase.query}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Categoría:</span>
                <Badge className={getCategoryColor(selectedTest.testCase.category)}>
                  {selectedTest.testCase.category}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Sección:</span>{" "}
                <span className="text-sm text-muted-foreground">{selectedTest.testCase.section}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Comportamiento esperado:</span>{" "}
                <span className="text-sm text-muted-foreground">
                  {selectedTest.testCase.expectedBehavior}
                </span>
              </div>
            </div>

            {/* Query Validation */}
            <div className="rounded-md border p-3">
              <h4 className="mb-2 font-medium">Validación de Query</h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Válida:</span>{" "}
                  {selectedTest.queryValidation.isValid ? "✅ Sí" : "❌ No"}
                </div>
                {selectedTest.queryValidation.reason && (
                  <div>
                    <span className="font-medium">Razón:</span>{" "}
                    <code className="text-xs">{selectedTest.queryValidation.reason}</code>
                  </div>
                )}
                {selectedTest.isMeta && (
                  <div className="text-purple-600 dark:text-purple-400">
                    🔮 Detectada como meta-question
                  </div>
                )}
              </div>
            </div>

            {/* Top Match */}
            {selectedTest.topMatch && (
              <div className="rounded-md border p-3">
                <h4 className="mb-2 font-medium">Mejor Match</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Entry ID:</span>{" "}
                    <code className="text-xs">{selectedTest.topMatch.entry.id}</code>
                  </div>
                  <div>
                    <span className="font-medium">Pregunta:</span>{" "}
                    <span className="text-muted-foreground">{selectedTest.topMatch.entry.question}</span>
                  </div>
                  <div>
                    <span className="font-medium">Score:</span>{" "}
                    <span className={getScoreColor(selectedTest.topMatch.score)}>
                      {(selectedTest.topMatch.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Tipo de Match:</span>{" "}
                    <code className="text-xs">{selectedTest.topMatch.matchType}</code>
                  </div>
                  {selectedTest.responseValidation && (
                    <div>
                      <span className="font-medium">Relevante:</span>{" "}
                      {selectedTest.responseValidation.isRelevant ? "✅ Sí" : "❌ No"}
                      {selectedTest.responseValidation.reason && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({selectedTest.responseValidation.reason})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Issues */}
            {selectedTest.issues.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                <h4 className="mb-2 font-medium text-red-800 dark:text-red-200">Issues</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-red-700 dark:text-red-300">
                  {selectedTest.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {selectedTest.suggestions.length > 0 && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                <h4 className="mb-2 font-medium text-blue-800 dark:text-blue-200">Sugerencias</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  {selectedTest.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* All Matches */}
            {selectedTest.matches.length > 1 && (
              <div className="rounded-md border p-3">
                <h4 className="mb-2 font-medium">Otros Matches</h4>
                <div className="space-y-2">
                  {selectedTest.matches.slice(1, 3).map((match, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex items-center justify-between">
                        <code className="text-xs">{match.entry.id}</code>
                        <span className={getScoreColor(match.score)}>
                          {(match.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{match.entry.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
