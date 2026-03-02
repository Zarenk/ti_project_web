"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import {
  Search,
  X,
  Download,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  Store,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarDatePicker } from "@/components/calendar-date-picker"
import { Badge } from "@/components/ui/badge"
import { ManualPagination } from "@/components/data-table-pagination"
import { useDebounce } from "@/app/hooks/useDebounce"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import {
  exportGlobalActivity,
  getActivityActors,
  getActivitySummary,
  getGlobalActivity,
} from "./history.api"

type ActivityRow = {
  id: string
  username: string
  action: string
  entityType: string | null
  entityId?: string | null
  organizationName?: string | null
  companyName?: string | null
  ip?: string | null
  summary: string | null
  diff?: unknown | null
  createdAt: string
}

type OrgOption = { organizationId: number; name: string | null; count: number }
type CompanyOption = {
  companyId: number
  name: string | null
  organizationId: number
  count: number
}

const DEFAULT_PAGE_SIZE = 10

const formatDate = (value: string) => {
  try {
    return format(new Date(value), "dd/MM/yyyy")
  } catch {
    return value
  }
}

const formatTime = (value: string) => {
  try {
    return format(new Date(value), "HH:mm:ss")
  } catch {
    return ""
  }
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Creacion",
  UPDATED: "Edicion",
  DELETED: "Eliminacion",
  LOGIN: "Inicio de sesion",
  LOGOUT: "Cierre de sesion",
  OTHER: "Otro",
}

const resolveSeverity = (action: string) => {
  const normalized = action?.toUpperCase?.() ?? ""
  if (normalized === "DELETED") {
    return {
      label: "Alta",
      className:
        "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900",
    }
  }
  if (normalized === "CREATED" || normalized === "UPDATED") {
    return {
      label: "Media",
      className:
        "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900",
    }
  }
  return {
    label: "Baja",
    className:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900",
  }
}

const formatDiff = (diff: unknown) => {
  if (diff === null || diff === undefined) return ""
  if (typeof diff === "string") return diff
  try {
    return JSON.stringify(diff, null, 2)
  } catch {
    return String(diff)
  }
}

/** Animated chip for active filters */
function FilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground animate-in fade-in-0 zoom-in-95 duration-200">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors cursor-pointer"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

