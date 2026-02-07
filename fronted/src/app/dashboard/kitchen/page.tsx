"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ChefHat, Clock } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function KitchenPage() {
  const { info: verticalInfo } = useVerticalConfig()
  const verticalName = verticalInfo?.businessVertical ?? "GENERAL"
  const isRestaurant = verticalName === "RESTAURANTS"

  const [stations, setStations] = useState<KitchenStation[]>([])
  const [queue, setQueue] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [queueLoading, setQueueLoading] = useState(false)
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
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Comanda y cocina
            </h1>
            <p className="text-sm text-muted-foreground">
              Coordina estaciones y prepara pedidos con visibilidad en tiempo real.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            Vertical Restaurantes
          </Badge>
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
              <select
                value={selectedStation}
                onChange={(event) => setSelectedStation(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Todas las estaciones</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={loadQueue}>
                Recargar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {queueEmpty && (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay comandas pendientes por ahora.
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {queue.map((order) => (
                <Card key={order.id} className="border-muted/40">
                  <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-semibold">
                        {order.table ? `Mesa ${order.table.code}` : "Pedido sin mesa"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Orden #{order.id} · {order.orderType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {new Date(order.openedAt).toLocaleTimeString()}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-md border border-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} x {item.unitPrice.toFixed(2)}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.status}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdvanceStatus(item.id, item.status)}
                          >
                            Avanzar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
