"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  createIngredient,
  deleteIngredient,
  getIngredients,
  type Ingredient,
} from "./ingredients.api"
import { useVerticalConfig } from "@/hooks/use-vertical-config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const UNIT_OPTIONS = ["UNIDAD", "KG", "GR", "LT", "ML", "CAJA", "BOTELLA"]

export default function IngredientsPage() {
  const { info: verticalInfo } = useVerticalConfig()
  const verticalName = verticalInfo?.businessVertical ?? "GENERAL"
  const isRestaurant = verticalName === "RESTAURANTS"

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    unit: UNIT_OPTIONS[0],
    stock: "",
    minStock: "",
    cost: "",
  })

  const loadIngredients = useCallback(async () => {
    if (!isRestaurant) return
    setLoading(true)
    try {
      const data = await getIngredients()
      setIngredients(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar los insumos."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [isRestaurant])

  useEffect(() => {
    loadIngredients()
  }, [loadIngredients])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Ingresa el nombre del insumo.")
      return
    }
    try {
      await createIngredient({
        name: form.name.trim(),
        unit: form.unit,
        stock: form.stock ? Number(form.stock) : 0,
        minStock: form.minStock ? Number(form.minStock) : undefined,
        cost: form.cost ? Number(form.cost) : undefined,
      })
      toast.success("Insumo creado correctamente.")
      setForm({
        name: "",
        unit: UNIT_OPTIONS[0],
        stock: "",
        minStock: "",
        cost: "",
      })
      await loadIngredients()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el insumo."
      toast.error(message)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteIngredient(id)
      toast.success("Insumo eliminado.")
      await loadIngredients()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el insumo."
      toast.error(message)
    }
  }

  const emptyState = useMemo(
    () => ingredients.length === 0 && !loading,
    [ingredients, loading],
  )

  if (!isRestaurant) {
    return (
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Insumos</CardTitle>
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
              Insumos y existencias
            </h1>
            <p className="text-sm text-muted-foreground">
              Controla ingredientes, stock minimo y costos por unidad.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            Vertical Restaurantes
          </Badge>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Nuevo insumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Queso mozzarella"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Unidad</Label>
                  <select
                    value={form.unit}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, unit: event.target.value }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Stock inicial</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, stock: event.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Stock minimo</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.minStock}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, minStock: event.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo unitario</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.cost}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, cost: event.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate}>
                Guardar insumo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Inventario de insumos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{loading ? "Actualizando..." : `${ingredients.length} insumos`}</span>
                <Button variant="outline" size="sm" onClick={loadIngredients}>
                  Recargar
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Minimo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((ingredient) => {
                    const lowStock =
                      typeof ingredient.minStock === "number" &&
                      ingredient.stock <= ingredient.minStock
                    return (
                      <TableRow key={ingredient.id}>
                        <TableCell className="font-medium">{ingredient.name}</TableCell>
                        <TableCell>{ingredient.unit}</TableCell>
                        <TableCell className={lowStock ? "text-amber-400" : ""}>
                          {ingredient.stock}
                        </TableCell>
                        <TableCell>{ingredient.minStock ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDelete(ingredient.id)}
                          >
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {emptyState && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No hay insumos registrados aun.
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
