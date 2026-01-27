"use client"

import { useEffect, useMemo, useState } from "react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarDatePicker } from "@/components/calendar-date-picker"
import { Badge } from "@/components/ui/badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { exportGlobalActivity, getActivityActors, getActivitySummary, getGlobalActivity } from "./history.api"

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

const DEFAULT_PAGE_SIZE = 10

const formatDate = (value: string) => {
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm")
  } catch {
    return value
  }
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

export function GlobalActivityTable(): React.ReactElement {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<ActivityRow | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAction, setSelectedAction] = useState<string>("ALL")
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL")
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL")
  const [selectedUser, setSelectedUser] = useState<string>("ALL")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [sortValue, setSortValue] = useState("createdAt_desc")
  const [exporting, setExporting] = useState(false)
  const [actions, setActions] = useState<string[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [users, setUsers] = useState<
    Array<{ actorId: number; actorEmail: string | null }>
  >([])

  const uniqueUsers = useMemo(() => {
    const map = new Map<number, { actorId: number; actorEmail: string | null }>()
    users.forEach((user) => {
      if (!map.has(user.actorId)) {
        map.set(user.actorId, user)
      }
    })
    return Array.from(map.values())
  }, [users])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const dateFrom = dateRange?.from ? dateRange.from.toISOString() : undefined
  const dateTo = dateRange?.to ? dateRange.to.toISOString() : undefined
  const debouncedSearchTerm = useDebounce(searchTerm, 400)
  const debouncedSelectedAction = useDebounce(selectedAction, 400)
  const debouncedSelectedEntity = useDebounce(selectedEntity, 400)
  const debouncedSelectedSeverity = useDebounce(selectedSeverity, 400)
  const debouncedSelectedUser = useDebounce(selectedUser, 400)
  const debouncedDateFrom = useDebounce(dateFrom, 400)
  const debouncedDateTo = useDebounce(dateTo, 400)

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
        const actionOptions =
          summary?.byAction?.map((entry: any) => entry.action).filter(Boolean) ?? []
        const entityOptions =
          summary?.byEntity?.map((entry: any) => entry.entityType).filter(Boolean) ?? []

        setActions(actionOptions)
        setEntities(entityOptions)
        setUsers(Array.isArray(actorList) ? actorList : [])
      } catch (err) {
        console.error("Error cargando filtros globales:", err)
        if (!active) return
        setActions([])
        setEntities([])
        setUsers([])
      } finally {
        if (active) setOptionsLoading(false)
      }
    }

    loadOptions()

    return () => {
      active = false
    }
  }, [debouncedDateFrom, debouncedDateTo])

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
          actorId: debouncedSelectedUser !== "ALL" ? debouncedSelectedUser : undefined,
          action: debouncedSelectedAction !== "ALL" ? debouncedSelectedAction : undefined,
          entityType: debouncedSelectedEntity !== "ALL" ? debouncedSelectedEntity : undefined,
          severity: debouncedSelectedSeverity !== "ALL" ? debouncedSelectedSeverity : undefined,
          dateFrom: debouncedDateFrom,
          dateTo: debouncedDateTo,
          excludeContextUpdates: true,
          sortBy,
          sortDir,
        })

        if (!active) return
        const items = response?.items ?? []
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
        setTotal(response?.total ?? 0)
      } catch (err) {
        if (!active) return
        const message =
          err instanceof Error ? err.message : "No se pudo cargar el historial global."
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
    debouncedDateFrom,
    debouncedDateTo,
    sortValue,
  ])

  const handleResetFilters = () => {
    setSearchTerm("")
    setSelectedAction("ALL")
    setSelectedEntity("ALL")
    setSelectedSeverity("ALL")
    setSelectedUser("ALL")
    setDateRange(undefined)
    setSortValue("createdAt_desc")
    setPageIndex(0)
  }

  const isFiltered =
    Boolean(searchTerm.trim()) ||
    selectedAction !== "ALL" ||
    selectedEntity !== "ALL" ||
    selectedSeverity !== "ALL" ||
    selectedUser !== "ALL" ||
    Boolean(dateRange?.from || dateRange?.to)

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
      })
      const url = window.URL.createObjectURL(blob)
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

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <Input
            placeholder="Buscar por resumen, entidad o usuario..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setPageIndex(0)
            }}
            className="w-full"
          />
          <Select
            value={selectedUser}
            onValueChange={(value) => {
              setSelectedUser(value)
              setPageIndex(0)
            }}
            disabled={optionsLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los usuarios</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={`user-${user.actorId}`} value={String(user.actorId)}>
                  {user.actorEmail ?? `Usuario ${user.actorId}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedAction}
            onValueChange={(value) => {
              setSelectedAction(value)
              setPageIndex(0)
            }}
            disabled={optionsLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Accion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las acciones</SelectItem>
              {actions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedSeverity}
            onValueChange={(value) => {
              setSelectedSeverity(value)
              setPageIndex(0)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las severidades</SelectItem>
              <SelectItem value="HIGH">Alta (eliminaciones)</SelectItem>
              <SelectItem value="MEDIUM">Media (creaciones/ediciones)</SelectItem>
              <SelectItem value="LOW">Baja (login/otros)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedEntity}
            onValueChange={(value) => {
              setSelectedEntity(value)
              setPageIndex(0)
            }}
            disabled={optionsLoading}
          >
            <SelectTrigger className="w-full">
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
          <Select
            value={sortValue}
            onValueChange={(value) => {
              setSortValue(value)
              setPageIndex(0)
            }}
          >
            <SelectTrigger className="w-full">
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
          <CalendarDatePicker
            className="h-9 w-full"
            variant="outline"
            date={dateRange || { from: undefined, to: undefined }}
            onDateSelect={(range) => {
              setDateRange(range)
              setPageIndex(0)
            }}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {isFiltered && (
            <Button variant="ghost" onClick={handleResetFilters} className="h-8 px-2 lg:px-3">
              Reset
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Severidad</TableHead>
              <TableHead>Accion</TableHead>
              <TableHead>Modulo</TableHead>
              <TableHead>Entidad ID</TableHead>
              <TableHead>Organizacion</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Resumen</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={`loading-${i}`}>
                  <TableCell colSpan={11}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.username}</TableCell>
                  <TableCell>
                    {(() => {
                      const severity = resolveSeverity(row.action)
                      return <Badge className={`text-[11px] ${severity.className}`}>{severity.label}</Badge>
                    })()}
                  </TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.entityType ?? "-"}</TableCell>
                  <TableCell>{row.entityId ?? "-"}</TableCell>
                  <TableCell>{row.organizationName ?? "-"}</TableCell>
                  <TableCell>{row.companyName ?? "-"}</TableCell>
                  <TableCell>{row.ip ?? "-"}</TableCell>
                  <TableCell className="max-w-[420px] truncate">{row.summary ?? "-"}</TableCell>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRow(row)}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  No hay movimientos para los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
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
                  <p>{selectedRow.action}</p>
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
                  <p>{formatDate(selectedRow.createdAt)}</p>
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

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {rows.length} de {total} movimientos
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPageIndex(0)
            }}
          >
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="10 por pagina" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} por pagina
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
              disabled={pageIndex === 0}
            >
              Anterior
            </Button>
            <span className="text-sm">
              {pageIndex + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={pageIndex >= totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
