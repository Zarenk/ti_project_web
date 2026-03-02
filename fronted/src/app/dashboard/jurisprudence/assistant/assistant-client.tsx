"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Send,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  queryJurisprudence,
  updateQueryFeedback,
  type RagResponse,
  type Source,
} from "../jurisprudence.api"

interface QueryResult {
  query: string
  response: RagResponse
  timestamp: Date
  queryId?: number
  feedback?: {
    helpful?: boolean
    citationsCorrect?: boolean
  }
}

const CONFIDENCE_CONFIG = {
  ALTA: {
    label: "Alta Confianza",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    description: "La respuesta está respaldada por múltiples fuentes relevantes",
  },
  MEDIA: {
    label: "Confianza Media",
    color: "bg-yellow-100 text-yellow-800",
    icon: Info,
    description: "La respuesta tiene respaldo parcial, revisar fuentes",
  },
  BAJA: {
    label: "Baja Confianza",
    color: "bg-orange-100 text-orange-800",
    icon: AlertTriangle,
    description: "Evidencia limitada, se requiere validación manual",
  },
  NO_CONCLUYENTE: {
    label: "No Concluyente",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    description: "Evidencia insuficiente para una respuesta confiable",
  },
}

export function JurisprudenceAssistantClient() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [querying, setQuerying] = useState(false)
  const [results, setResults] = useState<QueryResult[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Advanced filters
  const [courts, setCourts] = useState<string[]>([])
  const [minYear, setMinYear] = useState<number | undefined>(undefined)
  const [showFilters, setShowFilters] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [results])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) {
      toast.error("Ingrese una consulta")
      return
    }

    try {
      setQuerying(true)

      const options: {
        courts?: string[]
        minYear?: number
      } = {}

      if (courts.length > 0) options.courts = courts
      if (minYear) options.minYear = minYear

      const response = await queryJurisprudence(query.trim(), options)

      const newResult: QueryResult = {
        query: query.trim(),
        response,
        timestamp: new Date(),
      }

      setResults((prev) => [...prev, newResult])
      setQuery("")

      if (response.metadata.needsHumanReview) {
        toast.warning("Esta respuesta requiere revisión manual antes de usarla")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al consultar jurisprudencia"
      toast.error(message)
    } finally {
      setQuerying(false)
    }
  }

  const handleFeedback = async (
    index: number,
    helpful: boolean,
    citationsCorrect: boolean
  ) => {
    const result = results[index]
    if (!result.queryId) {
      toast.error("No se puede enviar feedback para esta consulta")
      return
    }

    try {
      await updateQueryFeedback(result.queryId, {
        helpful,
        citationsCorrect,
      })

      setResults((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
                ...r,
                feedback: { helpful, citationsCorrect },
              }
            : r
        )
      )

      toast.success("Gracias por tu feedback")
    } catch (error) {
      toast.error("Error al enviar feedback")
    }
  }

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Asistente de Jurisprudencia
            </h1>
            <p className="text-sm text-muted-foreground">
              Consulta precedentes judiciales con IA
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="cursor-pointer"
        >
          {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
        </Button>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este asistente busca en la base de jurisprudencia y proporciona respuestas con{" "}
          <strong>citas obligatorias</strong> a los documentos fuente. Verifica siempre las
          fuentes antes de usar la información en documentos legales.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Filtros de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Juzgados/Cortes</Label>
              <Select
                value={courts.join(",")}
                onValueChange={(value) =>
                  setCourts(value ? value.split(",") : [])
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Todos los juzgados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="Corte Suprema">Solo Corte Suprema</SelectItem>
                  <SelectItem value="Tribunal Constitucional">
                    Solo Tribunal Constitucional
                  </SelectItem>
                  <SelectItem value="Corte Suprema,Tribunal Constitucional">
                    Corte Suprema + TC
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Año Mínimo</Label>
              <Select
                value={minYear ? String(minYear) : ""}
                onValueChange={(value) =>
                  setMinYear(value ? parseInt(value) : undefined)
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Todos los años" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {[2020, 2015, 2010, 2005, 2000].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      Desde {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Area */}
      <div className="space-y-6">
        {results.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Haz una consulta para comenzar</p>
              <p className="text-sm mt-2">
                Ejemplo: "¿Cuál es el plazo de prescripción para delitos de robo?"
              </p>
            </CardContent>
          </Card>
        ) : (
          results.map((result, index) => (
            <div key={index} className="space-y-4">
              {/* User Query */}
              <div className="flex justify-end">
                <Card className="max-w-2xl bg-primary text-primary-foreground">
                  <CardContent className="pt-4">
                    <p>{result.query}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Assistant Response */}
              <div className="flex justify-start">
                <Card className="max-w-3xl w-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const config =
                          CONFIDENCE_CONFIG[result.response.confidence]
                        const Icon = config.icon
                        return (
                          <>
                            <Badge className={config.color}>
                              <Icon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {config.description}
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Answer */}
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{result.response.answer}</p>
                    </div>

                    {/* Sources */}
                    {result.response.sources.length > 0 && (
                      <Accordion type="single" collapsible>
                        <AccordionItem value="sources">
                          <AccordionTrigger className="text-sm cursor-pointer">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Fuentes ({result.response.sources.length})
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              {result.response.sources.map((source, idx) => (
                                <Card key={idx} className="border-l-4 border-primary">
                                  <CardContent className="pt-4">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline">
                                            {source.sourceId}
                                          </Badge>
                                          {source.citedInAnswer && (
                                            <Badge className="bg-green-100 text-green-800">
                                              Citada
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="font-medium text-sm">
                                          {source.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {source.court} • Exp. {source.expediente} •{" "}
                                          {source.year}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {source.section} • Págs.{" "}
                                          {source.pageNumbers.join(", ")}
                                        </p>
                                        <p className="text-sm mt-2 italic border-l-2 pl-2">
                                          "{source.excerpt}"
                                        </p>
                                      </div>
                                      <Badge variant="secondary" className="shrink-0">
                                        {(source.similarity * 100).toFixed(1)}%
                                      </Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    <Separator />

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex gap-4">
                        <span>Tokens: {result.response.tokensUsed}</span>
                        <span>Tiempo: {result.response.responseTime}ms</span>
                        <span>Costo: ${result.response.costUsd.toFixed(4)}</span>
                      </div>
                    </div>

                    {/* Feedback */}
                    {!result.feedback && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          ¿Te fue útil?
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(index, true, true)}
                          className="cursor-pointer"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(index, false, false)}
                          className="cursor-pointer"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {result.feedback && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {result.feedback.helpful ? (
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                        )}
                        <span>Gracias por tu feedback</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Query Input */}
      <form onSubmit={handleSubmit} className="sticky bottom-4 mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Ej: ¿Cuál es la jurisprudencia sobre responsabilidad civil extracontractual en accidentes de tránsito?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={querying}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSubmit(e)
                  }
                }}
              />
              <Button
                type="submit"
                disabled={querying || !query.trim()}
                size="icon"
                className="shrink-0 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Presiona Enter para enviar, Shift+Enter para nueva línea
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
