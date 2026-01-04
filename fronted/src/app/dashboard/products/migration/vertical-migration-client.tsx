"use client"

import { useMemo, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  LEGACY_PAGE_SIZE_OPTIONS,
  type LegacyProduct,
  resolveLegacyStock,
  useLegacyProducts,
} from "./use-legacy-products"
import { useTenantFeatures } from "@/context/tenant-features-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import {
  markProductAsMigrated,
  updateProductVerticalAttributes,
} from "../products.api"
import { CircleAlert, Package, RefreshCcw, ShoppingBag, UtensilsCrossed } from "lucide-react"

type ModalMode = "variants" | "recipe"

type VariantRow = {
  id: string
  size: string
  color: string
  skuVariant: string
  stock: string
  price: string
}

type IngredientRow = {
  id: string
  name: string
  quantity: string
  unit: string
}

function createVariantRow(): VariantRow {
  return {
    id: crypto.randomUUID(),
    size: "",
    color: "",
    skuVariant: "",
    stock: "",
    price: "",
  }
}

function createIngredientRow(): IngredientRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: "",
    unit: "",
  }
}

export default function VerticalMigrationClient() {
  const {
    products,
    loading,
    error,
    filters,
    setFilters,
    pagination,
    setPage,
    setPageSize,
    availableBrands,
    availableCategories,
    refresh,
  } = useLegacyProducts()
  const { productSchema, verticalInfo } = useTenantFeatures()

  const inventoryMode = productSchema?.inventoryTracking ?? "by_product"
  const isRetail = inventoryMode === "by_variant"
  const isRestaurant = inventoryMode === "by_ingredient"

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [modalState, setModalState] = useState<{
    open: boolean
    mode: ModalMode
    product: LegacyProduct | null
  }>({ open: false, mode: "variants", product: null })

  const [variantRows, setVariantRows] = useState<VariantRow[]>([createVariantRow()])
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([createIngredientRow()])
  const [kitchenStation, setKitchenStation] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [notes, setNotes] = useState("")

  const selectedProducts = useMemo(
    () => products.filter((prod) => selectedIds.has(prod.id)),
    [products, selectedIds],
  )

  const legacyCount = verticalInfo?.migration?.legacy ?? 0
  const totalCount = verticalInfo?.migration?.total ?? 0
  const migrationPercentage = verticalInfo?.migration?.percentage ?? 0

  const pendingAttributes = useCallback(
    (product: LegacyProduct) => {
      if (!productSchema?.fields?.length) {
        return "Completa los atributos del vertical"
      }
      const attrs = product.extraAttributes ?? {}
      const missing = productSchema.fields
        .filter((field) => field.required)
        .filter((field) => {
          const value = (attrs as Record<string, unknown>)[field.key]
          if (Array.isArray(value)) {
            return value.length === 0
          }
          return value === undefined || value === null || value === ""
        })
        .map((field) => field.label || field.key)

      if (!missing.length) {
        return "Atributos completos"
      }
      if (missing.length === 1) {
        return `Falta ${missing[0]}`
      }
      if (missing.length === 2) {
        return `Faltan ${missing.join(" y ")}`
      }
      return `Faltan ${missing.slice(0, 2).join(", ")} y ${missing.length - 2} más`
    },
    [productSchema],
  )

  const toggleSelection = (productId: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(productId)
      } else {
        next.delete(productId)
      }
      return next
    })
  }

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(products.map((prod) => prod.id)))
  }

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }))
    setVariantRows([createVariantRow()])
    setIngredientRows([createIngredientRow()])
    setKitchenStation("")
    setPrepTime("")
    setNotes("")
  }

  const openModal = (mode: ModalMode, product: LegacyProduct) => {
    setModalState({ open: true, mode, product })
    setVariantRows([createVariantRow()])
    setIngredientRows([createIngredientRow()])
    setKitchenStation("")
    setPrepTime("")
    setNotes("")
  }

  const handleMarkMigrated = async (ids: number[]) => {
    if (!ids.length) return
    try {
      await Promise.all(ids.map((id) => markProductAsMigrated(id)))
      toast.success("Productos marcados como migrados.")
      setSelectedIds(new Set())
      await refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo completar la acción."
      toast.error(message)
    }
  }

  const productForModal = modalState.product
  const availableStock = productForModal ? resolveLegacyStock(productForModal) ?? 0 : 0
  const assignedStock = variantRows.reduce(
    (sum, variant) => sum + (Number(variant.stock) || 0),
    0,
  )
  const variantFormValid =
    modalState.mode === "variants" &&
    variantRows.length > 0 &&
    assignedStock > 0 &&
    assignedStock <= availableStock &&
    variantRows.every(
      (variant) =>
        variant.size.trim() &&
        variant.color.trim() &&
        variant.skuVariant.trim() &&
        Number(variant.stock) > 0,
    )

  const recipeFormValid =
    modalState.mode === "recipe" &&
    ingredientRows.length > 0 &&
    ingredientRows.every(
      (ingredient) =>
        ingredient.name.trim() &&
        ingredient.unit.trim() &&
        Number(ingredient.quantity) > 0,
    ) &&
    kitchenStation.trim() &&
    Number(prepTime) >= 0

  const handleVariantRowChange = (rowId: string, patch: Partial<VariantRow>) => {
    setVariantRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )
  }

  const handleIngredientRowChange = (rowId: string, patch: Partial<IngredientRow>) => {
    setIngredientRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )
  }

  const handleSaveModal = async () => {
    if (!productForModal) return
    const payload: Record<string, unknown> = {}
    if (modalState.mode === "variants") {
      payload.variants = variantRows
        .filter((variant) => Number(variant.stock) > 0)
        .map((variant) => ({
          size: variant.size.trim(),
          color: variant.color.trim(),
          skuVariant: variant.skuVariant.trim(),
          stock: Number(variant.stock),
          price: variant.price ? Number(variant.price) : undefined,
        }))
    } else {
      payload.ingredients = ingredientRows
        .filter((row) => row.name.trim())
        .map((row) => ({
          name: row.name.trim(),
          quantity: Number(row.quantity),
          unit: row.unit.trim(),
        }))
      payload.kitchenStation = kitchenStation.trim()
      payload.prepTime = Number(prepTime)
      payload.notes = notes.trim() || undefined
    }

    if (modalState.mode === "variants" && (!payload.variants || !(payload.variants as any[]).length)) {
      toast.error("Agrega al menos una variante válida.")
      return
    }

    if (
      modalState.mode === "recipe" &&
      (!payload.ingredients || !(payload.ingredients as any[]).length)
    ) {
      toast.error("Agrega al menos un ingrediente válido.")
      return
    }

    try {
      await updateProductVerticalAttributes(productForModal.id, {
        extraAttributes: payload,
        markMigrated:
          modalState.mode === "variants"
            ? assignedStock >= availableStock && availableStock > 0
            : true,
      })
      toast.success("Información de vertical actualizada.")
      closeModal()
      await refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar la información del producto."
      toast.error(message)
    }
  }

  return (
    <Card className="shadow-none border-border/50">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Productos pendientes de migración
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gestiona los productos que aún no usan el esquema del vertical activo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={legacyCount > 0 ? "destructive" : "secondary"}>
            Pendientes: {legacyCount}
          </Badge>
          <Badge variant="secondary">Migrados: {verticalInfo?.migration?.migrated ?? 0}</Badge>
          <Badge variant="outline">{migrationPercentage.toFixed(0)}% completado</Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedIds(new Set())
              void refresh()
            }}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Buscar producto..."
            value={filters.query}
            onChange={(event) => setFilters({ query: event.target.value })}
          />
          <Select
            value={filters.category}
            onValueChange={(value) => setFilters({ category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todas</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={filters.brand} onValueChange={(value) => setFilters({ brand: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todas</SelectItem>
                {availableBrands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Checkbox
              id="inStockOnly"
              checked={filters.inStockOnly}
              onCheckedChange={(checked) =>
                setFilters({ inStockOnly: Boolean(checked) })
              }
            />
            <label htmlFor="inStockOnly" className="text-sm text-muted-foreground">
              Solo con stock disponible
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button
            size="sm"
            disabled={!isRetail || !selectedIds.size}
            onClick={() => {
              const product = selectedProducts[0]
              if (product) {
                openModal("variants", product)
              }
            }}
          >
            <Package className="mr-2 h-4 w-4" />
            Dividir stock
          </Button>
          <Button
            size="sm"
            disabled={!isRestaurant || !selectedIds.size}
            onClick={() => {
              const product = selectedProducts[0]
              if (product) {
                openModal("recipe", product)
              }
            }}
          >
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            Asignar receta
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!selectedIds.size}
            onClick={() => handleMarkMigrated(Array.from(selectedIds))}
          >
            Marcar migrado
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === products.length}
                    onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                  />
                </TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Atributos</TableHead>
                <TableHead className="hidden sm:table-cell">Actualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={6}>
                      <Skeleton className="w-full h-9" />
                    </TableCell>
                  </TableRow>
                ))}

              {!loading && products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay productos pendientes de migración.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                products.map((product) => {
                  const stock = resolveLegacyStock(product)
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={(checked) =>
                            toggleSelection(product.id, Boolean(checked))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{product.name}</span>
                          {(!product.isVerticalMigrated || !product.extraAttributes) && (
                            <Badge variant="outline" className="w-fit">
                              Legacy
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.category?.name ?? "-"}</TableCell>
                      <TableCell>{stock ?? "—"}</TableCell>
                      <TableCell>{pendingAttributes(product)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                        {product.updatedAt
                          ? new Date(product.updatedAt).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEGACY_PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">por página</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, pagination.page - 1))}
              disabled={pagination.page === 0}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {pagination.page + 1} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(pagination.totalPages - 1, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={modalState.open} onOpenChange={(open) => (!open ? closeModal() : undefined)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {modalState.mode === "variants" ? "Dividir stock" : "Asignar receta"}
            </DialogTitle>
            <DialogDescription>
              Producto: {modalState.product?.name ?? "—"}
            </DialogDescription>
          </DialogHeader>

          {modalState.product && (
            <div className="space-y-6">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <CircleAlert className="h-3.5 w-3.5" />
                Stock disponible: {availableStock} unidades
              </p>

              {modalState.mode === "variants" ? (
                <VariantForm
                  rows={variantRows}
                  onChange={handleVariantRowChange}
                  onAdd={() => setVariantRows((rows) => [...rows, createVariantRow()])}
                  onRemove={(rowId) =>
                    setVariantRows((rows) =>
                      rows.length === 1 ? rows : rows.filter((row) => row.id !== rowId),
                    )
                  }
                  sizeOptions={getFieldOptions(productSchema, "size")}
                  colorOptions={getFieldOptions(productSchema, "color")}
                  assignedStock={assignedStock}
                  availableStock={availableStock}
                />
              ) : (
                <RecipeForm
                  rows={ingredientRows}
                  onChange={handleIngredientRowChange}
                  onAdd={() => setIngredientRows((rows) => [...rows, createIngredientRow()])}
                  onRemove={(rowId) =>
                    setIngredientRows((rows) =>
                      rows.length === 1 ? rows : rows.filter((row) => row.id !== rowId),
                    )
                  }
                  kitchenStation={kitchenStation}
                  stationOptions={getFieldOptions(productSchema, "kitchen_station")}
                  onStationChange={setKitchenStation}
                  prepTime={prepTime}
                  onPrepTimeChange={setPrepTime}
                  notes={notes}
                  onNotesChange={setNotes}
                />
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveModal}
                  disabled={modalState.mode === "variants" ? !variantFormValid : !recipeFormValid}
                >
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function getFieldOptions(
  schema: ReturnType<typeof useTenantFeatures>["productSchema"],
  key: string,
) {
  return schema?.fields?.find((field) => field.key === key)?.options ?? []
}

type VariantFormProps = {
  rows: VariantRow[]
  onChange: (rowId: string, patch: Partial<VariantRow>) => void
  onAdd: () => void
  onRemove: (rowId: string) => void
  sizeOptions: string[]
  colorOptions: string[]
  assignedStock: number
  availableStock: number
}

function VariantForm({
  rows,
  onChange,
  onAdd,
  onRemove,
  sizeOptions,
  colorOptions,
  assignedStock,
  availableStock,
}: VariantFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-2">
        <div>Stock asignado: {assignedStock}</div>
        <div>Stock restante: {Math.max(availableStock - assignedStock, 0)}</div>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 md:grid-cols-5"
          >
            <Select
              value={row.size}
              onValueChange={(value) => onChange(row.id, { size: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Talla" />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.length
                  ? sizeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))
                  : (
                    <SelectItem value="SIN_TALLA">Sin talla</SelectItem>
                    )}
              </SelectContent>
            </Select>

            <Select
              value={row.color}
              onValueChange={(value) => onChange(row.id, { color: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.length
                  ? colorOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))
                  : (
                    <SelectItem value="UNICO">Único</SelectItem>
                    )}
              </SelectContent>
            </Select>

            <Input
              value={row.skuVariant}
              onChange={(event) => onChange(row.id, { skuVariant: event.target.value })}
              placeholder="SKU variante"
            />
            <Input
              type="number"
              min={0}
              value={row.stock}
              onChange={(event) => onChange(row.id, { stock: event.target.value })}
              placeholder="Stock"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={row.price}
                onChange={(event) => onChange(row.id, { price: event.target.value })}
                placeholder="Precio"
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={rows.length === 1}
                onClick={() => onRemove(row.id)}
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" onClick={onAdd}>
        Agregar variante
      </Button>
    </div>
  )
}

type RecipeFormProps = {
  rows: IngredientRow[]
  onChange: (rowId: string, patch: Partial<IngredientRow>) => void
  onAdd: () => void
  onRemove: (rowId: string) => void
  kitchenStation: string
  stationOptions: string[]
  onStationChange: (value: string) => void
  prepTime: string
  onPrepTimeChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
}

function RecipeForm({
  rows,
  onChange,
  onAdd,
  onRemove,
  kitchenStation,
  stationOptions,
  onStationChange,
  prepTime,
  onPrepTimeChange,
  notes,
  onNotesChange,
}: RecipeFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Input
              value={row.name}
              onChange={(event) => onChange(row.id, { name: event.target.value })}
              placeholder="Ingrediente"
            />
            <Input
              type="number"
              min={0}
              value={row.quantity}
              onChange={(event) => onChange(row.id, { quantity: event.target.value })}
              placeholder="Cantidad"
            />
            <Input
              value={row.unit}
              onChange={(event) => onChange(row.id, { unit: event.target.value })}
              placeholder="Unidad (gr, ml, unidades...)"
            />
            <Button
              variant="ghost"
              size="icon"
              disabled={rows.length === 1}
              onClick={() => onRemove(row.id)}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={onAdd}>
        Añadir ingrediente
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={kitchenStation} onValueChange={onStationChange}>
          <SelectTrigger>
            <SelectValue placeholder="Estación de cocina" />
          </SelectTrigger>
          <SelectContent>
            {stationOptions.length
              ? stationOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))
              : (
                <SelectItem value="GENERAL">General</SelectItem>
                )}
          </SelectContent>
        </Select>

        <Input
          type="number"
          min={0}
          value={prepTime}
          onChange={(event) => onPrepTimeChange(event.target.value)}
          placeholder="Tiempo de preparación (min)"
        />
      </div>

      <Textarea
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Notas adicionales o instrucciones"
      />
    </div>
  )
}
