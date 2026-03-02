"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ChefHat, Clock, Flame, TimerReset, CheckCircle2, HandPlatter, Wifi, WifiOff } from "lucide-react"

import {
  createKitchenStation,
  deleteKitchenStation,
  getKitchenQueue,
  getKitchenStations,
  updateKitchenItemStatus,
  type KitchenOrder,
  type KitchenStation,
} from "./kitchen.api"
import { useVerticalConfig } from "@/hooks/use-vertical-config"
import { useKitchenSocket } from "@/hooks/use-kitchen-socket"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { KITCHEN_GUIDE_STEPS } from "./kitchen-guide-steps"

export default function KitchenPage() {
  const { info: verticalInfo } = useVerticalConfig()
  const verticalName = verticalInfo?.businessVertical ?? "GENERAL"
  const isRestaurant = verticalName === "RESTAURANTS"

  const [stations, setStations] = useState<KitchenStation[]>([])
  const [queue, setQueue] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [queueLoading, setQueueLoading] = useState(false)
  const [compactView, setCompactView] = useState(false)
  const [flashItemId, setFlashItemId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: "",
    code: "",
    isActive: true,
  })

  const loadStations = useCallback(async () => {
    if (!isRestaurant) return
    setLoading(true)
    try {
      const data = await getKitchenStations()
      setStations(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar las estaciones."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [isRestaurant])

  const [selectedStation, setSelectedStation] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "COOKING" | "READY" | "SERVED"
  >("ALL")

  const loadQueue = useCallback(async () => {
    if (!isRestaurant) return
    setQueueLoading(true)
    try {
      const stationId =
        selectedStation === "all" ? undefined : Number(selectedStation)
      const data = await getKitchenQueue(stationId)
      setQueue(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar la comanda."
      toast.error(message)
    } finally {
      setQueueLoading(false)
    }
  }, [isRestaurant, selectedStation])

  useEffect(() => {
    loadStations()
  }, [loadStations])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  // Real-time kitchen updates via WebSocket (falls back to polling if disconnected)
  const { connected: socketConnected } = useKitchenSocket({
    enabled: isRestaurant,
    onOrderUpdate: useCallback(() => {
      void loadQueue()
    }, [loadQueue]),
  })

  // Fallback polling only when WebSocket is disconnected
  useEffect(() => {
    if (!isRestaurant || socketConnected) return
    const interval = setInterval(() => {
      void loadQueue()
    }, 15_000)
    return () => clearInterval(interval)
  }, [isRestaurant, socketConnected, loadQueue])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Completa el nombre y el codigo de la estacion.")
      return
    }
    try {
      await createKitchenStation({
        name: form.name.trim(),
        code: form.code.trim(),
        isActive: form.isActive,
      })
      toast.success("Estacion creada correctamente.")
      setForm({ name: "", code: "", isActive: true })
      await loadStations()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la estacion."
      toast.error(message)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteKitchenStation(id)
      toast.success("Estacion eliminada.")
      await loadStations()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar la estacion."
      toast.error(message)
    }
  }

  const playStatusSound = () => {
    try {
      const AudioContextRef =
        typeof window !== "undefined"
          ? (window.AudioContext || (window as any).webkitAudioContext)
          : null
      if (!AudioContextRef) return
      const ctx = new AudioContextRef()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = "sine"
      oscillator.frequency.value = 880
      gain.gain.value = 0.05
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
        ctx.close()
      }, 120)
    } catch {
      /* no-op */
    }
  }

  const handleAdvanceStatus = async (itemId: number, current: string) => {
    const next =
      current === "PENDING"
        ? "COOKING"
        : current === "COOKING"
          ? "READY"
          : current === "READY"
            ? "SERVED"
            : current
    try {
      await updateKitchenItemStatus(itemId, next as any)
      playStatusSound()
      setFlashItemId(itemId)
      setTimeout(() => setFlashItemId(null), 1200)
      toast.success("Estado actualizado.")
      await loadQueue()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar el item."
      toast.error(message)
    }
  }

  const queueEmpty = useMemo(
    () => queue.length === 0 && !queueLoading,
    [queue, queueLoading],
  )

  const statusCounts = useMemo(() => {
    const base = {
      PENDING: 0,
      COOKING: 0,
      READY: 0,
      SERVED: 0,
    }
    queue.forEach((order) => {
      order.items.forEach((item) => {
        if (base[item.status as keyof typeof base] !== undefined) {
          base[item.status as keyof typeof base] += 1
        }
      })
    })
    return base
  }, [queue])

  const statusMeta = useMemo(
    () => ({
      PENDING: {
        label: "Pendientes",
        tone: "amber",
        action: "Empezar",
      },
      COOKING: {
        label: "Preparando",
        tone: "orange",
        action: "Listo",
      },
      READY: {
        label: "Listos",
        tone: "emerald",
        action: "Servir",
      },
      SERVED: {
        label: "Servidos",
        tone: "sky",
        action: "Servido",
      },
    }),
    [],
  )

  const visibleStatuses = useMemo(
    () =>
      statusFilter === "ALL"
        ? (["PENDING", "COOKING", "READY", "SERVED"] as const)
        : ([statusFilter] as const),
    [statusFilter],
  )

  const groupedByStatus = useMemo(() => {
    const grouped: Record<
      string,
      {
        order: KitchenOrder
        items: KitchenOrder["items"]
      }[]
    > = {}
    visibleStatuses.forEach((status) => {
      grouped[status] = []
    })
    queue.forEach((order) => {
      visibleStatuses.forEach((status) => {
        const items = order.items.filter((item) => item.status === status)
        if (items.length > 0) {
          grouped[status].push({ order, items })
        }
      })
    })
    return grouped
  }, [queue, visibleStatuses])

  const formatElapsed = (openedAt: string) => {
    const diff = Date.now() - new Date(openedAt).getTime()
    if (Number.isNaN(diff)) return "0m"
    const minutes = Math.max(0, Math.floor(diff / 60000))
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remaining = minutes % 60
    return `${hours}h ${remaining}m`
  }

  const getElapsedMinutes = (openedAt: string) => {
    const diff = Date.now() - new Date(openedAt).getTime()
    if (Number.isNaN(diff)) return 0
    return Math.max(0, Math.floor(diff / 60000))
  }

  const formatOrderType = (orderType: KitchenOrder["orderType"]) => {
    switch (orderType) {
      case "DINE_IN":
        return "Mesa"
      case "TAKEAWAY":
        return "Para llevar"
      case "DELIVERY":
        return "Delivery"
      default:
        return orderType
    }
  }

  const emptyState = useMemo(() => stations.length === 0 && !loading, [stations, loading])

  if (!isRestaurant) {
    return (
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Cocina</CardTitle>
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Comanda y cocina
              </h1>
              <PageGuideButton steps={KITCHEN_GUIDE_STEPS} tooltipLabel="Guía de cocina" />
            </div>
            <p className="text-sm text-muted-foreground">
              Coordina estaciones y prepara pedidos con visibilidad en tiempo real.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {socketConnected ? (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 gap-1">
                <Wifi className="h-3 w-3" /> En vivo
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/30 text-amber-400 gap-1">
                <WifiOff className="h-3 w-3" /> Polling
              </Badge>
            )}
            <Badge variant="outline" className="border-primary/30 text-primary">
              Vertical Restaurantes
            </Badge>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Nueva estacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Cocina caliente"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Codigo</Label>
                  <Input
                    value={form.code}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, code: event.target.value }))
                    }
                    placeholder="CK-01"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <div>
                    <Label>Activa</Label>
                    <p className="text-xs text-muted-foreground">
                      Disponible para comandas.
                    </p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(value) =>
                      setForm((prev) => ({ ...prev, isActive: value }))
                    }
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate}>
                Guardar estacion
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Estaciones activas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{loading ? "Actualizando..." : `${stations.length} estaciones`}</span>
                <Button variant="outline" size="sm" onClick={loadStations}>
                  Recargar
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estacion</TableHead>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stations.map((station) => (
                    <TableRow key={station.id}>
                      <TableCell className="font-medium">{station.name}</TableCell>
                      <TableCell>{station.code}</TableCell>
                      <TableCell>
                        <Badge
                          variant={station.isActive ? "default" : "secondary"}
                          className={!station.isActive ? "bg-muted text-muted-foreground" : ""}
                        >
                          {station.isActive ? "Activa" : "Pausada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(station.id)}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {emptyState && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No hay estaciones registradas aun.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ChefHat className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base font-semibold">Panel de comandas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gestiona pedidos en tiempo real y avanza estados por item.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">
                <span>Vista compacta</span>
                <Switch checked={compactView} onCheckedChange={setCompactView} />
              </div>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder="Estación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las estaciones</SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={String(station.id)}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="h-9 w-[170px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                  <SelectItem value="COOKING">Preparando</SelectItem>
                  <SelectItem value="READY">Listos</SelectItem>
                  <SelectItem value="SERVED">Servidos</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadQueue}>
                Recargar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  Pendientes
                  <TimerReset className="h-4 w-4 text-amber-300" />
                </div>
                <p className="mt-2 text-lg font-semibold text-amber-200">{statusCounts.PENDING}</p>
              </div>
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  Preparando
                  <Flame className="h-4 w-4 text-orange-300" />
                </div>
                <p className="mt-2 text-lg font-semibold text-orange-200">{statusCounts.COOKING}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  Listos
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </div>
                <p className="mt-2 text-lg font-semibold text-emerald-200">{statusCounts.READY}</p>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  Servidos
                  <HandPlatter className="h-4 w-4 text-sky-300" />
                </div>
                <p className="mt-2 text-lg font-semibold text-sky-200">{statusCounts.SERVED}</p>
              </div>
            </div>
            {queueEmpty && (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay comandas pendientes por ahora.
              </div>
            )}
            <div className={cn("grid gap-4", compactView ? "lg:grid-cols-2" : "lg:grid-cols-4")}>
              {visibleStatuses.map((status) => {
                const meta = statusMeta[status]
                const groups = groupedByStatus[status] ?? []
                return (
                  <div
                    key={status}
                    className={cn(
                      "rounded-2xl border border-white/5 bg-muted/10 p-3",
                      status === "PENDING" && "bg-amber-500/5 border-amber-500/20",
                      status === "COOKING" && "bg-orange-500/5 border-orange-500/20",
                      status === "READY" && "bg-emerald-500/5 border-emerald-500/20",
                      status === "SERVED" && "bg-sky-500/5 border-sky-500/20",
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {groups.reduce((acc, group) => acc + group.items.length, 0)} items
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-white/10 text-xs",
                          status === "PENDING" && "border-amber-500/40 text-amber-200 bg-amber-500/10",
                          status === "COOKING" && "border-orange-500/40 text-orange-200 bg-orange-500/10",
                          status === "READY" && "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
                          status === "SERVED" && "border-sky-500/40 text-sky-200 bg-sky-500/10",
                        )}
                      >
                        {statusCounts[status]}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {groups.length === 0 && (
                        <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-muted-foreground">
                          Sin items por ahora.
                        </div>
                      )}
                      {groups.map(({ order, items }) => (
                        <Card key={`${status}-${order.id}`} className="border-white/10 bg-background/80">
                          <CardHeader className="space-y-2 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-sm font-semibold">
                                  {order.table ? `Mesa ${order.table.code}` : "Pedido sin mesa"}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  Orden #{order.id} - {formatOrderType(order.orderType)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {formatElapsed(order.openedAt)}
                                {getElapsedMinutes(order.openedAt) >= 15 && (
                                  <Badge className="bg-red-500/15 text-red-200 border border-red-500/40">
                                    Demora
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {order.notes && (
                              <p className="text-xs text-muted-foreground">{order.notes}</p>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className={cn(
                                  "rounded-xl border border-white/10 bg-muted/20 p-3 transition-all space-y-2",
                                  flashItemId === item.id && "ring-2 ring-primary/50",
                                )}
                              >
                                <div>
                                  <p className="text-sm font-medium">{item.product?.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity} &times; {item.unitPrice.toFixed(2)}
                                  </p>
                                  {item.station?.name && (
                                    <p className="text-[11px] text-muted-foreground">
                                      Estacion: {item.station.name}
                                    </p>
                                  )}
                                  {item.notes && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "border-white/10 text-xs",
                                      status === "PENDING" && "border-amber-500/40 text-amber-200 bg-amber-500/10",
                                      status === "COOKING" && "border-orange-500/40 text-orange-200 bg-orange-500/10",
                                      status === "READY" && "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
                                      status === "SERVED" && "border-sky-500/40 text-sky-200 bg-sky-500/10",
                                    )}
                                  >
                                    {meta.label}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="cursor-pointer"
                                    disabled={item.status === "SERVED"}
                                    onClick={() => handleAdvanceStatus(item.id, item.status)}
                                  >
                                    {meta.action}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