export function GlobalActivityTable(): React.ReactElement {
  // Data
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<ActivityRow | null>(null)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAction, setSelectedAction] = useState<string>("ALL")
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL")
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL")
  const [selectedUser, setSelectedUser] = useState<string>("ALL")
  const [selectedOrg, setSelectedOrg] = useState<string>("ALL")
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [sortValue, setSortValue] = useState("createdAt_desc")

  // Pagination
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Filter options
  const [actions, setActions] = useState<string[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [users, setUsers] = useState<
    Array<{ actorId: number; actorEmail: string | null }>
  >([])

  // Mobile filter panel
  const [filtersOpen, setFiltersOpen] = useState(false)

  const uniqueUsers = useMemo(() => {
    const map = new Map<
      number,
      { actorId: number; actorEmail: string | null }
    >()
    users.forEach((user) => {
      if (!map.has(user.actorId)) {
        map.set(user.actorId, user)
      }
    })
    return Array.from(map.values())
  }, [users])

  // Cascading: filter companies by selected org
  const filteredCompanies = useMemo(() => {
    if (selectedOrg === "ALL") return companies
    const orgId = Number(selectedOrg)
    return companies.filter((c) => c.organizationId === orgId)
  }, [companies, selectedOrg])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const dateFrom = dateRange?.from ? dateRange.from.toISOString() : undefined
  const dateTo = dateRange?.to ? dateRange.to.toISOString() : undefined
  const debouncedSearchTerm = useDebounce(searchTerm, 400)
  const debouncedSelectedAction = useDebounce(selectedAction, 400)
  const debouncedSelectedEntity = useDebounce(selectedEntity, 400)
  const debouncedSelectedSeverity = useDebounce(selectedSeverity, 400)
  const debouncedSelectedUser = useDebounce(selectedUser, 400)
  const debouncedSelectedOrg = useDebounce(selectedOrg, 400)
  const debouncedSelectedCompany = useDebounce(selectedCompany, 400)
  const debouncedDateFrom = useDebounce(dateFrom, 400)
  const debouncedDateTo = useDebounce(dateTo, 400)

  // Load filter options
  useEffect(() => {
    let active = true
    setOptionsLoading(true)

    const loadOptions = async () => {
      try {
        const [summary, actorList] = await Promise.all([
          getActivitySummary({
            dateFrom: debouncedDateFrom,
            dateTo: debouncedDateTo,
            excludeContextUpdates: true,
          }),
          getActivityActors({
            dateFrom: debouncedDateFrom,
            dateTo: debouncedDateTo,
            excludeContextUpdates: true,
          }),
        ])

        if (!active) return
        const s = summary as any
        const actionOptions =
          s?.byAction
            ?.map((entry: any) => entry.action)
            .filter(Boolean) ?? []
        const entityOptions =
          s?.byEntity
            ?.map((entry: any) => entry.entityType)
            .filter(Boolean) ?? []

        setActions(actionOptions)
        setEntities(entityOptions)
        setUsers(Array.isArray(actorList) ? actorList : [])
        setOrgs(
          Array.isArray(s?.byOrganization) ? s.byOrganization : [],
        )
        setCompanies(
          Array.isArray(s?.byCompany) ? s.byCompany : [],
        )
      } catch (err) {
        console.error("Error cargando filtros globales:", err)
        if (!active) return
        setActions([])
        setEntities([])
        setUsers([])
        setOrgs([])
        setCompanies([])
      } finally {
        if (active) setOptionsLoading(false)
      }
    }

    loadOptions()
    return () => {
      active = false
    }
  }, [debouncedDateFrom, debouncedDateTo])

  // Load data
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const fetchActivity = async () => {
      try {
        const [sortBy, sortDir] = sortValue.split("_")
        const response = await getGlobalActivity({
          page: pageIndex + 1,
          pageSize,
          q: debouncedSearchTerm.trim() || undefined,
          actorId:
            debouncedSelectedUser !== "ALL"
              ? debouncedSelectedUser
              : undefined,
          action:
            debouncedSelectedAction !== "ALL"
              ? debouncedSelectedAction
              : undefined,
          entityType:
            debouncedSelectedEntity !== "ALL"
              ? debouncedSelectedEntity
              : undefined,
          severity:
            debouncedSelectedSeverity !== "ALL"
              ? debouncedSelectedSeverity
              : undefined,
          dateFrom: debouncedDateFrom,
          dateTo: debouncedDateTo,
          excludeContextUpdates: true,
          sortBy,
          sortDir,
          filterOrgId:
            debouncedSelectedOrg !== "ALL"
              ? Number(debouncedSelectedOrg)
              : undefined,
          filterCompanyId:
            debouncedSelectedCompany !== "ALL"
              ? Number(debouncedSelectedCompany)
              : undefined,
        })

        if (!active) return
        const data = response as any
        const items = data?.items ?? []
        const mapped = items.map((entry: any) => ({
          id: entry.id,
          username: entry.actorEmail ?? "-",
          action: entry.action ?? "-",
          entityType: entry.entityType ?? "-",
          entityId: entry.entityId ?? "-",
          organizationName: entry.organization?.name ?? "-",
          companyName: entry.company?.name ?? "-",
          ip: entry.ip ?? "-",
          summary: entry.summary ?? "",
          diff: entry.diff ?? null,
          createdAt: entry.createdAt,
        }))
        setRows(mapped)
        setTotal(data?.total ?? 0)
      } catch (err) {
        if (!active) return
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo cargar el historial global."
        setError(message)
        setRows([])
        setTotal(0)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchActivity()
    return () => {
      active = false
    }
  }, [
    pageIndex,
    pageSize,
    debouncedSearchTerm,
    debouncedSelectedUser,
    debouncedSelectedAction,
    debouncedSelectedEntity,
    debouncedSelectedSeverity,
    debouncedSelectedOrg,
    debouncedSelectedCompany,
    debouncedDateFrom,
    debouncedDateTo,
    sortValue,
  ])

  const handleResetFilters = useCallback(() => {
    setSearchTerm("")
    setSelectedAction("ALL")
    setSelectedEntity("ALL")
    setSelectedSeverity("ALL")
    setSelectedUser("ALL")
    setSelectedOrg("ALL")
    setSelectedCompany("ALL")
    setDateRange(undefined)
    setSortValue("createdAt_desc")
    setPageIndex(0)
  }, [])

  // Active filter detection
  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = []

    if (selectedOrg !== "ALL") {
      const org = orgs.find(
        (o) => String(o.organizationId) === selectedOrg,
      )
      chips.push({
        key: "org",
        label: `Org: ${org?.name ?? selectedOrg}`,
        clear: () => {
          setSelectedOrg("ALL")
          setSelectedCompany("ALL")
          setPageIndex(0)
        },
      })
    }
    if (selectedCompany !== "ALL") {
      const company = companies.find(
        (c) => String(c.companyId) === selectedCompany,
      )
      chips.push({
        key: "company",
        label: `Empresa: ${company?.name ?? selectedCompany}`,
        clear: () => {
          setSelectedCompany("ALL")
          setPageIndex(0)
        },
      })
    }
    if (selectedUser !== "ALL") {
      const user = uniqueUsers.find(
        (u) => String(u.actorId) === selectedUser,
      )
      chips.push({
        key: "user",
        label: `Usuario: ${user?.actorEmail ?? selectedUser}`,
        clear: () => {
          setSelectedUser("ALL")
          setPageIndex(0)
        },
      })
    }
    if (selectedAction !== "ALL") {
      chips.push({
        key: "action",
        label: `Accion: ${ACTION_LABELS[selectedAction] ?? selectedAction}`,
        clear: () => {
          setSelectedAction("ALL")
          setPageIndex(0)
        },
      })
    }
    if (selectedEntity !== "ALL") {
      chips.push({
        key: "entity",
        label: `Modulo: ${selectedEntity}`,
        clear: () => {
          setSelectedEntity("ALL")
          setPageIndex(0)
        },
      })
    }
    if (selectedSeverity !== "ALL") {
      const map: Record<string, string> = {
        HIGH: "Alta",
        MEDIUM: "Media",
        LOW: "Baja",
      }
      chips.push({
        key: "severity",
        label: `Severidad: ${map[selectedSeverity] ?? selectedSeverity}`,
        clear: () => {
          setSelectedSeverity("ALL")
          setPageIndex(0)
        },
      })
    }
    if (dateRange?.from || dateRange?.to) {
      const fromStr = dateRange?.from
        ? format(dateRange.from, "dd/MM/yy")
        : "..."
      const toStr = dateRange?.to ? format(dateRange.to, "dd/MM/yy") : "..."
      chips.push({
        key: "date",
        label: `Fecha: ${fromStr} - ${toStr}`,
        clear: () => {
          setDateRange(undefined)
          setPageIndex(0)
        },
      })
    }
    return chips
  }, [
    selectedOrg,
    selectedCompany,
    selectedUser,
    selectedAction,
    selectedEntity,
    selectedSeverity,
    dateRange,
    orgs,
    companies,
    uniqueUsers,
  ])

  const isFiltered = activeFilters.length > 0 || Boolean(searchTerm.trim())

  const handleExport = async () => {
    try {
      setExporting(true)
      const [sortBy, sortDir] = sortValue.split("_")
      const blob = await exportGlobalActivity({
        q: searchTerm.trim() || undefined,
        actorId: selectedUser !== "ALL" ? selectedUser : undefined,
        action: selectedAction !== "ALL" ? selectedAction : undefined,
        entityType: selectedEntity !== "ALL" ? selectedEntity : undefined,
        severity: selectedSeverity !== "ALL" ? selectedSeverity : undefined,
        dateFrom,
        dateTo,
        excludeContextUpdates: true,
        sortBy,
        sortDir,
        filterOrgId:
          selectedOrg !== "ALL" ? Number(selectedOrg) : undefined,
        filterCompanyId:
          selectedCompany !== "ALL"
            ? Number(selectedCompany)
            : undefined,
      })
      const url = window.URL.createObjectURL(blob as Blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `movimientos-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error al exportar movimientos:", error)
    } finally {
      setExporting(false)
    }
  }

  // Reset company when org changes
  useEffect(() => {
    if (selectedOrg === "ALL") {
      setSelectedCompany("ALL")
    }
  }, [selectedOrg])

  // ── Filter Selects ──────────────────────────────────
  const filterSelects = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* Organization */}
      <Select
        value={selectedOrg}
        onValueChange={(value) => {
          setSelectedOrg(value)
          setPageIndex(0)
        }}
        disabled={optionsLoading}
      >
        <SelectTrigger className="w-full cursor-pointer">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <SelectValue placeholder="Organizacion" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas las organizaciones</SelectItem>
          {orgs.map((org) => (
            <SelectItem
              key={`org-${org.organizationId}`}
              value={String(org.organizationId)}
            >
              {org.name ?? `Org ${org.organizationId}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Company (cascading) */}
      <Select
        value={selectedCompany}
        onValueChange={(value) => {
          setSelectedCompany(value)
          setPageIndex(0)
        }}
        disabled={optionsLoading || filteredCompanies.length === 0}
      >
        <SelectTrigger className="w-full cursor-pointer">
          <div className="flex items-center gap-2">
            <Store className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <SelectValue placeholder="Empresa" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas las empresas</SelectItem>
          {filteredCompanies.map((company) => (
            <SelectItem
              key={`company-${company.companyId}`}
              value={String(company.companyId)}
            >
              {company.name ?? `Empresa ${company.companyId}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* User */}
      <Select
        value={selectedUser}
        onValueChange={(value) => {
          setSelectedUser(value)
          setPageIndex(0)
        }}
        disabled={optionsLoading}
      >
        <SelectTrigger className="w-full cursor-pointer">
          <SelectValue placeholder="Usuario" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos los usuarios</SelectItem>
          {uniqueUsers.map((user) => (
            <SelectItem
              key={`user-${user.actorId}`}
              value={String(user.actorId)}
            >
              {user.actorEmail ?? `Usuario ${user.actorId}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Action */}
      <Select
        value={selectedAction}
        onValueChange={(value) => {
          setSelectedAction(value)
          setPageIndex(0)
        }}
        disabled={optionsLoading}
      >
        <SelectTrigger className="w-full cursor-pointer">
          <SelectValue placeholder="Accion" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas las acciones</SelectItem>
          {actions.map((action) => (
            <SelectItem key={action} value={action}>
              {ACTION_LABELS[action] ?? action}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Module */}
      <Select
        value={selectedEntity}
        onValueChange={(value) => {
          setSelectedEntity(value)
          setPageIndex(0)
        }}
        disabled={optionsLoading}
      >
        <SelectTrigger className="w-full cursor-pointer">
          <SelectValue placeholder="Modulo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos los modulos</SelectItem>
          {entities.map((entity) => (
            <SelectItem key={entity} value={entity}>
              {entity}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Severity */}
      <Select
        value={selectedSeverity}
        onValueChange={(value) => {
          setSelectedSeverity(value)
          setPageIndex(0)
        }}
      >
        <SelectTrigger className="w-full cursor-pointer">
          <SelectValue placeholder="Severidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas las severidades</SelectItem>
          <SelectItem value="HIGH">Alta (eliminaciones)</SelectItem>
          <SelectItem value="MEDIUM">Media (creaciones/ediciones)</SelectItem>
          <SelectItem value="LOW">Baja (login/otros)</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={sortValue}
        onValueChange={(value) => {
          setSortValue(value)
          setPageIndex(0)
        }}
      >
        <SelectTrigger className="w-full cursor-pointer">
          <SelectValue placeholder="Orden" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt_desc">Fecha (reciente)</SelectItem>
          <SelectItem value="createdAt_asc">Fecha (antigua)</SelectItem>
          <SelectItem value="actorEmail_asc">Usuario (A-Z)</SelectItem>
          <SelectItem value="actorEmail_desc">Usuario (Z-A)</SelectItem>
          <SelectItem value="action_asc">Accion (A-Z)</SelectItem>
          <SelectItem value="action_desc">Accion (Z-A)</SelectItem>
          <SelectItem value="entityType_asc">Modulo (A-Z)</SelectItem>
          <SelectItem value="entityType_desc">Modulo (Z-A)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* ── Row 1: Search + Date + Export ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por resumen, entidad o usuario..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setPageIndex(0)
            }}
            className="pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CalendarDatePicker
            className="h-9 w-full sm:w-auto"
            variant="outline"
            date={dateRange || { from: undefined, to: undefined }}
            onDateSelect={(range) => {
              setDateRange(range)
              setPageIndex(0)
            }}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExport}
                  disabled={exporting}
                  className="h-9 w-9 flex-shrink-0 cursor-pointer"
                >
                  <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Row 2: Advanced Filters (collapsible on mobile) ── */}
      <div className="hidden md:block">
        {filterSelects}
      </div>
      <div className="md:hidden">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros avanzados
                {activeFilters.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
                  >
                    {activeFilters.length}
                  </Badge>
                )}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 animate-in slide-in-from-top-2 duration-200">
            {filterSelects}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── Row 3: Active Filter Chips ── */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in-0 duration-200">
          {activeFilters.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              onRemove={chip.clear}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Limpiar todo
          </Button>
        </div>
      )}

      {/* ── Error ── */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Table ── */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Modulo</TableHead>
                <TableHead className="w-[80px]">Entidad ID</TableHead>
                <TableHead>Organizacion</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="w-[60px]">IP</TableHead>
                <TableHead className="max-w-[320px]">Resumen</TableHead>
                <TableHead className="w-[100px]">Fecha</TableHead>
                <TableHead className="w-[80px]">Hora</TableHead>
                <TableHead className="w-[70px]">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={`loading-${i}`}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length ? (
                rows.map((row) => {
                  const severity = resolveSeverity(row.action)
                  return (
                    <TableRow key={row.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${severity.className}`}
                          >
                            {severity.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {row.entityType ?? "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {row.entityId ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.organizationName ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.companyName ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {row.ip ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <p className="truncate text-sm">{row.summary ?? "-"}</p>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {formatTime(row.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => setSelectedRow(row)}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No hay movimientos para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Detail Dialog ── */}
      <Dialog
        open={Boolean(selectedRow)}
        onOpenChange={(open) => !open && setSelectedRow(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del movimiento</DialogTitle>
          </DialogHeader>
          {selectedRow ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Usuario</p>
                  <p>{selectedRow.username}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Severidad</p>
                  {(() => {
                    const severity = resolveSeverity(selectedRow.action)
                    return (
                      <Badge className={`text-[11px] ${severity.className}`}>
                        {severity.label}
                      </Badge>
                    )
                  })()}
                </div>
                <div>
                  <p className="text-muted-foreground">Accion</p>
                  <p>
                    {ACTION_LABELS[selectedRow.action] ?? selectedRow.action}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Modulo</p>
                  <p>{selectedRow.entityType ?? "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entidad ID</p>
                  <p>{selectedRow.entityId ?? "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p>
                    {formatDate(selectedRow.createdAt)}{" "}
                    <span className="text-muted-foreground">
                      {formatTime(selectedRow.createdAt)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Organizacion</p>
                  <p>{selectedRow.organizationName ?? "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Empresa</p>
                  <p>{selectedRow.companyName ?? "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">IP</p>
                  <p>{selectedRow.ip ?? "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground">Resumen</p>
                <div className="mt-1 rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
                  {selectedRow.summary || "Sin resumen"}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground">Cambios (diff)</p>
                <pre className="mt-1 max-h-[240px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                  {formatDiff(selectedRow.diff) || "Sin cambios"}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Pagination ── */}
      <ManualPagination
        currentPage={pageIndex + 1}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={(page) => setPageIndex(page - 1)}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPageIndex(0)
        }}
        pageSizeOptions={[10, 20, 50]}
      />
    </div>
  )
}
