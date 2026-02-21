"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  Search,
  Trash2,
  ExternalLink,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { LEGAL_DOCUMENTS_GUIDE_STEPS } from "./legal-documents-guide-steps"
import {
  getAllLegalDocuments,
  deleteLegalDocument,
  downloadLegalDocument,
  type LegalDocumentWithMatter,
} from "../legal-matters.api"

const DOC_TYPE_LABELS: Record<string, string> = {
  DEMANDA: "Demanda",
  CONTESTACION: "Contestacion",
  RECURSO: "Recurso",
  ESCRITO: "Escrito",
  RESOLUCION: "Resolucion",
  SENTENCIA: "Sentencia",
  CARTA_NOTARIAL: "Carta Notarial",
  CONTRATO: "Contrato",
  PODER: "Poder",
  ACTA: "Acta",
  PERICIA: "Pericia",
  DICTAMEN: "Dictamen",
  OTRO: "Otro",
}

const MIME_ICONS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "text/plain": "TXT",
  "image/jpeg": "JPG",
  "image/png": "PNG",
}

function formatDate(date: string | null) {
  if (!date) return "\u2014"
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LegalDocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<LegalDocumentWithMatter[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")

  async function loadDocuments() {
    try {
      setLoading(true)
      const data = await getAllLegalDocuments({
        search: search.trim() || undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
      })
      setDocuments(data)
    } catch (err: any) {
      toast.error(err?.message || "Error al cargar documentos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [typeFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDocuments()
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  async function handleDownload(id: number) {
    try {
      await downloadLegalDocument(id)
    } catch (err: any) {
      toast.error(err?.message || "Error al descargar el documento")
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este documento?")) return
    try {
      await deleteLegalDocument(id)
      toast.success("Documento eliminado")
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar")
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Documentos Legales</h1>
        <PageGuideButton steps={LEGAL_DOCUMENTS_GUIDE_STEPS} tooltipLabel="Guía de documentos" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por titulo o nombre de archivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los tipos</SelectItem>
                {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {loading
              ? "Cargando..."
              : `${documents.length} documento${documents.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando documentos...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No se encontraron documentos
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                      {doc.mimeType
                        ? MIME_ICONS[doc.mimeType] || "DOC"
                        : "DOC"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {DOC_TYPE_LABELS[doc.type] || doc.type}
                        </Badge>
                        {doc.fileName && (
                          <span className="truncate max-w-[200px]">
                            {doc.fileName}
                          </span>
                        )}
                        {doc.fileSize && (
                          <span>{formatFileSize(doc.fileSize)}</span>
                        )}
                        <span>{formatDate(doc.createdAt)}</span>
                        {doc.uploadedBy && (
                          <span>por {doc.uploadedBy.username}</span>
                        )}
                      </div>
                      {doc.matter && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          Exp: {doc.matter.internalCode || ""}{" "}
                          {doc.matter.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Descargar"
                      onClick={() => handleDownload(doc.id)}
                    >
                      <Download className="h-4 w-4 text-green-600" />
                    </Button>
                    {doc.matter && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver expediente"
                        onClick={() =>
                          router.push(`/dashboard/legal/${doc.matter!.id}`)
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
