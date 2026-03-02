"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Scale,
  Plus,
  Search,
  FileText,
  Calendar,
  Users,
  AlertTriangle,
  Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { LEGAL_GUIDE_STEPS } from "./legal-guide-steps"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  getLegalMatters,
  getLegalStats,
  type LegalMatter,
  type LegalStats,
} from "./legal-matters.api"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  ARCHIVED: "Archivado",
  CLOSED: "Cerrado",
  WON: "Ganado",
  LOST: "Perdido",
  SETTLED: "Conciliado",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-slate-100 text-slate-800",
  CLOSED: "bg-blue-100 text-blue-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-red-100 text-red-800",
  SETTLED: "bg-purple-100 text-purple-800",
}

const AREA_LABELS: Record<string, string> = {
  CIVIL: "Civil",
  PENAL: "Penal",
  LABORAL: "Laboral",
  COMERCIAL: "Comercial",
  TRIBUTARIO: "Tributario",
  ADMINISTRATIVO: "Administrativo",
  CONSTITUCIONAL: "Constitucional",
  FAMILIA: "Familia",
  AMBIENTAL: "Ambiental",
  ADUANERO: "Aduanero",
  MIGRATORIO: "Migratorio",
  OTRO: "Otro",
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
}

export function LegalMattersClient() {
  const router = useRouter()
  const [matters, setMatters] = useState<LegalMatter[]>([])
  const [stats, setStats] = useState<LegalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [areaFilter, setAreaFilter] = useState<string>("all")

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const filters: { status?: string; area?: string; search?: string } = {}
      if (statusFilter !== "all") filters.status = statusFilter
      if (areaFilter !== "all") filters.area = areaFilter
      if (search.trim()) filters.search = search.trim()

      const [mattersData, statsData] = await Promise.all([
        getLegalMatters(filters),
        getLegalStats(),
      ])
      setMatters(mattersData)
      setStats(statsData)
    } catch (err) {
      toast.error("Error al cargar expedientes")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, areaFilter, search])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadData])

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Expedientes</h1>
          <PageGuideButton steps={LEGAL_GUIDE_STEPS} tooltipLabel="Guía de expedientes" />
        </div>
        <Button onClick={() => router.push("/dashboard/legal/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Expediente
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cerrados</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.closed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Eventos Pendientes
              </CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.upcomingEvents}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por titulo, codigo, juzgado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las areas</SelectItem>
            {Object.entries(AREA_LABELS).map(([key, label]) => (
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
                  <TableHead>Area</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="text-right">Docs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Cargando expedientes...
                    </TableCell>
                  </TableRow>
                ) : matters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-8 w-8" />
                        <p>No hay expedientes registrados</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push("/dashboard/legal/new")
                          }
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Crear primer expediente
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  matters.map((matter) => (
                    <TableRow
                      key={matter.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/dashboard/legal/${matter.id}`)
                      }
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{matter.title}</div>
                          {matter.internalCode && (
                            <div className="text-xs text-muted-foreground">
                              {matter.internalCode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {AREA_LABELS[matter.area] || matter.area}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            STATUS_COLORS[matter.status] || "bg-gray-100"
                          }
                        >
                          {STATUS_LABELS[matter.status] || matter.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            PRIORITY_COLORS[matter.priority] || ""
                          }
                        >
                          {PRIORITY_LABELS[matter.priority] || matter.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {matter.client?.name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {matter.assignedTo?.username || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
                          {matter._count && (
                            <>
                              <span title="Documentos">
                                {matter._count.documents} docs
                              </span>
                              <span title="Eventos">
                                {matter._count.events} ev
                              </span>
                            </>
                          )}
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
    </div>
  )
}
