"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  createRestaurantTable,
  deleteRestaurantTable,
  getRestaurantTables,
  updateRestaurantTable,
  type RestaurantTable,
} from "./tables.api"
import { useVerticalConfig } from "@/hooks/use-vertical-config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Bath, CircleCheck, Flame, LayoutGrid, Map, Pencil, Snowflake, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TableFloorPlan } from "./table-floor-plan"
import { useKitchenSocket } from "@/hooks/use-kitchen-socket"

const TABLE_STATUS_OPTIONS: RestaurantTable["status"][] = [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "DISABLED",
]

const STATUS_LABELS: Record<RestaurantTable["status"], string> = {
  AVAILABLE: "Disponible",
  OCCUPIED: "Ocupada",
  RESERVED: "Reservada",
  DISABLED: "Limpieza",
}

const STATUS_BADGE_CLASS: Record<RestaurantTable["status"], string> = {
  AVAILABLE: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
  OCCUPIED: "border-rose-500/40 text-rose-200 bg-rose-500/10",
  RESERVED: "border-amber-500/40 text-amber-200 bg-amber-500/10",
  DISABLED: "border-sky-500/40 text-sky-200 bg-sky-500/10",
}

const STATUS_BORDER_CLASS: Record<RestaurantTable["status"], string> = {
  AVAILABLE: "border-emerald-500/40",
  OCCUPIED: "border-rose-500/40",
  RESERVED: "border-amber-500/40",
  DISABLED: "border-sky-500/40",
}

