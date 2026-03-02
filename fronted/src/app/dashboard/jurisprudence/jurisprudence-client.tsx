"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Upload,
  Trash2,
  Download,
  Globe,
  Loader2,
  RefreshCw,
  Eye,
  FileDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { JURISPRUDENCE_GUIDE_STEPS } from "./jurisprudence-guide-steps"
import { ManualPagination } from "@/components/data-table-pagination"
import { toast } from "sonner"
import {
  getJurisprudenceDocuments,
  getCoverageStats,
  deleteJurisprudenceDocument,
  downloadJurisprudenceDocument,
  triggerScraping,
  getScrapingJobs,
  type JurisprudenceDocument,
  type CoverageStats,
  type ScrapeJob,
} from "./jurisprudence.api"

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  DOWNLOADING: "Descargando",
  EXTRACTING: "Extrayendo",
  OCR_REQUIRED: "OCR Requerido",
  OCR_IN_PROGRESS: "OCR en Progreso",
  EMBEDDING: "Generando Embeddings",
  COMPLETED: "Completado",
  COMPLETED_WITH_WARNINGS: "Completado con Advertencias",
  FAILED: "Fallido",
  MANUAL_REQUIRED: "Revisión Manual",
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

export function JurisprudenceClient() {
  const router = useRouter()
  const [documents, setDocuments] = useState<JurisprudenceDocument[]>([])
  const [stats, setStats] = useState<CoverageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [courtFilter, setCourtFilter] = useState<string>("all")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null)

  // Scraping
  const [scrapeDialogOpen, setScrapeDialogOpen] = useState(false)
  const [scrapeStartYear, setScrapeStartYear] = useState("")
  const [scrapeEndYear, setScrapeEndYear] = useState("")
  const [scrapingInProgress, setScrapingInProgress] = useState(false)
  const [scrapeJobs, setScrapeJobs] = useState<ScrapeJob[]>([])
  const [showJobs, setShowJobs] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const filters: {
        page: number
        limit: number
        court?: string
        year?: number
        status?: string
      } = {
        page: currentPage,
        limit: pageSize,
      }

      if (courtFilter !== "all") filters.court = courtFilter
      if (yearFilter !== "all") filters.year = parseInt(yearFilter)
      if (statusFilter !== "all") filters.status = statusFilter

      const [documentsData, statsData] = await Promise.all([
        getJurisprudenceDocuments(filters),
        getCoverageStats(),
      ])

      setDocuments(documentsData.documents)
      setTotalPages(documentsData.pagination.totalPages)
      setTotalItems(documentsData.pagination.total)
      setStats(statsData)
    } catch (err) {
      toast.error("Error al cargar documentos de jurisprudencia")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, courtFilter, yearFilter, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadData])

  // Extract unique courts and years from documents for filters
  const uniqueCourts = Array.from(
    new Set(documents.map((doc) => doc.court))
  ).sort()

  const uniqueYears = Array.from(
    new Set(documents.map((doc) => doc.year))
  ).sort((a, b) => b - a)

  const handleDelete = async () => {
    if (!documentToDelete) return

    try {
      await deleteJurisprudenceDocument(documentToDelete)
      toast.success("Documento eliminado correctamente")
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
      void loadData()
    } catch (err) {
      toast.error("Error al eliminar documento")
      console.error(err)
    }
  }

  const confirmDelete = (id: number) => {
    setDocumentToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleStartScraping = async () => {
    try {
      setScrapingInProgress(true)
      const result = await triggerScraping(
        "Corte Suprema",
        scrapeStartYear ? parseInt(scrapeStartYear) : undefined,
        scrapeEndYear ? parseInt(scrapeEndYear) : undefined,
      )
      toast.success(
        `Importación iniciada (Job #${result.jobId}). Los documentos se descargarán y procesarán automáticamente.`,
      )
      setScrapeDialogOpen(false)
      setScrapeStartYear("")
      setScrapeEndYear("")
      // Reload jobs
      loadScrapeJobs()
      setShowJobs(true)
    } catch (err: any) {
      toast.error(err.message || "Error al iniciar la importación")
    } finally {
      setScrapingInProgress(false)
    }
  }

  const loadScrapeJobs = async () => {
    try {
      const data = await getScrapingJobs(1, 10)
      setScrapeJobs(data.jobs)
    } catch {
      // Ignore — not critical
    }
  }

  useEffect(() => {
    if (showJobs) {
      loadScrapeJobs()
      // Auto-refresh every 10 seconds while jobs panel is open
      const interval = setInterval(loadScrapeJobs, 10000)
      return () => clearInterval(interval)
    }
  }, [showJobs])

  const JOB_STATUS_LABELS: Record<string, string> = {
    PENDING: "Pendiente",
    RUNNING: "En progreso",
    COMPLETED: "Completado",
    FAILED: "Fallido",
  }

  const JOB_STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-800",
    RUNNING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Jurisprudencia</h1>
          <PageGuideButton steps={JURISPRUDENCE_GUIDE_STEPS} tooltipLabel="Guía de jurisprudencia" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/jurisprudence/assistant")}
            className="cursor-pointer"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Asistente
          </Button>
          <Button
            variant="outline"
            onClick={() => setScrapeDialogOpen(true)}
            className="cursor-pointer"
          >
            <Globe className="mr-2 h-4 w-4" />
            Importar de PJ
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowJobs(!showJobs)}
            className="cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" />
            {showJobs ? "Ocultar Jobs" : "Ver Jobs"}
          </Button>
          <Button onClick={() => router.push("/dashboard/jurisprudence/upload")} className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            Subir Documento
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.withEmbeddings}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.withEmbeddingsPercentage.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.withoutEmbeddings}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.withoutEmbeddingsPercentage.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fallidos</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.failed}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.failedPercentage.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por expediente, título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={courtFilter} onValueChange={setCourtFilter}>
          <SelectTrigger className="w-full sm:w-[200px] cursor-pointer">
            <SelectValue placeholder="Juzgado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los juzgados</SelectItem>
            <SelectItem value="Corte Suprema">Corte Suprema</SelectItem>
            <SelectItem value="Corte Superior de Lima">Corte Superior de Lima</SelectItem>
            <SelectItem value="Tribunal Constitucional">Tribunal Constitucional</SelectItem>
            {uniqueCourts.map((court) => (
              <SelectItem key={court} value={court}>
                {court}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-[150px] cursor-pointer">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {uniqueYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px] cursor-pointer">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expediente</TableHead>
                  <TableHead>Juzgado</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Cargando documentos...
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8" />
                        <p>No hay documentos de jurisprudencia</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push("/dashboard/jurisprudence/upload")
                          }
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Subir primer documento
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  documents
                    .filter((doc) => {
                      if (!search.trim()) return true
                      const searchLower = search.toLowerCase()
                      return (
                        doc.expediente.toLowerCase().includes(searchLower) ||
                        doc.title.toLowerCase().includes(searchLower)
                      )
                    })
                    .map((doc) => (
                      <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/jurisprudence/${doc.id}`)}>
                        <TableCell>
                          <div className="font-medium text-primary">{doc.expediente}</div>
                          {doc.chamber && (
                            <div className="text-xs text-muted-foreground">
                              {doc.chamber}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.court}</Badge>
                        </TableCell>
                        <TableCell>{doc.year}</TableCell>
                        <TableCell>
                          <div className="max-w-md truncate" title={doc.title}>
                            {doc.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              STATUS_COLORS[doc.processingStatus] || "bg-gray-100"
                            }
                          >
                            {STATUS_LABELS[doc.processingStatus] ||
                              doc.processingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/jurisprudence/${doc.id}`)}
                              className="cursor-pointer"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await downloadJurisprudenceDocument(doc.id)
                                  toast.success("PDF descargado")
                                } catch (err: any) {
                                  toast.error(err.message || "Error al descargar")
                                }
                              }}
                              className="cursor-pointer"
                              title="Descargar PDF"
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDelete(doc.id)}
                              className="cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && documents.length > 0 && (
        <ManualPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(value) => {
            setPageSize(Number(value))
            setCurrentPage(1)
          }}
          pageSizeOptions={[10, 20, 30, 50]}
        />
      )}

      {/* Scraping Jobs Panel */}
      {showJobs && (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg">Jobs de Importación</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadScrapeJobs}
              className="cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="overflow-hidden">
            {scrapeJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay jobs de importación. Usa &quot;Importar de PJ&quot; para comenzar.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Corte</TableHead>
                      <TableHead>Años</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Encontrados</TableHead>
                      <TableHead>Descargados</TableHead>
                      <TableHead>Fallidos</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scrapeJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">#{job.id}</TableCell>
                        <TableCell className="text-sm">{job.court}</TableCell>
                        <TableCell className="text-sm">
                          {job.startYear && job.endYear
                            ? `${job.startYear}-${job.endYear}`
                            : job.startYear
                              ? `Desde ${job.startYear}`
                              : "Todos"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={JOB_STATUS_COLORS[job.status] || "bg-gray-100"}
                          >
                            {job.status === "RUNNING" && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            {JOB_STATUS_LABELS[job.status] || job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{job.documentsFound}</TableCell>
                        <TableCell className="text-sm text-green-600">
                          {job.documentsDownloaded}
                        </TableCell>
                        <TableCell className="text-sm text-red-600">
                          {job.documentsFailed}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(job.createdAt).toLocaleDateString("es-PE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scraping Dialog */}
      <Dialog open={scrapeDialogOpen} onOpenChange={setScrapeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Importar Jurisprudencia
            </DialogTitle>
            <DialogDescription>
              Descarga automáticamente documentos de jurisprudencia desde el Poder Judicial
              del Perú (Corte Suprema). Los PDFs se descargan, se extrae el texto y se
              generan embeddings para consultas con IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Corte</Label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>Corte Suprema del Perú</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Se importará de todas las secciones: Jurisprudencia Vinculante (Civil, Penal,
                Contencioso Administrativo), Plenos Casatorios, Sentencias Plenarias y Precedentes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startYear">Año inicio (opcional)</Label>
                <Input
                  id="startYear"
                  type="number"
                  placeholder="ej: 2015"
                  min={2000}
                  max={new Date().getFullYear()}
                  value={scrapeStartYear}
                  onChange={(e) => setScrapeStartYear(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endYear">Año fin (opcional)</Label>
                <Input
                  id="endYear"
                  type="number"
                  placeholder="ej: 2025"
                  min={2000}
                  max={new Date().getFullYear()}
                  value={scrapeEndYear}
                  onChange={(e) => setScrapeEndYear(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p>- Los documentos duplicados se detectan automáticamente y no se re-descargan.</p>
              <p>- Se respeta un límite de velocidad de 2 segundos entre cada descarga.</p>
              <p>- El proceso puede tomar varios minutos dependiendo de la cantidad de documentos.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScrapeDialogOpen(false)}
              className="cursor-pointer"
              disabled={scrapingInProgress}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStartScraping}
              disabled={scrapingInProgress}
              className="cursor-pointer"
            >
              {scrapingInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Iniciar Importación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento y sus embeddings
              serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
