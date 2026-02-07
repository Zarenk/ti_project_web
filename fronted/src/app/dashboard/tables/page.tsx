"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  createRestaurantTable,
  deleteRestaurantTable,
  getRestaurantTables,
  type RestaurantTable,
} from "./tables.api"
import { useVerticalConfig } from "@/hooks/use-vertical-config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

const TABLE_STATUS_OPTIONS: RestaurantTable["status"][] = [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "CLEANING",
]

const STATUS_LABELS: Record<RestaurantTable["status"], string> = {
  AVAILABLE: "Disponible",
  OCCUPIED: "Ocupada",
  RESERVED: "Reservada",
  CLEANING: "Limpieza",
}

const STATUS_BADGE_CLASS: Record<RestaurantTable["status"], string> = {
  AVAILABLE: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
  OCCUPIED: "border-rose-500/40 text-rose-200 bg-rose-500/10",
  RESERVED: "border-amber-500/40 text-amber-200 bg-amber-500/10",
  CLEANING: "border-sky-500/40 text-sky-200 bg-sky-500/10",
}

export default function RestaurantTablesPage() {
  const { info: verticalInfo } = useVerticalConfig()
  const verticalName = verticalInfo?.businessVertical ?? "GENERAL"

  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    code: "",
    status: "AVAILABLE" as RestaurantTable["status"],
    capacity: "",
    location: "",
    notes: "",
  })

  const isRestaurant = verticalName === "RESTAURANTS"

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
        location: form.location.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      toast.success("Mesa creada correctamente.")
      setForm({
        name: "",
        code: "",
        status: "AVAILABLE",
        capacity: "",
        location: "",
        notes: "",
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

  const emptyState = useMemo(() => tables.length === 0 && !loading, [tables, loading])

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
              Mesas y ambientes
            </h1>
            <p className="text-sm text-muted-foreground">
              Organiza el plano del salon y controla la disponibilidad en tiempo real.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            Vertical Restaurantes
          </Badge>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ubicacion</Label>
                  <Input
                    value={form.location}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, location: event.target.value }))
                    }
                    placeholder="Salon principal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="Observaciones del ambiente"
                    className="min-h-[80px]"
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit}>
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
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{loading ? "Actualizando..." : `${tables.length} mesas activas`}</span>
                <Button variant="outline" size="sm" onClick={loadTables}>
                  Recargar
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mesa</TableHead>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((table) => (
                    <TableRow key={table.id}>
                      <TableCell className="font-medium">{table.name}</TableCell>
                      <TableCell>{table.code}</TableCell>
                      <TableCell>{table.capacity ?? "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_BADGE_CLASS[table.status]}
                        >
                          {STATUS_LABELS[table.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(table.id)}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {emptyState && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No hay mesas registradas aun.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
