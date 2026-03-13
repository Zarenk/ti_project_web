"use client"

import { useCallback, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  BookOpen,
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import { pdf } from "@react-pdf/renderer"
import { ManualPagination } from "@/components/data-table-pagination"
import {
  getComplaints,
  getComplaintStats,
  getComplaintDetail,
  exportComplaintsCsv,
  type ComplaintItem,
  type ComplaintStats,
} from "./libro-reclamaciones.api"
import { ComplaintDeadlineBadge } from "./components/complaint-deadline-badge"
import { ComplaintDetailDialog } from "./components/complaint-detail-dialog"
import { ComplaintSheetPdf } from "./components/ComplaintSheetPdf"

export default function LibroReclamacionesPage() {
  const [data, setData] = useState<ComplaintItem[]>([])
  const [stats, setStats] = useState<ComplaintStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Detail dialog
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  const loadData = useCallback(async () => {
    try {
      const [list, statsData] = await Promise.all([
        getComplaints({
          page,
          pageSize,
          ...(statusFilter && { status: statusFilter }),
          ...(typeFilter && { complaintType: typeFilter }),
          ...(searchQuery && { search: searchQuery }),
        }),
        getComplaintStats(),
      ])
      setData(list.data)
      setTotal(list.total)
      setStats(statsData)
    } catch (error) {
      toast.error("Error al cargar reclamaciones")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, pageSize, statusFilter, typeFilter, searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleViewDetail = async (id: number) => {
    try {
      const detail = await getComplaintDetail(id)
      setSelectedComplaint(detail)
      setDialogOpen(true)
    } catch {
      toast.error("Error al cargar detalle")
    }
  }

  const handleExportPdf = async (complaint: ComplaintItem) => {
    try {
      const doc = <ComplaintSheetPdf complaint={complaint} />
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reclamacion-${complaint.correlativeNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al generar PDF")
    }
  }

  const handleExportCsv = async () => {
    try {
      await exportComplaintsCsv({
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { complaintType: typeFilter }),
      })
      toast.success("CSV exportado")
    } catch {
      toast.error("Error al exportar CSV")
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 overflow-hidden p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 flex-shrink-0" />
          <h1 className="text-xl font-bold sm:text-2xl">
            Libro de Reclamaciones
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="cursor-pointer"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.responded}
              </p>
              <p className="text-xs text-muted-foreground">Respondidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {stats.overdue}
              </p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, documento, correlativo..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v === "ALL" ? "" : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full cursor-pointer sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="cursor-pointer">Todos</SelectItem>
            <SelectItem value="PENDING" className="cursor-pointer">Pendiente</SelectItem>
            <SelectItem value="RESPONDED" className="cursor-pointer">Respondido</SelectItem>
            <SelectItem value="OVERDUE" className="cursor-pointer">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v === "ALL" ? "" : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full cursor-pointer sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="cursor-pointer">Todos</SelectItem>
            <SelectItem value="RECLAMO" className="cursor-pointer">Reclamo</SelectItem>
            <SelectItem value="QUEJA" className="cursor-pointer">Queja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No se encontraron reclamaciones.
        </div>
      ) : (
        <>
          <div className="w-full min-w-0 overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correlativo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden sm:table-cell">Consumidor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Plazo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {c.correlativeNumber}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(c.createdAt).toLocaleDateString("es-PE")}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate sm:table-cell">
                      {c.consumerName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.complaintType === "RECLAMO"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {c.complaintType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ComplaintDeadlineBadge
                        remainingDays={c.remainingBusinessDays}
                        status={c.status}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetail(c.id)}
                          className="h-8 w-8 cursor-pointer"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExportPdf(c)}
                          className="h-8 w-8 cursor-pointer"
                          title="Descargar PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ManualPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </>
      )}

      {/* Detail Dialog */}
      <ComplaintDetailDialog
        complaint={selectedComplaint}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdated={() => {
          loadData()
        }}
      />
    </div>
  )
}
