"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  FileDown,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Eye,
  Layers,
  Hash,
  Calendar,
  Building,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { toast } from "sonner"
import {
  getDocumentDetail,
  downloadJurisprudenceDocument,
  processJurisprudenceDocument,
  type DocumentDetail,
} from "../jurisprudence.api"

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  DOWNLOADING: "Descargando",
  EXTRACTING: "Extrayendo texto",
  OCR_REQUIRED: "OCR Requerido",
  OCR_IN_PROGRESS: "OCR en Progreso",
  EMBEDDING: "Generando Embeddings",
  COMPLETED: "Completado",
  COMPLETED_WITH_WARNINGS: "Completado con Advertencias",
  FAILED: "Fallido",
  MANUAL_REQUIRED: "Revisión Manual",
}

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2,
  COMPLETED_WITH_WARNINGS: AlertTriangle,
  FAILED: XCircle,
  PENDING: Clock,
  DOWNLOADING: Loader2,
  EXTRACTING: Loader2,
  EMBEDDING: Loader2,
  OCR_REQUIRED: AlertTriangle,
  OCR_IN_PROGRESS: Loader2,
  MANUAL_REQUIRED: AlertTriangle,
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  DOWNLOADING: "bg-blue-100 text-blue-800",
  EXTRACTING: "bg-cyan-100 text-cyan-800",
  OCR_REQUIRED: "bg-yellow-100 text-yellow-800",
  OCR_IN_PROGRESS: "bg-amber-100 text-amber-800",
  EMBEDDING: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  COMPLETED_WITH_WARNINGS: "bg-lime-100 text-lime-800",
  FAILED: "bg-red-100 text-red-800",
  MANUAL_REQUIRED: "bg-orange-100 text-orange-800",
}

const STRUCTURE_LABELS: Record<string, string> = {
  SENTENCIA: "Sentencia",
  PARTE: "Parte",
  CONSIDERANDOS: "Considerandos",
  RESOLUTIVO: "Resolutivo",
  OTROS: "Otros",
}