export default function RestaurantTablesPage() {
  const { info: verticalInfo } = useVerticalConfig()
  const verticalName = verticalInfo?.businessVertical ?? "GENERAL"

  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<RestaurantTable["status"] | "ALL">("ALL")
  const [form, setForm] = useState({
    name: "",
    code: "",
    status: "AVAILABLE" as RestaurantTable["status"],
    capacity: "",
    area: "",
  })

  const isRestaurant = verticalName === "RESTAURANTS"
  const [viewMode, setViewMode] = useState<"cards" | "floorplan">("cards")
  const [floorEditMode, setFloorEditMode] = useState(false)

  const loadTables = useCallback(async () => {
    if (!isRestaurant) return
    setLoading(true)
    try {
      const data = await getRestaurantTables()
      setTables(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar las mesas."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [isRestaurant])

  useEffect(() => {
    loadTables()
  }, [loadTables])

  // Real-time table status updates via WebSocket
  useKitchenSocket({
    enabled: isRestaurant,
    onTableUpdate: useCallback(() => {
      void loadTables()
    }, [loadTables]),
    onOrderUpdate: useCallback(() => {
      void loadTables()
    }, [loadTables]),
  })

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Completa el nombre y el codigo de la mesa.")
      return
    }
    try {
      await createRestaurantTable({
        name: form.name.trim(),
        code: form.code.trim(),
        status: form.status,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        area: form.area.trim() || undefined,
      })
      toast.success("Mesa creada correctamente.")
      setForm({
        name: "",
        code: "",
        status: "AVAILABLE",
        capacity: "",
        area: "",
      })
      await loadTables()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la mesa."
      toast.error(message)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteRestaurantTable(id)
      toast.success("Mesa eliminada.")
      await loadTables()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar la mesa."
      toast.error(message)
    }
  }

  const handleStatusChange = async (id: number, status: RestaurantTable["status"]) => {
    try {
      await updateRestaurantTable(id, { status })
      toast.success("Estado de mesa actualizado.")
      await loadTables()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar la mesa."
      toast.error(message)
    }
  }

  const emptyState = useMemo(() => tables.length === 0 && !loading, [tables, loading])
  const filteredTables = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return tables.filter((table) => {
      const matchesStatus = statusFilter === "ALL" || table.status === statusFilter
      if (!matchesStatus) return false
      if (!query) return true
      return (
        table.name?.toLowerCase().includes(query) ||
        table.code?.toLowerCase().includes(query) ||
        table.area?.toLowerCase().includes(query)
      )
    })
  }, [tables, searchTerm, statusFilter])

  const totalCount = tables.length
  const statusCounts = useMemo(() => {
    const base = {
      AVAILABLE: 0,
      OCCUPIED: 0,
      RESERVED: 0,
      DISABLED: 0,
    }
    tables.forEach((table) => {
      base[table.status] += 1
    })
    return base
  }, [tables])

  if (!isRestaurant) {
    return (
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Mesas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Este modulo solo esta disponible para el vertical de restaurantes.
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
      <section className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Gestión de mesas
            </h1>
            <p className="text-sm text-muted-foreground">
              Organiza el plano del salón y controla disponibilidad en tiempo real.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/10 p-0.5">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Tarjetas
              </Button>
              <Button
                variant={viewMode === "floorplan" ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setViewMode("floorplan")}
              >
                <Map className="h-3.5 w-3.5" /> Plano
              </Button>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Vertical Restaurantes
            </Badge>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs uppercase text-muted-foreground">Libres</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{statusCounts.AVAILABLE}</p>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-xs uppercase text-muted-foreground">Ocupadas</p>
            <p className="mt-2 text-2xl font-semibold text-rose-300">{statusCounts.OCCUPIED}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs uppercase text-muted-foreground">Reservadas</p>
            <p className="mt-2 text-2xl font-semibold text-amber-300">{statusCounts.RESERVED}</p>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
            <p className="text-xs uppercase text-muted-foreground">Limpieza</p>
            <p className="mt-2 text-2xl font-semibold text-sky-300">{statusCounts.DISABLED}</p>
          </div>
        </div>

        {viewMode === "floorplan" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Plano del salon</CardTitle>
              <Button
                variant={floorEditMode ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setFloorEditMode((v) => !v)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {floorEditMode ? "Listo" : "Editar plano"}
              </Button>
            </CardHeader>
            <CardContent>
              <TableFloorPlan
                tables={tables}
                editMode={floorEditMode}
                onPositionSaved={loadTables}
                onTableClick={(table) => {
                  if (table.currentOrderId) {
                    window.open(`/dashboard/restaurant-orders/${table.currentOrderId}`, "_blank")
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

        <div className={cn("grid gap-6", viewMode === "cards" ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]" : "lg:grid-cols-1")} style={{ display: viewMode === "floorplan" ? "none" : undefined }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Nueva mesa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Mesa Terraza"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Codigo</Label>
                  <Input
                    value={form.code}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, code: event.target.value }))
                    }
                    placeholder="M-01"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Estado inicial</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        status: value as RestaurantTable["status"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacidad</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.capacity}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, capacity: event.target.value }))
                    }
                    placeholder="4"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ubicacion / Area</Label>
                <Input
                  value={form.area}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, area: event.target.value }))
                  }
                  placeholder="Salon principal"
                />
              </div>
              <Button className="w-full cursor-pointer" onClick={handleSubmit}>
                Guardar mesa
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Mesas registradas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar mesa, codigo o ambiente..."
                  className="h-10"
                />
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as RestaurantTable["status"] | "ALL")}
                >
                  <SelectTrigger className="h-10 w-full lg:w-[200px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los estados</SelectItem>
                    {TABLE_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{loading ? "Actualizando..." : `${totalCount} mesas activas`}</span>
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={loadTables}>
                  Recargar
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={statusFilter === "ALL" ? "default" : "outline"}
                  size="sm"
                  className="rounded-full cursor-pointer"
                  onClick={() => setStatusFilter("ALL")}
                >
                  Todas <span className="ml-2 text-xs text-muted-foreground">{totalCount}</span>
                </Button>
                {TABLE_STATUS_OPTIONS.map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    className={cn("rounded-full cursor-pointer", statusFilter === status && "border-transparent")}
                    onClick={() => setStatusFilter(status)}
                  >
                    {STATUS_LABELS[status]}
                    <span className="ml-2 text-xs text-muted-foreground">{statusCounts[status]}</span>
                  </Button>
                ))}
              </div>
              {filteredTables.length === 0 && emptyState ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                  No hay mesas registradas aun.
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                  No se encontraron mesas con esos filtros.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <div key={`skeleton-${i}`} className="rounded-2xl border border-white/10 p-4">
                        <div className="space-y-2">
                          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-32 animate-pulse rounded bg-muted/70" />
                          <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
                        </div>
                      </div>
                    ))
                  ) : (
                    filteredTables.map((table) => (
                      <div
                        key={table.id}
                        className={cn(
                          "rounded-2xl border bg-muted/20 p-4 shadow-sm transition hover:-translate-y-1",
                          STATUS_BORDER_CLASS[table.status],
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">{table.code}</p>
                            <h3 className="text-base font-semibold">{table.name}</h3>
                          </div>
                          <Badge variant="outline" className={STATUS_BADGE_CLASS[table.status]}>
                            {STATUS_LABELS[table.status]}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border border-white/10 px-2 py-1">
                            Capacidad {table.capacity ?? "-"}
                          </span>
                          <span className="rounded-full border border-white/10 px-2 py-1">
                            {table.area ?? "General"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <TooltipProvider delayDuration={200}>
                            <div className="flex flex-wrap gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 cursor-pointer border-emerald-400/40 text-emerald-200 transition-all duration-200 hover:scale-105 hover:border-emerald-300/70 hover:text-emerald-100 hover:shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                                    disabled={table.status === "AVAILABLE"}
                                    onClick={() => handleStatusChange(table.id, "AVAILABLE")}
                                  >
                                    <CircleCheck className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Liberar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 cursor-pointer border-amber-400/40 text-amber-200 transition-all duration-200 hover:scale-105 hover:border-amber-300/70 hover:text-amber-100 hover:shadow-[0_0_18px_rgba(245,158,11,0.35)]"
                                    disabled={table.status === "RESERVED"}
                                    onClick={() => handleStatusChange(table.id, "RESERVED")}
                                  >
                                    <Snowflake className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reservar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 cursor-pointer border-rose-400/40 text-rose-200 transition-all duration-200 hover:scale-105 hover:border-rose-300/70 hover:text-rose-100 hover:shadow-[0_0_18px_rgba(244,63,94,0.35)]"
                                    disabled={table.status === "OCCUPIED"}
                                    onClick={() => handleStatusChange(table.id, "OCCUPIED")}
                                  >
                                    <Flame className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ocupar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 cursor-pointer border-sky-400/40 text-sky-200 transition-all duration-200 hover:scale-105 hover:border-sky-300/70 hover:text-sky-100 hover:shadow-[0_0_18px_rgba(56,189,248,0.35)]"
                                    disabled={table.status === "DISABLED"}
                                    onClick={() => handleStatusChange(table.id, "DISABLED")}
                                  >
                                    <Bath className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Limpieza</TooltipContent>
                              </Tooltip>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 cursor-pointer text-destructive transition-all duration-200 hover:scale-105 hover:text-destructive hover:shadow-[0_0_18px_rgba(239,68,68,0.35)]"
                                  onClick={() => handleDelete(table.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