export function JurisprudenceDetailClient() {
  const params = useParams()
  const router = useRouter()
  const docId = Number(params.id)

  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!docId || isNaN(docId)) return
    loadDocument()
  }, [docId])

  const loadDocument = async () => {
    try {
      setLoading(true)
      const data = await getDocumentDetail(docId)
      setDoc(data)
    } catch (err) {
      toast.error("Error al cargar documento")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      await downloadJurisprudenceDocument(docId)
      toast.success("PDF descargado")
    } catch (err: any) {
      toast.error(err.message || "Error al descargar")
    } finally {
      setDownloading(false)
    }
  }

  const handleReprocess = async () => {
    try {
      setProcessing(true)
      await processJurisprudenceDocument(docId)
      toast.success("Documento reprocesado correctamente")
      loadDocument()
    } catch (err: any) {
      toast.error(err.message || "Error al reprocesar")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center gap-4 p-12">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Documento no encontrado</p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/jurisprudence")}
          className="cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  const StatusIcon = STATUS_ICONS[doc.processingStatus] || Clock
  const pagesWithText = doc.pages?.filter((p) => p.hasText) || []
  const pagesNeedingOcr = doc.pages?.filter((p) => p.ocrRequired && !p.hasText) || []
  const totalPages = doc.pages?.length || 0
  const embeddingsCount = doc._count?.embeddings || 0
  const canReprocess = ["FAILED", "OCR_REQUIRED", "COMPLETED_WITH_WARNINGS", "MANUAL_REQUIRED"].includes(
    doc.processingStatus,
  )

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 w-full min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/jurisprudence")}
            className="cursor-pointer flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold break-words">{doc.title}</h1>
            <p className="text-sm text-muted-foreground">
              {doc.expediente} - {doc.court}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {canReprocess && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReprocess}
              disabled={processing}
              className="cursor-pointer"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reprocesar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="cursor-pointer"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="w-full min-w-0 overflow-hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <StatusIcon className="h-4 w-4 flex-shrink-0" />
              Estado
            </div>
            <Badge className={STATUS_COLORS[doc.processingStatus] || "bg-gray-100"}>
              {STATUS_LABELS[doc.processingStatus] || doc.processingStatus}
            </Badge>
          </CardContent>
        </Card>
        <Card className="w-full min-w-0 overflow-hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Layers className="h-4 w-4 flex-shrink-0" />
              Paginas
            </div>
            <p className="text-lg font-bold">
              {pagesWithText.length}
              <span className="text-sm font-normal text-muted-foreground">
                /{totalPages} con texto
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="w-full min-w-0 overflow-hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Hash className="h-4 w-4 flex-shrink-0" />
              Embeddings
            </div>
            <p className="text-lg font-bold">{embeddingsCount}</p>
          </CardContent>
        </Card>
        <Card className="w-full min-w-0 overflow-hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              Ano
            </div>
            <p className="text-lg font-bold">{doc.year}</p>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Metadata del Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Expediente</p>
              <p className="text-sm font-medium break-words">{doc.expediente}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Corte</p>
              <p className="text-sm font-medium">{doc.court}</p>
            </div>
            {doc.chamber && (
              <div>
                <p className="text-xs text-muted-foreground">Sala</p>
                <p className="text-sm font-medium">{doc.chamber}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Tipo de Fuente</p>
              <Badge variant="outline" className="text-xs">
                {doc.sourceType === "SCRAPED"
                  ? "Importado (PJ)"
                  : doc.sourceType === "MANUAL"
                    ? "Subido manual"
                    : "Importado"}
              </Badge>
            </div>
            {doc.sourceUrl && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">URL Fuente</p>
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {doc.sourceUrl}
                </a>
              </div>
            )}
            {doc.fileSize && (
              <div>
                <p className="text-xs text-muted-foreground">Tamano del archivo</p>
                <p className="text-sm font-medium">
                  {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Fecha de subida</p>
              <p className="text-sm font-medium">
                {new Date(doc.createdAt).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OCR Warning */}
      {pagesNeedingOcr.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 w-full min-w-0 overflow-hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3 w-full min-w-0">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {pagesNeedingOcr.length} pagina(s) requieren OCR
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Estas paginas son imagenes escaneadas y no se pudo extraer texto directamente.
                  El contenido de estas paginas no esta disponible para consultas RAG hasta que
                  se procese con OCR.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="text" className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            Texto Extraido
          </TabsTrigger>
          {doc.sections && doc.sections.length > 0 && (
            <TabsTrigger value="sections" className="cursor-pointer">
              <BookOpen className="mr-2 h-4 w-4" />
              Secciones
            </TabsTrigger>
          )}
          <TabsTrigger value="pdf" className="cursor-pointer">
            <Eye className="mr-2 h-4 w-4" />
            Ver PDF
          </TabsTrigger>
        </TabsList>

        {/* Extracted Text Tab */}
        <TabsContent value="text" className="mt-4">
          {pagesWithText.length === 0 ? (
            <Card className="w-full min-w-0 overflow-hidden">
              <CardContent className="py-8 text-center">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  No hay texto extraido para este documento.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {doc.processingStatus === "OCR_REQUIRED"
                    ? "Este PDF es una imagen escaneada y necesita OCR."
                    : doc.processingStatus === "PENDING"
                      ? "El documento esta pendiente de procesamiento."
                      : "El texto aun no ha sido extraido."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="w-full" defaultValue={["page-1"]}>
              {pagesWithText.map((page) => (
                <AccordionItem key={page.pageNumber} value={`page-${page.pageNumber}`}>
                  <AccordionTrigger className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span>Pagina {page.pageNumber}</span>
                      {page.ocrRequired && (
                        <Badge variant="outline" className="text-xs text-yellow-600">
                          OCR
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md border bg-muted/30 p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed break-words">
                        {page.rawText || "(Sin texto)"}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        {/* Sections Tab */}
        {doc.sections && doc.sections.length > 0 && (
          <TabsContent value="sections" className="mt-4">
            <Accordion type="multiple" className="w-full">
              {doc.sections.map((section, idx) => (
                <AccordionItem key={idx} value={`section-${idx}`}>
                  <AccordionTrigger className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {STRUCTURE_LABELS[section.structureType] || section.structureType}
                        {section.sectionName && ` - ${section.sectionName}`}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        pp. {section.startPage}-{section.endPage}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md border bg-muted/30 p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed break-words">
                        {section.sectionText}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        )}

        {/* PDF Viewer Tab */}
        <TabsContent value="pdf" className="mt-4">
          <Card className="w-full min-w-0 overflow-hidden">
            <CardContent className="p-0">
              <iframe
                src={`/api/jurisprudence-documents/${doc.id}/download`}
                className="w-full h-[70vh] border-0 rounded-md"
                title={`PDF - ${doc.title}`}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
