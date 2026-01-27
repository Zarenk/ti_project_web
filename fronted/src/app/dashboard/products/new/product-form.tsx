"use client"

import Link from 'next/link'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { AlertTriangle, Check, Loader2, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProduct, getProducts, updateProduct, uploadProductImage } from '../products.api'
import { getBrands } from '../../brands/brands.api'
import { createCategory, getCategories } from '../../categories/categories.api'
import { getStores } from '../../stores/stores.api'
import { getProviders } from '../../providers/providers.api'
import { createEntry } from '../../entries/entries.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { IconName, icons } from '@/lib/icons'
import { useTenantSelection } from '@/context/tenant-selection-context'
import { resolveImageUrl } from '@/lib/images'
import { useVerticalConfig } from '@/hooks/use-vertical-config'
import { useDebounce } from '@/app/hooks/useDebounce'
import { useAuth } from '@/context/auth-context'

const normalizeImagePath = (input?: string): string => {
  const raw = input?.trim() ?? ''
  if (!raw) {
    return ''
  }

  try {
    const parsed = new URL(raw)
    if (parsed.pathname.startsWith('/uploads')) {
      return parsed.pathname
    }
  } catch {
    // Ignore parsing errors for relative paths
  }

  const uploadsIndex = raw.indexOf('/uploads')
  if (uploadsIndex >= 0) {
    const relative = raw.slice(uploadsIndex)
    return relative.startsWith('/') ? relative : `/${relative}`
  }

  return raw
}

interface ProductFormProps {
  product: any
  categories: any
  onSuccess?: (savedProduct: any) => void | Promise<void>
  onCancel?: () => void
}

type VariantRow = {
  id: string
  size: string
  color: string
  skuVariant: string
  stock: number
  price?: number
}

type IngredientRow = {
  name: string
  unit: string
  quantity: number
}

type BatchCartItem = {
  id: string
  name: string
  payload: any
}

const BATCH_CART_STORAGE_KEY = "product-batch-cart:v1"

export function ProductForm({
  product,
  categories,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const { info: verticalInfo } = useVerticalConfig()
  const verticalName = verticalInfo?.businessVertical ?? "GENERAL"
  const showComputerSpecs = verticalName === "COMPUTERS"
  const schemaFields = verticalInfo?.config?.productSchema?.fields ?? []
  const inventoryMode = verticalInfo?.config?.productSchema?.inventoryTracking ?? "by_product"
  const isRetail = inventoryMode === "by_variant"
  const isRestaurant = inventoryMode === "by_ingredient"
  const ingredientUnitOptions = useMemo(() => {
    const field = schemaFields.find((entry) => entry.key === "ingredient_unit")
    return field?.options ?? ["UNIDAD", "KG", "GR", "LT", "ML"]
  }, [schemaFields])
  const groupedSchemaFields = useMemo(() => {
    if (!schemaFields.length) return []
    const hiddenKeys = new Set<string>()
    if (isRetail) {
      hiddenKeys.add("size")
      hiddenKeys.add("color")
      hiddenKeys.add("sku_variant")
    }
    if (isRestaurant) {
      hiddenKeys.add("ingredient_unit")
    }
    const groups = new Map<string, typeof schemaFields>()
    schemaFields
      .filter((field) => !hiddenKeys.has(field.key))
      .forEach((field) => {
      const key = field.group ?? "general"
      const current = groups.get(key) ?? []
      current.push(field)
      groups.set(key, current)
    })
    return Array.from(groups.entries())
  }, [schemaFields, isRetail, isRestaurant])
  const MIGRATION_ASSISTANT_PATH = "/dashboard/products/migration"
  const isLegacyProduct =
    Boolean(product?.id) &&
    (product?.isVerticalMigrated === false ||
      !product?.extraAttributes ||
      Object.keys(product.extraAttributes ?? {}).length === 0)
  const [extraAttributes, setExtraAttributes] = useState<Record<string, unknown>>(
    () => (product?.extraAttributes ?? {}) as Record<string, unknown>,
  )
  const [batchCart, setBatchCart] = useState<BatchCartItem[]>([])
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const { userId } = useAuth()
  const [existingProductNames, setExistingProductNames] = useState<Set<string>>(
    () => new Set(),
  )
  const variantIdRef = useRef(0)
  const [variantRows, setVariantRows] = useState<VariantRow[]>(() => {
    const raw = (product?.extraAttributes as Record<string, unknown> | undefined)?.variants
    if (!Array.isArray(raw)) return []
    return (raw as VariantRow[]).map((row) => ({
      id: row.id ?? `variant-${variantIdRef.current++}`,
      size: row.size ?? "",
      color: row.color ?? "",
      skuVariant: row.skuVariant ?? "",
      stock: Number.isFinite(row.stock) ? row.stock : 0,
      price: Number.isFinite(row.price ?? 0) ? row.price : 0,
    }))
  })
  const normalizeVariantRows = useCallback((rows: unknown): VariantRow[] => {
    if (!Array.isArray(rows)) return []
    return (rows as VariantRow[]).map((row) => ({
      id: row.id ?? `variant-${variantIdRef.current++}`,
      size: row.size ?? "",
      color: row.color ?? "",
      skuVariant: row.skuVariant ?? "",
      stock: Number.isFinite(row.stock) ? row.stock : 0,
      price: Number.isFinite(row.price ?? 0) ? row.price : 0,
    }))
  }, [])
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(() => {
    const raw = (product?.extraAttributes as Record<string, unknown> | undefined)?.ingredients
    return Array.isArray(raw) ? (raw as IngredientRow[]) : []
  })
  const [extraFieldError, setExtraFieldError] = useState<string | null>(null)
  const [stores, setStores] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [stockStoreId, setStockStoreId] = useState('')
  const [stockProviderId, setStockProviderId] = useState('')
  const [stockDialogError, setStockDialogError] = useState<string | null>(null)
  const [pendingStockPayload, setPendingStockPayload] = useState<Record<string, unknown> | null>(null)
  const [pendingStockQuantity, setPendingStockQuantity] = useState(0)
  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      setExtraAttributes((prev) => {
        if (value === null || value === undefined || value === '') {
          const next = { ...prev }
          delete next[key]
          return next
        }
        return { ...prev, [key]: value }
      })
    },
    [setExtraAttributes],
  )

  const getFieldValue = useCallback(
    (key: string): unknown => {
      return extraAttributes[key]
    },
    [extraAttributes],
  )

  const updateVariantRow = useCallback(
    (index: number, key: keyof VariantRow, value: string) => {
      setVariantRows((prev) =>
        prev.map((row, idx) => {
          if (idx !== index) return row
          const rowId = row.id ?? `variant-${variantIdRef.current++}`
          if (key === "stock" || key === "price") {
            const parsed = Number(value)
            return { ...row, id: rowId, [key]: Number.isNaN(parsed) ? 0 : parsed }
          }
          return { ...row, id: rowId, [key]: value }
        }),
      )
    },
    [],
  )
  const removeVariantRow = useCallback((index: number) => {
    setVariantRows((prev) => prev.filter((_, idx) => idx !== index))
  }, [])

  const updateIngredientRow = useCallback(
    (index: number, key: keyof IngredientRow, value: string) => {
      setIngredientRows((prev) =>
        prev.map((row, idx) => {
          if (idx !== index) return row
          if (key === "quantity") {
            const parsed = Number(value)
            return { ...row, quantity: Number.isNaN(parsed) ? 0 : parsed }
          }
          return { ...row, [key]: value }
        }),
      )
    },
    [],
  )

  const sizeOptions = useMemo(() => {
    const field = schemaFields.find((entry) => entry.key === "size")
    return field?.options ?? []
  }, [schemaFields])

  const colorOptions = useMemo(() => {
    const field = schemaFields.find((entry) => entry.key === "color")
    return field?.options ?? []
  }, [schemaFields])

  const renderSchemaField = (field: (typeof schemaFields)[number]) => {
    const value = getFieldValue(field.key)
    switch (field.type) {
      case 'json':
        if (field.key === 'variants') {
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Agrega tallas, colores y stock por variante.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setVariantRows((prev) => [
                      ...prev,
                      {
                        id: `variant-${variantIdRef.current++}`,
                        size: "",
                        color: "",
                        skuVariant: "",
                        stock: 0,
                        price: 0,
                      },
                    ])
                  }
                >
                  Agregar variante
                </Button>
              </div>
              <div className="space-y-2">
                {variantRows.map((row, index) => (
                  <VariantRowItem
                    key={row.id}
                    row={row}
                    index={index}
                    sizeOptions={sizeOptions}
                    colorOptions={colorOptions}
                    onChange={updateVariantRow}
                    onRemove={removeVariantRow}
                  />
                ))}
                {!variantRows.length && (
                  <p className="text-xs text-muted-foreground">
                    Aun no hay variantes registradas.
                  </p>
                )}
              </div>
            </div>
          )
        }
        if (field.key === 'ingredients') {
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Define los insumos y cantidades necesarios para el plato.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setIngredientRows((prev) => [
                      ...prev,
                      { name: "", unit: ingredientUnitOptions[0] ?? "UNIDAD", quantity: 0 },
                    ])
                  }
                >
                  Agregar ingrediente
                </Button>
              </div>
              <div className="space-y-2">
                {ingredientRows.map((row, index) => (
                  <div
                    key={`${row.name}-${index}`}
                    className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1.5fr_1fr_1fr_auto]"
                  >
                    <Input
                      placeholder="Ingrediente"
                      value={row.name}
                      onChange={(event) =>
                        updateIngredientRow(index, "name", event.target.value)
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Cantidad"
                      value={Number.isFinite(row.quantity) ? row.quantity : 0}
                      onChange={(event) =>
                        updateIngredientRow(index, "quantity", event.target.value)
                      }
                    />
                    <Select
                      value={row.unit}
                      onValueChange={(next) => updateIngredientRow(index, "unit", next)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredientUnitOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setIngredientRows((prev) => prev.filter((_, idx) => idx !== index))
                      }
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
                {!ingredientRows.length && (
                  <p className="text-xs text-muted-foreground">
                    Aun no hay ingredientes registrados.
                  </p>
                )}
              </div>
            </div>
          )
        }
        return (
          <Textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => handleFieldChange(field.key, event.target.value)}
          />
        )
      case 'select':
        return (
          <Select
            value={typeof value === 'string' ? value : undefined}
            onValueChange={(next) => handleFieldChange(field.key, next)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecciona ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'multi-select': {
        const selected = Array.isArray(value) ? value : []
        return (
          <div className="flex flex-col gap-2">
            {(field.options ?? []).map((option) => {
              const checked = selected.includes(option)
              return (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(isChecked) => {
                      const next = isChecked
                        ? [...selected, option]
                        : selected.filter((entry) => entry !== option)
                      handleFieldChange(field.key, next)
                    }}
                  />
                  <span>{option}</span>
                </label>
              )
            })}
          </div>
        )
      }
      case 'color':
        return (
          <Input
            type="color"
            value={typeof value === 'string' ? value : '#000000'}
            onChange={(event) => handleFieldChange(field.key, event.target.value)}
          />
        )
      case 'textarea':
        return (
          <Textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => handleFieldChange(field.key, event.target.value)}
          />
        )
      case 'date':
        return (
          <Input
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => handleFieldChange(field.key, event.target.value)}
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
            onChange={(event) => handleFieldChange(field.key, event.target.value)}
          />
        )
      default:
        return (
          <Input
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => handleFieldChange(field.key, event.target.value)}
          />
        )
    }
  }

  const validateAndNormalizeSchemaFields = useCallback(() => {
    if (!schemaFields.length) {
      return { value: null }
    }
    const normalized: Record<string, unknown> = {}
    for (const field of schemaFields) {
      if (
        (isRetail && (field.key === "size" || field.key === "color" || field.key === "sku_variant")) ||
        (isRestaurant && field.key === "ingredient_unit")
      ) {
        continue
      }
      const raw = extraAttributes[field.key]
      const isEmpty =
        raw === null ||
        raw === undefined ||
        (typeof raw === 'string' && raw.trim().length === 0) ||
        (Array.isArray(raw) && raw.length === 0)
      if (field.required && isEmpty) {
        return { error: `Completa el campo "${field.label}".` }
      }
      if (!isEmpty && field.options) {
        if (field.type === 'multi-select') {
          const values = Array.isArray(raw) ? raw : []
          const invalid = values.some(
            (entry) => typeof entry !== 'string' || !field.options?.includes(entry),
          )
          if (invalid) {
            return { error: `El campo "${field.label}" contiene valores invalidos.` }
          }
        } else if (typeof raw === 'string' && !field.options.includes(raw)) {
          return { error: `El campo "${field.label}" solo admite: ${field.options.join(', ')}.` }
        }
      }
      if (!isEmpty) {
        if (field.type === 'number') {
          const parsed = Number(raw)
          if (Number.isNaN(parsed)) {
            return { error: `El campo "${field.label}" debe ser numerico.` }
          }
          normalized[field.key] = parsed
        } else if (field.type === 'multi-select') {
          normalized[field.key] = Array.isArray(raw) ? raw : [raw]
        } else {
          normalized[field.key] = raw
        }
      }
    }
    return { value: Object.keys(normalized).length ? normalized : null }
  }, [extraAttributes, schemaFields, isRetail, isRestaurant])

  const buildPayload = useCallback(
    (data: ProductType) => {
      const {
        processor,
        ram,
        storage,
        graphics,
        screen,
        resolution,
        refreshRate,
        connectivity,
        features,
        initialStock,
        ...productData
      } = data
      const spec: Record<string, string> = {}
      if (processor) spec.processor = processor
      if (ram) spec.ram = ram
      if (storage) spec.storage = storage
      if (graphics) spec.graphics = graphics
      if (screen) spec.screen = screen
      if (resolution) spec.resolution = resolution
      if (refreshRate) spec.refreshRate = refreshRate
      if (connectivity) spec.connectivity = connectivity

      const cleanedImages =
        productData.images
          ?.map((img) => normalizeImagePath(img))
          .filter((img) => img.length > 0) ?? []
      const brand = productData.brand?.trim().toUpperCase()

      const schemaResult = validateAndNormalizeSchemaFields()
      if (schemaResult.error) {
        return { error: schemaResult.error }
      }

      const payload: any = {
        ...productData,
        brand: brand || undefined,
        images: cleanedImages,
        categoryId: Number(productData.categoryId),
        specification: Object.keys(spec).length ? spec : undefined,
        features: features && features.length
          ? features.map((f) => ({
              icon: f.icon || undefined,
              title: f.title,
              description: f.description || undefined,
            }))
          : undefined,
      }

      if (schemaResult.value) {
        payload.extraAttributes = schemaResult.value
      }

      return { payload }
    },
    [validateAndNormalizeSchemaFields],
  )

    //definir el esquema de validacion
    const imageSchema = z
      .string()
      .trim()
      .refine(
        (val) =>
          val.length === 0 ||
          /^https?:\/\//.test(val) ||
          val.startsWith('/uploads'),
        'La imagen debe ser una URL valida, una ruta relativa o puede quedar vacia',
      )

    const productSchema = z.object({
    name: z.string({
      required_error: "Se requiere el nombre del producto",
    })
      .min(3, "El nombre del producto debe tener al menos 3 caracteres")
      .max(200, "El nombre del producto no puede tener mas de 200 caracteres")
      .regex(
        /^[\p{L}0-9\s]+$/u,
        "El nombre solo puede contener letras, numeros y espacios",
      ),
    description: z.string({
    }),
    brand: z.string().optional(),
    price: z.preprocess(
      (value) => (value === "" || value === null || Number.isNaN(value) ? undefined : value),
      z.number()
        .min(0, "El precio debe ser un numero positivo")
        .max(99999999.99, "El precio no puede exceder 99999999.99")
        .optional(),
    ),
    priceSell: z.preprocess(
      (value) => (value === "" || value === null || Number.isNaN(value) ? undefined : value),
      z.number()
        .min(0, "El precio de venta debe ser un numero positivo")
        .max(99999999.99, "El precio no puede exceder 99999999.99")
        .optional(),
    ),
    initialStock: z.preprocess(
      (value) => (value === "" || value === null || Number.isNaN(value) ? undefined : value),
      z.number()
        .min(0, "La cantidad inicial debe ser un numero positivo")
        .max(99999999.99, "La cantidad inicial no puede exceder 99999999.99")
        .optional(),
    ),
    images: z.array(imageSchema).optional(),
    status: z.enum(["Activo", "Inactivo"]).optional(),
    categoryId: z.string().nonempty("Debe seleccionar una categoria"), // Validar categoria
    processor: z.string().optional(),
    ram: z.string().optional(),
    storage: z.string().optional(),
    graphics: z.string().optional(),
    screen: z.string().optional(),
    resolution: z.string().optional(),
    refreshRate: z.string().optional(),
    connectivity: z.string().optional(),
    features: z
      .array(
        z.object({
          icon: z.string().optional(),
          title: z.string().min(1, 'Ingrese un titulo'),
          description: z.string().optional(),
        })
      )
      .optional(),
    }) //{name: "", lastname: "", age: z.number()}

    //inferir el tipo de dato
type ProductType = z.infer<typeof productSchema>;

type VariantRowItemProps = {
  row: VariantRow
  index: number
  sizeOptions: string[]
  colorOptions: string[]
  onChange: (index: number, key: keyof VariantRow, value: string) => void
  onRemove: (index: number) => void
}

const VariantRowItem = memo(function VariantRowItem({
  row,
  index,
  sizeOptions,
  colorOptions,
  onChange,
  onRemove,
}: VariantRowItemProps) {
  const [localSku, setLocalSku] = useState(row.skuVariant ?? "")
  const debouncedSku = useDebounce(localSku, 150)

  useEffect(() => {
    setLocalSku(row.skuVariant ?? "")
  }, [row.skuVariant])

  useEffect(() => {
    if (debouncedSku === row.skuVariant) return
    onChange(index, "skuVariant", debouncedSku)
  }, [debouncedSku, index, onChange, row.skuVariant])

  return (
    <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1.5fr_1fr_1fr_auto]">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Talla</Label>
        <Select value={row.size} onValueChange={(next) => onChange(index, "size", next)}>
          <SelectTrigger>
            <SelectValue placeholder="Talla" />
          </SelectTrigger>
          <SelectContent>
            {sizeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Color</Label>
        <Select value={row.color} onValueChange={(next) => onChange(index, "color", next)}>
          <SelectTrigger>
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            {colorOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">SKU variante</Label>
        <Input
          placeholder="SKU variante"
          value={localSku}
          onChange={(event) => setLocalSku(event.target.value)}
          onBlur={() => {
            if (localSku !== row.skuVariant) {
              onChange(index, "skuVariant", localSku)
            }
          }}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Stock</Label>
        <Input
          type="number"
          min={0}
          placeholder="Stock"
          value={Number.isFinite(row.stock) ? row.stock : 0}
          onChange={(event) => onChange(index, "stock", event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Precio</Label>
        <Input
          type="number"
          min={0}
          placeholder="Precio"
          value={Number.isFinite(row.price ?? 0) ? row.price : 0}
          onChange={(event) => onChange(index, "price", event.target.value)}
        />
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
        Quitar
      </Button>
    </div>
  )
})

    const buildFormValues = (source?: any): ProductType => {
      const specification = source?.specification ?? {}
      const brandName =
        typeof source?.brand === 'string'
          ? source.brand
          : source?.brand?.name ?? ''

      const toNumber = (value: unknown): number => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value
        }
        if (typeof value === 'string') {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : 0
        }
        return 0
      }

      const images = Array.isArray(source?.images)
        ? source.images
            .filter((img: unknown): img is string => typeof img === 'string')
            .map((img) => normalizeImagePath(img))
            .filter((img) => img.length > 0)
        : []

      const features = Array.isArray(source?.features)
        ? source.features.map((feature: any) => ({
            icon: feature?.icon ?? '',
            title: feature?.title ?? '',
            description: feature?.description ?? '',
          }))
        : []

      return {
        name: source?.name ?? '',
        description: source?.description ?? '',
        brand: brandName,
        price: toNumber(source?.price),
        priceSell: toNumber(source?.priceSell),
        initialStock: toNumber(source?.initialStock),
        images: images.length > 0 ? images : [''],
        status: (source?.status as 'Activo' | 'Inactivo') ?? 'Activo',
        categoryId:
          source?.categoryId != null
            ? String(source.categoryId)
            : source?.category?.id != null
              ? String(source.category.id)
              : '',
        processor: specification?.processor ?? '',
        ram: specification?.ram ?? '',
        storage: specification?.storage ?? '',
        graphics: specification?.graphics ?? '',
        screen: specification?.screen ?? '',
        resolution: specification?.resolution ?? '',
        refreshRate: specification?.refreshRate ?? '',
        connectivity: specification?.connectivity ?? '',
        features,
      }
    }

    const defaultValues = useMemo(() => buildFormValues(product), [product])
    const emptyProductValues = useMemo(() => buildFormValues(undefined), [])

    //hook de react-hook-form
    const form = useForm<ProductType>({
    resolver: zodResolver(productSchema),
    defaultValues,
    });

  const { handleSubmit, register, setValue, clearErrors, control } = form;
  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray<ProductType, 'images'>({ control, name: 'images' });

  const {
    fields: featureFields,
    append: appendFeature,
    remove: removeFeature,
  } = useFieldArray<ProductType, 'features'>({ control, name: 'features' });

  const router = useRouter();
  const params = useParams();
  const rawRouteId = params?.id;
  const routeProductId =
    typeof rawRouteId === 'string'
      ? rawRouteId
      : Array.isArray(rawRouteId)
        ? rawRouteId[0]
        : undefined;
  const currentProductId =
    product?.id != null
      ? product.id
      : routeProductId;

  useEffect(() => {
    if (currentProductId) {
      return
    }
    let active = true
    getProducts({ includeInactive: true })
      .then((products) => {
        if (!active) return
        const names = new Set<string>()
        products.forEach((entry) => {
          const normalized = String(entry?.name ?? '').trim().toLowerCase()
          if (normalized) {
            names.add(normalized)
          }
        })
        setExistingProductNames(names)
      })
      .catch((error) => {
        console.warn('[products] no se pudo cargar nombres existentes', error)
      })
    return () => {
      active = false
    }
  }, [currentProductId])

  const [brands, setBrands] = useState<any[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<any[]>(categories ?? []);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const { version } = useTenantSelection();
  const tenantFetchRef = useRef(true);
  const versionResetRef = useRef(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  // Estado para manejar el error del nombre si se repite
  const [nameError, setNameError] = useState<string | null>(null);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [isBatchOnlyConfirmOpen, setIsBatchOnlyConfirmOpen] = useState(false);
  const [pendingBatchPayload, setPendingBatchPayload] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const formatMoney = (value: unknown) => {
    const numberValue =
      typeof value === "number" ? value : Number(String(value ?? ""));
    if (!Number.isFinite(numberValue)) return null;
    return `S/ ${numberValue.toFixed(2)}`;
  };
  const watchedName = useWatch({ control, name: 'name' })
  const watchedCategoryId = useWatch({ control, name: 'categoryId' })
  const watchedBrand = useWatch({ control, name: 'brand' })
  const watchedDescription = useWatch({ control, name: 'description' })
  const watchedPrice = useWatch({ control, name: 'price' })
  const watchedPriceSell = useWatch({ control, name: 'priceSell' })
  const watchedInitialStock = useWatch({ control, name: 'initialStock' })
  const watchedImages = useWatch({ control, name: 'images' })
  const watchedFeatures = useWatch({ control, name: 'features' })
  const watchedProcessor = useWatch({ control, name: 'processor' })
  const watchedRam = useWatch({ control, name: 'ram' })
  const watchedStorage = useWatch({ control, name: 'storage' })
  const watchedGraphics = useWatch({ control, name: 'graphics' })
  const watchedScreen = useWatch({ control, name: 'screen' })
  const watchedResolution = useWatch({ control, name: 'resolution' })
  const watchedRefreshRate = useWatch({ control, name: 'refreshRate' })
  const watchedConnectivity = useWatch({ control, name: 'connectivity' })
  const hasName = Boolean(watchedName?.trim())
  const hasCategory = Boolean(watchedCategoryId)
  const hasBrand = Boolean(watchedBrand?.trim())
  const hasDescription = Boolean(watchedDescription?.trim())
  const hasPrice = typeof watchedPrice === 'number' && Number.isFinite(watchedPrice) && watchedPrice > 0
  const hasPriceSell =
    typeof watchedPriceSell === 'number' && Number.isFinite(watchedPriceSell) && watchedPriceSell > 0
  const hasInitialStock =
    typeof watchedInitialStock === 'number' && Number.isFinite(watchedInitialStock) && watchedInitialStock > 0
  const hasImages =
    Array.isArray(watchedImages) &&
    watchedImages.some((img) => typeof img === 'string' && img.trim().length > 0)
  const hasFeatures =
    Array.isArray(watchedFeatures) &&
    watchedFeatures.some((feature) =>
      Boolean(feature?.icon?.trim() || feature?.title?.trim() || feature?.description?.trim()),
    )
  const hasSpecs = Boolean(
    watchedProcessor?.trim() ||
      watchedRam?.trim() ||
      watchedStorage?.trim() ||
      watchedGraphics?.trim() ||
      watchedScreen?.trim() ||
      watchedResolution?.trim() ||
      watchedRefreshRate?.trim() ||
      watchedConnectivity?.trim(),
  )
  const debouncedName = useDebounce(watchedName ?? '', 250)
  const debouncedCategoryId = useDebounce(watchedCategoryId ?? '', 250)
  const normalizedDraftName = String(debouncedName ?? '').trim().toLowerCase()
  const hasDraftName = normalizedDraftName.length > 0
  const hasDraftData =
    hasDraftName || String(debouncedCategoryId ?? '').trim().length > 0
  const isDraftInCart = normalizedDraftName
    ? batchCart.some(
        (item) => item.name.trim().toLowerCase() === normalizedDraftName,
      )
    : false
  const draftCount = hasDraftName && !isDraftInCart ? 1 : 0
  const batchCount = batchCart.length
  const createProductsCount =
    batchCount > 0 ? batchCount + draftCount : 0
  const suppressInlineErrors =
    batchCart.length > 0 && !currentProductId && !hasDraftData;

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  useEffect(() => {
    setCategoryOptions(categories ?? [])
    setIsLoadingCategories(false)
  }, [categories])

  useEffect(() => {
    let cancelled = false
    const skipClear = tenantFetchRef.current
    tenantFetchRef.current = false

    const loadCategories = async () => {
      if (!skipClear) {
        setCategoryOptions([])
      }
      setIsLoadingCategories(true)
      try {
        const freshCategories = await getCategories()
        if (!cancelled) {
          setCategoryOptions(
            Array.isArray(freshCategories) ? freshCategories : [],
          )
        }
      } catch (error) {
        if (!cancelled) {
          setCategoryOptions([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCategories(false)
        }
      }
    }

    const loadBrands = async () => {
      if (!skipClear) {
        setBrands([])
      }
      setIsLoadingBrands(true)
      try {
        const res = await getBrands(1, 1000)
        if (!cancelled) {
          setBrands(
            Array.isArray(res?.data)
              ? res.data.map((b: any) => ({ ...b, name: b.name.toUpperCase() }))
              : [],
          )
        }
      } catch (error) {
        if (!cancelled) {
          setBrands([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBrands(false)
        }
      }
    }

    void loadCategories()
    void loadBrands()

    return () => {
      cancelled = true
    }
  }, [version])

  useEffect(() => {
    if (!isStockDialogOpen) return
    let cancelled = false

    const loadStockInputs = async () => {
      try {
        const [storeList, providerList] = await Promise.all([
          stores.length ? Promise.resolve(stores) : getStores(),
          providers.length ? Promise.resolve(providers) : getProviders(),
        ])
        if (!cancelled) {
          setStores(Array.isArray(storeList) ? storeList : [])
          setProviders(Array.isArray(providerList) ? providerList : [])
        }
      } catch (error) {
        if (!cancelled) {
          setStockDialogError('No se pudieron cargar tiendas o proveedores.')
        }
      }
    }

    void loadStockInputs()
    return () => {
      cancelled = true
    }
  }, [isStockDialogOpen, providers.length, stores.length])

  useEffect(() => {
    if (versionResetRef.current) {
      versionResetRef.current = false
      return
    }

    setNameError(null)
    setIsCategoryDialogOpen(false)
    setNewCategoryName('')
    setNewCategoryDescription('')
    setCategoryError(null)
    form.reset(emptyProductValues)
    router.refresh()
  }, [version, emptyProductValues, form, router])

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim()
    const trimmedDescription = newCategoryDescription.trim()

    if (trimmedName.length === 0) {
      setCategoryError('Ingrese el nombre de la categoria')
      return
    }

    setIsCreatingCategory(true)
    setCategoryError(null)

    try {
      const createdCategory = await createCategory({
        name: trimmedName,
        description: trimmedDescription.length > 0 ? trimmedDescription : undefined,
        status: 'Activo',
        image: undefined,
      })

      setCategoryOptions((prev) => {
        const exists = prev.some((category: any) => category.id === createdCategory.id)
        if (exists) {
          return prev.map((category: any) =>
            category.id === createdCategory.id ? createdCategory : category,
          )
        }
        return [...prev, createdCategory]
      })
      const createdId = createdCategory?.id != null ? String(createdCategory.id) : ''
      if (createdId) {
        setValue('categoryId', createdId, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
        clearErrors('categoryId')
        await form.trigger('categoryId')
      }
      toast.success('Categoria creada correctamente.')
      setIsCategoryDialogOpen(false)
      setNewCategoryName('')
      setNewCategoryDescription('')
      setCategoryError(null)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Error al crear la categoria'
      if (error?.response?.status === 409 || message.includes('ya existe')) {
        setCategoryError(message)
      } else {
        toast.error(message)
      }
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadProductImage(file);
      const normalizedPath = normalizeImagePath(url);
      setValue(`images.${index}` as const, normalizedPath, {
        shouldDirty: true,
        shouldValidate: true,
      })
      clearErrors(`images.${index}` as const)
    } catch (err) {
      console.error('Error subiendo imagen', err);
    }
  };

  //handlesubmit para manejar los datos
  const onSubmit = handleSubmit(async (data) => {
    setIsProcessing(true);
    setNameError(null);
    try {
        const buildResult = buildPayload(data)
        if (buildResult.error) {
          setExtraFieldError(buildResult.error)
          toast.error(buildResult.error)
          setIsProcessing(false)
          return
        }
        setExtraFieldError(null)

        const payload = buildResult.payload
        const normalizedName = String(payload?.name ?? "").trim().toLowerCase()
        if (!currentProductId && normalizedName) {
          if (existingProductNames.has(normalizedName)) {
            const message = "Ya existe un producto con ese nombre."
            setNameError(message)
            toast.error(message)
            setIsProcessing(false)
            return
          }
          const nameAlreadyAdded = batchCart.some(
            (item) => item.name.trim().toLowerCase() === normalizedName,
          )
          if (nameAlreadyAdded) {
            toast.error("Ese producto ya fue agregado al lote.")
            setIsProcessing(false)
            return
          }
        }

        let savedProduct: any = null
        const formProductId =
          currentProductId != null ? String(currentProductId) : undefined
        const targetProductId = formProductId ?? undefined

        const initialStockValue =
          typeof data.initialStock === 'number' && Number.isFinite(data.initialStock)
            ? data.initialStock
            : 0

        if (!targetProductId && batchCart.length > 0) {
            if (initialStockValue > 0) {
              toast.error("El stock inicial solo aplica a la creacion individual.")
              setIsProcessing(false)
              return
            }
            setPendingBatchPayload(payload as Record<string, unknown>)
            setIsBatchConfirmOpen(true)
            setIsProcessing(false)
            return
        }

        if (!targetProductId && initialStockValue > 0) {
            if (!userId) {
              toast.error("No se pudo identificar al usuario para registrar el stock inicial.")
              setIsProcessing(false)
              return
            }
            setPendingStockPayload(payload as Record<string, unknown>)
            setPendingStockQuantity(initialStockValue)
            setStockStoreId('')
            setStockProviderId('')
            setStockDialogError(null)
            setIsStockDialogOpen(true)
            setIsProcessing(false)
            return
        }

        if (targetProductId) {
            savedProduct = await updateProduct(targetProductId, payload)
            toast.success("Producto actualizado correctamente."); // Notificaci??n de ?xito
            if (!onSuccess) {
                router.push("/dashboard/products");
                router.refresh();
            }
        } else {
            savedProduct = await createProduct(payload);
            toast.success("Producto creado correctamente."); // Notificaci??n de ?xito
            if (!onSuccess) {
                router.push("/dashboard/products");
                router.refresh();
            }
        }

        if (onSuccess) {
            await onSuccess(savedProduct);
        }
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Error inesperado'

        if (error.response?.status === 409 || message.includes('ya existe')) {
            setNameError(message);
            console.log("Estado nameError actualizado:", message);
        } else {
            console.error("Error inesperado:", message);
        }
    } finally {
      setIsProcessing(false);
    }
  });

  const handleConfirmCreateAll = useCallback(async () => {
    if (!pendingBatchPayload) {
      setIsBatchConfirmOpen(false)
      return
    }
    const normalizedPending = String(pendingBatchPayload?.name ?? "").trim().toLowerCase()
    if (normalizedPending && existingProductNames.has(normalizedPending)) {
      toast.error("Ya existe un producto con ese nombre.")
      setIsBatchConfirmOpen(false)
      return
    }
    const duplicateInExisting = batchCart.find((item) =>
      existingProductNames.has(item.name.trim().toLowerCase()),
    )
    if (duplicateInExisting) {
      toast.error(`Ya existe un producto con el nombre "${duplicateInExisting.name}".`)
      setIsBatchConfirmOpen(false)
      return
    }
    setIsProcessing(true)
    setIsBatchConfirmOpen(false)
    try {
      const savedProduct = await createProduct(pendingBatchPayload)
      for (const item of batchCart) {
        await createProduct(item.payload)
      }
      toast.success("Productos creados correctamente.")
      setBatchCart([])
      localStorage.removeItem(BATCH_CART_STORAGE_KEY)
      if (onSuccess) {
        await onSuccess(savedProduct)
      } else {
        router.push("/dashboard/products")
        router.refresh()
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Error al crear productos."
      toast.error(message)
    } finally {
      setPendingBatchPayload(null)
      setIsProcessing(false)
    }
  }, [batchCart, existingProductNames, onSuccess, pendingBatchPayload, router])

  const handleConfirmInitialStock = useCallback(async () => {
    if (!pendingStockPayload) {
      setIsStockDialogOpen(false)
      return
    }
    if (!stockStoreId || !stockProviderId) {
      setStockDialogError("Selecciona una tienda y un proveedor.")
      return
    }
    if (!userId) {
      setStockDialogError("No se pudo identificar al usuario.")
      return
    }
    setIsProcessing(true)
    setStockDialogError(null)
    try {
      const createdProduct = await createProduct(pendingStockPayload)
      await createEntry({
        storeId: Number(stockStoreId),
        userId,
        providerId: Number(stockProviderId),
        date: new Date(),
        description: "Stock inicial",
        details: [
          {
            productId: createdProduct.id,
            name: createdProduct.name,
            quantity: pendingStockQuantity,
            price: Number((pendingStockPayload as any)?.price ?? 0),
            priceInSoles: Number((pendingStockPayload as any)?.price ?? 0),
          },
        ],
        referenceId: `initial-stock:${createdProduct.id}:${Date.now()}`,
      })
      toast.success("Producto creado con stock inicial.")
      setPendingStockPayload(null)
      setPendingStockQuantity(0)
      setStockStoreId('')
      setStockProviderId('')
      setIsStockDialogOpen(false)
      if (onSuccess) {
        await onSuccess(createdProduct)
      } else {
        router.push("/dashboard/products")
        router.refresh()
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Error al registrar stock inicial"
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }, [onSuccess, pendingStockPayload, pendingStockQuantity, router, stockProviderId, stockStoreId, userId])

  const handleAddAnother = useCallback(async () => {
    if (currentProductId) {
      return
    }
    const isValid = await form.trigger()
    if (!isValid) {
      toast.error("Revisa los campos obligatorios antes de continuar.")
      return
    }
    const formValues = form.getValues()
    const buildResult = buildPayload(formValues)
    if (buildResult.error) {
      setExtraFieldError(buildResult.error)
      toast.error(buildResult.error)
      return
    }
    const payload = buildResult.payload
    const normalizedName = String(payload?.name ?? "").trim().toLowerCase()
    if (normalizedName) {
      if (existingProductNames.has(normalizedName)) {
        toast.error("Ya existe un producto con ese nombre.")
        return
      }
      const nameAlreadyAdded = batchCart.some((item) => {
        if (editingBatchId && item.id === editingBatchId) {
          return false
        }
        return item.name.trim().toLowerCase() === normalizedName
      })
      if (nameAlreadyAdded) {
        toast.error("Ese producto ya fue agregado al lote.")
        return
      }
    }
    if (editingBatchId) {
      setBatchCart((prev) =>
        prev.map((entry) =>
          entry.id === editingBatchId
            ? {
                ...entry,
                name: payload?.name ?? "Producto sin nombre",
                payload,
              }
            : entry,
        ),
      )
      setEditingBatchId(null)
      setVariantRows([])
      setIngredientRows([])
      setExtraAttributes({})
      form.reset({
        ...emptyProductValues,
        status: form.getValues("status") ?? "Activo",
        categoryId: form.getValues("categoryId") ?? "",
      })
      toast.success("Producto actualizado en el lote.")
      return
    }
    const itemId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`
    setBatchCart((prev) => [
      ...prev,
      {
        id: itemId,
        name: payload?.name ?? "Producto sin nombre",
        payload,
      },
    ])
    setVariantRows([])
    setIngredientRows([])
    setExtraAttributes({})
    form.reset({
      ...emptyProductValues,
      status: form.getValues("status") ?? "Activo",
      categoryId: form.getValues("categoryId") ?? "",
    })
    toast.success("Producto agregado al lote.")
  }, [
    batchCart,
    buildPayload,
    currentProductId,
    editingBatchId,
    existingProductNames,
    form,
  ])

  const startBatchEditFromCart = useCallback(
    (item: BatchCartItem) => {
      const payload = item.payload ?? {}
      const nextExtraAttributes = (payload.extraAttributes ??
        {}) as Record<string, unknown>
      setEditingBatchId(item.id)
      setExtraFieldError(null)
      setExtraAttributes(nextExtraAttributes)
      const rawVariants = (payload.extraAttributes as Record<string, unknown> | undefined)
        ?.variants
      setVariantRows(normalizeVariantRows(rawVariants))
      const rawIngredients = (payload.extraAttributes as Record<string, unknown> | undefined)
        ?.ingredients
      setIngredientRows(
        Array.isArray(rawIngredients) ? (rawIngredients as IngredientRow[]) : [],
      )
      form.reset({
        ...emptyProductValues,
        name: payload.name ?? item.name ?? "",
        description: payload.description ?? "",
        brand: payload.brand ?? "",
        price: payload.price ?? 0,
        priceSell: payload.priceSell ?? 0,
        images:
          Array.isArray(payload.images) && payload.images.length
            ? payload.images
            : [""],
        status: payload.status ?? "Activo",
        categoryId: payload.categoryId ? String(payload.categoryId) : "",
        processor: payload.processor ?? "",
        ram: payload.ram ?? "",
        storage: payload.storage ?? "",
        graphics: payload.graphics ?? "",
        screen: payload.screen ?? "",
        resolution: payload.resolution ?? "",
        refreshRate: payload.refreshRate ?? "",
        connectivity: payload.connectivity ?? "",
        features: Array.isArray(payload.features) ? payload.features : [],
      })
      requestAnimationFrame(() => {
        nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        nameInputRef.current?.focus()
      })
      toast.message("Producto listo para actualizar.")
    },
    [form],
  )

  const handleCreateBatch = useCallback(async () => {
    if (!batchCart.length) return
    setIsProcessing(true)
    try {
      for (const item of batchCart) {
        await createProduct(item.payload)
      }
      toast.success("Productos creados correctamente.")
      setBatchCart([])
      localStorage.removeItem(BATCH_CART_STORAGE_KEY)
      if (!onSuccess) {
        router.push("/dashboard/products")
        router.refresh()
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Error al crear productos."
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }, [batchCart, onSuccess, router])

  const handleSubmitWithBatchGuard = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      if (!batchCart.length || currentProductId) {
        return onSubmit(event)
      }

      event?.preventDefault()
      event?.stopPropagation()

      const values = form.getValues()
      const draftName = String(values?.name ?? '').trim()
      const draftCategory = String(values?.categoryId ?? '').trim()
      const hasRequiredDraft = draftName.length >= 3 && draftCategory.length > 0

      if (draftName.length === 0) {
        setIsBatchOnlyConfirmOpen(true)
        return
      }

      if (!hasRequiredDraft) {
        await form.trigger(['name', 'categoryId'])
        return
      }

      const isValid = await form.trigger()
      if (!isValid) {
        return
      }

      return onSubmit()
    },
    [batchCart.length, currentProductId, form, handleCreateBatch, onSubmit],
  )

  const handleConfirmCreateOnly = useCallback(async () => {
    if (!pendingBatchPayload) {
      setIsBatchConfirmOpen(false)
      return
    }
    const normalizedName = String(pendingBatchPayload?.name ?? "").trim().toLowerCase()
    if (normalizedName && existingProductNames.has(normalizedName)) {
      toast.error("Ya existe un producto con ese nombre.")
      setIsBatchConfirmOpen(false)
      return
    }
    setIsProcessing(true)
    setIsBatchConfirmOpen(false)
    try {
      const savedProduct = await createProduct(pendingBatchPayload)
      toast.success("Producto creado correctamente.")
      if (onSuccess) {
        await onSuccess(savedProduct)
      } else {
        router.push("/dashboard/products")
        router.refresh()
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Error al crear el producto."
      toast.error(message)
    } finally {
      setPendingBatchPayload(null)
      setIsProcessing(false)
    }
  }, [existingProductNames, onSuccess, pendingBatchPayload, router])

  useEffect(() => {
  if (product?.categoryId != null) {
    setValue('categoryId', String(product.categoryId), { shouldValidate: true })
  }
  // solo cuando cambia el id del producto
  }, [product?.id, setValue])

  useEffect(() => {
    setExtraAttributes((product?.extraAttributes ?? {}) as Record<string, unknown>)
    const rawVariants = (product?.extraAttributes as Record<string, unknown> | undefined)?.variants
    setVariantRows(normalizeVariantRows(rawVariants))
    const rawIngredients = (product?.extraAttributes as Record<string, unknown> | undefined)
      ?.ingredients
    setIngredientRows(Array.isArray(rawIngredients) ? (rawIngredients as IngredientRow[]) : [])
  }, [product?.id, product?.extraAttributes])

  useEffect(() => {
    const raw = localStorage.getItem(BATCH_CART_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const deduped = parsed.filter((item, index, self) => {
          const normalized = String(item?.name ?? '').trim().toLowerCase()
          if (!normalized) return false
          return (
            self.findIndex((entry) => String(entry?.name ?? '').trim().toLowerCase() === normalized) ===
            index
          )
        })
        setBatchCart(deduped)
      }
    } catch (error) {
      console.warn("No se pudo leer el carrito de productos.", error)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(BATCH_CART_STORAGE_KEY, JSON.stringify(batchCart))
  }, [batchCart])

  useEffect(() => {
    setExtraAttributes((prev) => {
      const next = { ...prev }
      if (variantRows.length) {
        next.variants = variantRows
      } else {
        delete next.variants
      }
      return next
    })
  }, [variantRows])

  useEffect(() => {
    setExtraAttributes((prev) => {
      const next = { ...prev }
      if (ingredientRows.length) {
        next.ingredients = ingredientRows
      } else {
        delete next.ingredients
      }
      return next
    })
  }, [ingredientRows])

  const nameRegister = register('name')
  const renderOptionalChip = (filled: boolean) => (
    <span
      className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-border/60 bg-muted/30 text-muted-foreground'
      }`}
    >
      {filled ? <Check className="h-3 w-3" /> : null}
      {filled ? 'Listo' : 'Opcional'}
    </span>
  )

  return (
    <div className="container mx-auto grid w-full max-w-2xl sm:max-w-2xl md:max-w-5xl lg:max-w-6xl xl:max-w-none">
      <form className='relative flex flex-col gap-2' onSubmit={handleSubmitWithBatchGuard}>
        {isProcessing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Registrando producto...</p>
            </div>
          </div>
        )}
        <fieldset disabled={isProcessing} className="contents">
          <div className="grid grid-cols-1 gap-x-0.5 gap-y-4 md:gap-x-1 md:gap-y-5 lg:grid-cols-3">
                    <div className='flex flex-col lg:col-start-1 lg:row-start-1'>
                        <Label className='py-3'>
                            Nombre del Producto
                            <span
                              className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                hasName
                                  ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                                  : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
                              }`}
                            >
                              {hasName ? 'Listo' : 'Requerido'}
                            </span>
                        </Label>
                        <Input
                        {...nameRegister}
                        ref={(node) => {
                          nameRegister.ref(node)
                          nameInputRef.current = node
                        }}
                        maxLength={200} // Limita a 50 caracteres
                        ></Input>
                        {!suppressInlineErrors && form.formState.errors.name && (
                            <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {form.formState.errors.name.message}
                            </p>
                        )}
                          {!suppressInlineErrors && nameError && (
                            <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {nameError}
                            </p>
                          )}
                    </div>

                    <div className="flex flex-col lg:col-start-2 lg:row-start-1">
                        {/* CATEGORIA */}
                        <Label className='py-3'>
                          Categoria
                          <span
                            className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              hasCategory
                                ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                                : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
                            }`}
                          >
                            {hasCategory ? 'Listo' : 'Requerido'}
                          </span>
                        </Label>
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            {categoryOptions.length > 0 ? (
                              <Controller
                                name="categoryId"
                                control={control}
                                render={({ field, fieldState }) => (
                                  <>
                                    <Select
                                      disabled={isProcessing || isLoadingCategories}
                                      value={field.value ?? ''}                         // valor controlado
                                      onValueChange={(val) => { field.onChange(val); clearErrors('categoryId') }}
                                    >
                                      <SelectTrigger className="w-full cursor-pointer border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <SelectValue placeholder="Seleccione una categoria" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-card text-foreground border border-border rounded-lg max-h-60 overflow-y-auto">
                                        {categoryOptions.map((category: any) => (
                                          <SelectItem
                                            key={category.id}
                                            value={String(category.id)}
                                            className="px-4 py-2 hover:bg-muted dark:hover:bg-muted/50 cursor-pointer"
                                          >
                                            {category.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {!suppressInlineErrors && fieldState.error && (
                                      <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {fieldState.error.message}
                                      </p>
                                    )}
                                  </>
                                )}
                              />
                            ) : isLoadingCategories ? (
                              <div className="flex h-10 items-center justify-center rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground">
                                Cargando categorias...
                              </div>
                            ) : (
                              <div className="flex h-10 items-center justify-center rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground">
                                No hay categorias disponibles
                              </div>
                            )}
                          </div>
                          <Dialog
                            open={isCategoryDialogOpen}
                            onOpenChange={(open) => {
                              setIsCategoryDialogOpen(open)
                              if (!open) {
                                setNewCategoryName('')
                                setNewCategoryDescription('')
                                setCategoryError(null)
                              }
                            }}
                          >
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="cursor-pointer border-emerald-500/60 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500 dark:border-emerald-400/50 dark:text-emerald-400"
                                    >
                                      <Plus className="h-4 w-4" aria-hidden="true" />
                                      <span className="sr-only">Agregar nueva categoria</span>
                                    </Button>
                                  </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Agregar nueva categoria
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Nueva categoria</DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1">
                                  <Label htmlFor="new-category-name">Nombre</Label>
                                  <Input
                                    id="new-category-name"
                                    value={newCategoryName}
                                    onChange={(event) => setNewCategoryName(event.target.value)}
                                    placeholder="Nombre de la categoria"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label htmlFor="new-category-description">Descripcion (opcional)</Label>
                                  <Input
                                    id="new-category-description"
                                    value={newCategoryDescription}
                                    onChange={(event) => setNewCategoryDescription(event.target.value)}
                                    placeholder="Descripcion de la categoria"
                                  />
                                </div>
                                {categoryError && (
                                  <p className="text-sm text-red-500">{categoryError}</p>
                                )}
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button type="button" variant="outline" disabled={isCreatingCategory}>
                                    Cancelar
                                  </Button>
                                </DialogClose>
                                <Button
                                  type="button"
                                  onClick={handleCreateCategory}
                                  disabled={isCreatingCategory}
                                >
                                {isCreatingCategory ? (
                                    <span className="flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Guardando
                                    </span>
                                  ) : (
                                    'Crear'
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        {categoryOptions.length === 0 && !isLoadingCategories && (
                          <p className="pt-2 text-sm text-muted-foreground">
                            Crea una categoria para continuar.
                          </p>
                        )}
                    </div>
                    
                    <div className="flex flex-col lg:col-start-1 lg:row-start-2">
                        <Label className='py-3'>
                            Marca
                            {renderOptionalChip(hasBrand)}
                        </Label>
                        <Input
                        disabled={isProcessing || isLoadingBrands}
                        list="brand-options"
                        maxLength={50}
                        {...register('brand')}></Input>
                        <datalist id="brand-options">
                          {brands.map((b) => (
                            <option key={b.id} value={b.name} />
                          ))}
                        </datalist>
                        {isLoadingBrands && (
                          <p className="pt-1 text-xs text-muted-foreground">
                            Cargando marcas...
                          </p>
                        )}
                        {form.formState.errors.brand && (
                            <p className="text-red-500 text-sm">{form.formState.errors.brand.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col lg:col-start-2 lg:row-start-2">
                        <Label className='py-3'>
                            Descripcion
                            {renderOptionalChip(hasDescription)}
                        </Label>
                        <Input
                        maxLength={200} // Limita a 100 caracteres
                        {...register('description')}></Input>
                        {form.formState.errors.description && (
                            <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col lg:col-start-3 lg:row-start-2">
                        <Label className='py-3'>
                            Selecciona un estado
                        </Label>
                        <Select
                          value={form.watch("status")}
                          disabled={isProcessing}
                          defaultValue={form.getValues("status")}
                          onValueChange={(value:any) => setValue("status", value as "Activo" | "Inactivo", {shouldValidate: true})}
                        >
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SelectTrigger className="w-full cursor-pointer">
                                      <SelectValue /> {/*placeholder="Estado" */}
                                  </SelectTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">Selecciona el estado del producto</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <SelectContent>
                                <SelectItem value="Activo">Activo</SelectItem>
                                <SelectItem value="Inactivo">Inactivo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:col-span-3 lg:row-start-3 lg:grid-cols-[1fr_1fr_1fr_1.35fr]">
                        <div className="flex flex-col">
                            <Label className='py-3'>
                                Precio de Compra
                                {renderOptionalChip(hasPrice)}
                            </Label>
                            <Input 
                            step="0.01" // Permite valores con dos decimales
                            min={0} // Valor minimo permitido
                            max={99999999.99} // Valor maximo permitido
                            type="number" 
                            {...register('price', {valueAsNumber: true})}></Input>
                            {form.formState.errors.price && (
                                <p className="text-red-500 text-sm">{form.formState.errors.price.message}</p>
                            )}
                        </div>

                        <div className="flex flex-col">
                            <Label className='py-3'>
                                Precio de Venta
                                {renderOptionalChip(hasPriceSell)}
                            </Label>
                            <Input 
                            step="0.01" // Permite valores con dos decimales
                            min={0} // Valor minimo permitido
                            max={99999999.99} // Valor maximo permitido
                            type="number"
                            {...register('priceSell', {valueAsNumber: true})}></Input>
                            {form.formState.errors.priceSell && (
                                <p className="text-red-500 text-sm">{form.formState.errors.priceSell.message}</p>
                            )}
                        </div>

                        <div className="flex flex-col">
                            <Label className='py-3'>
                                Cantidad / Stock inicial
                                {renderOptionalChip(hasInitialStock)}
                            </Label>
                            <Input
                            step="1"
                            min={0}
                            max={99999999.99}
                            type="number"
                            {...register('initialStock', {valueAsNumber: true})}></Input>
                            {form.formState.errors.initialStock && (
                              <p className="text-red-500 text-sm">{form.formState.errors.initialStock.message}</p>
                            )}
                        </div>

                        <div className="flex flex-col">
                          <Label className='py-3 font-semibold'>
                            Caracteristicas
                            {renderOptionalChip(hasFeatures)}
                          </Label>
                          {featureFields.map((field, index) => (
                            <div key={field.id} className="flex flex-col md:flex-row gap-2 mb-2">
                              <Select
                                disabled={isProcessing}
                                value={form.watch(`features.${index}.icon` as const)}
                                onValueChange={(value:any) =>
                                  setValue(`features.${index}.icon` as const, value as IconName)
                                }
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Icono" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(icons).map((key) => {
                                    const Icon = icons[key as IconName]
                                    return (
                                      <SelectItem key={key} value={key} className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" /> {key}
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                              <Input placeholder='Titulo' {...register(`features.${index}.title` as const)} className='flex-1'/>
                              <Input placeholder='Descripcion' {...register(`features.${index}.description` as const)} className='flex-1'/>
                              <Button
                                type='button'
                                variant='destructive'
                                className="h-10 w-10 px-0"
                                onClick={() => removeFeature(index)}
                              >
                                <span className="text-base leading-none">X</span>
                              </Button>
                            </div>
                          ))}
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="cursor-pointer"
                                  onClick={() =>
                                    appendFeature({ icon: '', title: '', description: '' })
                                  }
                                >
                                  Agregar caracteristica
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Agregar caracteristica</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                    </div>
                    </div>

                    {schemaFields.length > 0 && (
                      <div className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-4 lg:col-span-2 lg:col-start-1 lg:row-start-5 lg:pr-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <Label className="text-sm font-medium">
                              Campos del vertical ({verticalInfo?.config?.displayName ?? 'Vertical'})
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Ajusta la informacion requerida por el esquema {verticalName}.
                            </p>
                            {extraFieldError && (
                              <p className="mt-1 text-xs text-red-500">{extraFieldError}</p>
                            )}
                          </div>
                          {isLegacyProduct && (
                            <Badge variant="destructive" className="self-start">
                              Legacy
                            </Badge>
                          )}
                        </div>
                        {isLegacyProduct && (
                          <div className="rounded-md bg-amber-50/70 p-3 text-xs text-amber-800">
                            Este producto aun no se ha migrado al esquema de {verticalName}.{" "}
                            <Link
                              href={`${MIGRATION_ASSISTANT_PATH}?productId=${product?.id ?? ""}`}
                              className="font-semibold underline"
                            >
                              Dividir stock / completar datos
                            </Link>
                          </div>
                        )}
                        {groupedSchemaFields.map(([groupKey, fields]) => (
                          <div key={groupKey} className="space-y-3 rounded-md border border-dashed p-3">
                            <div>
                              <p className="text-sm font-semibold capitalize">
                                {groupKey === "general"
                                  ? "Campos generales"
                                  : groupKey.replace(/[-_]/g, " ")}
                              </p>
                              {groupKey === "clothing" && (
                                <p className="text-xs text-muted-foreground">
                                  Administra tallas y colores para cada variante.
                                </p>
                              )}
                              {groupKey === "kitchen" && (
                                <p className="text-xs text-muted-foreground">
                                  Define estaciones y tiempos de preparacion para la cocina.
                                </p>
                              )}
                            </div>
                            {fields.map((field) => (
                              <div key={field.key} className="space-y-2">
                                <Label className="text-sm font-medium">
                                  {field.label}
                                  {field.required && <span className="ml-1 text-red-500">*</span>}
                                </Label>
                                {renderSchemaField(field)}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    
                    {showComputerSpecs && (
                      <div className="flex flex-col pt-4 lg:col-span-3">
                          <Label className='py-3 font-semibold'>
                            Especificaciones
                            {renderOptionalChip(hasSpecs)}
                          </Label>
                          <Input placeholder='Procesador' {...register('processor')} className='mb-2'></Input>
                          <Input placeholder='RAM' {...register('ram')} className='mb-2'></Input>
                          <Input placeholder='Almacenamiento' {...register('storage')} className='mb-2'></Input>
                          <Input placeholder='Graficos' {...register('graphics')} className='mb-2'></Input>
                          <Input placeholder='Pantalla' {...register('screen')} className='mb-2'></Input>
                          <Input placeholder='Resolucion' {...register('resolution')} className='mb-2'></Input>
                          <Input placeholder='Tasa de refresco' {...register('refreshRate')} className='mb-2'></Input>
                          <Input placeholder='Conectividad' {...register('connectivity')}></Input>
                      </div>
                    )}

                    <div className="flex flex-col pt-4 lg:col-span-3 lg:col-start-1 lg:row-start-5">
                      <Label className="py-3 font-semibold">
                        Imagenes
                        {renderOptionalChip(hasImages)}
                      </Label>
                      {imageFields.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No hay imagenes registradas aun.
                        </p>
                      )}
                      <div className="space-y-4">
                        {imageFields.map((field, index) => {
                          const preview = form.watch(`images.${index}` as const) || '';
                          return (
                            <div
                              key={field.id}
                              className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start"
                            >
                              <div className="flex-1 space-y-2">
                                <Input
                                  placeholder="URL o ruta relativa /uploads"
                                  {...register(`images.${index}` as const)}
                                />
                                <TooltipProvider delayDuration={150}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        disabled={isProcessing}
                                        className="cursor-pointer"
                                        onChange={(event) => handleImageFile(event, index)}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Seleccionar imagen</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <p className="text-xs text-muted-foreground">
                                  Puedes ingresar una URL externa o subir un archivo (se almacenara en /uploads).
                                </p>
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                {preview ? (
                                  <img
                                    src={resolveImageUrl(preview)}
                                    alt={`preview-${index}`}
                                    className="h-24 w-24 rounded border object-cover"
                                  />
                                ) : (
                                  <div className="flex h-24 w-24 items-center justify-center rounded border text-xs text-muted-foreground">
                                    Sin vista previa
                                  </div>
                                )}
                                <TooltipProvider delayDuration={150}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="cursor-pointer"
                                        onClick={() => removeImage(index)}
                                        disabled={isProcessing}
                                      >
                                        Quitar
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Quitar imagen</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-3 w-fit cursor-pointer"
                              disabled={isProcessing}
                              onClick={() => appendImage('')}
                            >
                              Agregar imagen
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Agregar imagen</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
          </div>
          <div className="mt-6 flex flex-col gap-2 lg:flex-row lg:justify-end">
            <Button
              className="cursor-pointer transition-colors hover:bg-primary/90 hover:shadow-sm"
              disabled={isProcessing || Boolean(editingBatchId)}
            >
              {currentProductId
                ? 'Actualizar Producto'
                : batchCount > 0
                  ? `Crear Productos (${createProductsCount || batchCount})`
                  : 'Crear Producto'}
            </Button>
            {!currentProductId && (
              <Button
                type="button"
                className="cursor-pointer bg-emerald-600 text-white transition-colors hover:bg-emerald-700 hover:shadow-sm dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-600"
                onClick={handleAddAnother}
                disabled={isProcessing}
              >
                {editingBatchId ? "Actualizar producto" : "Agregar otro producto"}
              </Button>
            )}
            <Button
              variant="outline"
              className="cursor-pointer border-slate-300/80 bg-transparent text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/30 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/10"
              type="button"
              onClick={() => {
                setEditingBatchId(null)
                setExtraAttributes({})
                setVariantRows([])
                setIngredientRows([])
                setExtraFieldError(null)
                setNameError(null)
                form.reset({
                  name: "",
                  description: "",
                  brand: "",
                  price: 0.0,
                  priceSell: 0.0,
                  initialStock: 0,
                  images: [""],
                  status: "Activo",
                  categoryId: "",
                  processor: "",
                  ram: "",
                  storage: "",
                  graphics: "",
                  screen: "",
                  resolution: "",
                  refreshRate: "",
                  connectivity: "",
                  features: [],
                })
              }}
            >
              Limpiar
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer border-slate-300/80 bg-transparent text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/30 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/10"
              type="button"
              onClick={() => {
                if (onCancel) {
                  onCancel()
                } else {
                  router.back()
                }
              }}
            >
              Volver
            </Button>
          </div>
        </fieldset>
      </form>
      {batchCart.length > 0 && !currentProductId && (
        <div className="fixed bottom-6 right-6 z-40 w-[280px] rounded-xl border border-border/60 bg-card/95 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Productos agregados</p>
            <Badge variant="secondary">{batchCart.length}</Badge>
          </div>
          <div className="mt-3 max-h-40 space-y-2 overflow-auto text-xs">
              {batchCart.map((item) => {
                const imageSrc =
                  Array.isArray(item.payload?.images) && item.payload.images[0]
                    ? resolveImageUrl(String(item.payload.images[0]))
                    : null
                const categoryLabel =
                  categories?.find(
                    (category) =>
                      String(category.id) === String(item.payload?.categoryId ?? ""),
                  )?.name ??
                  item.payload?.category?.name ??
                  ""
                const brandLabel =
                  typeof item.payload?.brand === "string"
                    ? item.payload.brand.trim()
                    : ""
                const purchasePrice = formatMoney(item.payload?.price)
                const salePrice = formatMoney(item.payload?.priceSell)
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <div
                      className={`flex min-w-0 flex-1 items-start gap-2 rounded-md p-2 transition-colors ${
                        editingBatchId === item.id
                          ? "bg-muted/10 ring-1 ring-primary/30"
                          : "cursor-pointer hover:bg-muted/10"
                      }`}
                      onClick={() => startBatchEditFromCart(item)}
                      title="Clic para editar en el formulario"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded border border-border/60 bg-muted/20">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={item.name}
                            className="h-6 w-6 rounded object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">IMG</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Producto
                        </p>
                        <p className="truncate text-xs font-medium">{item.name}</p>
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground/80">
                            Marca:
                          </span>{" "}
                          {brandLabel || "-"}{" "}
                          <span className="text-muted-foreground">|</span>{" "}
                          <span className="font-semibold text-foreground/80">
                            Categoria:
                          </span>{" "}
                          {categoryLabel || "-"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground/80">
                            Compra:
                          </span>{" "}
                          {purchasePrice ?? "-"}{" "}
                          <span className="text-muted-foreground">|</span>{" "}
                          <span className="font-semibold text-foreground/80">
                            Venta:
                          </span>{" "}
                          {salePrice ?? "-"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer text-rose-500 hover:text-rose-600 dark:text-rose-300 dark:hover:text-rose-200"
                      onClick={(event) => {
                        event.stopPropagation()
                        setBatchCart((prev) =>
                          prev.filter((entry) => entry.id !== item.id),
                        )
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setBatchCart([])}
              disabled={isProcessing}
            >
              Vaciar
            </Button>
          </div>
        </div>
      )}
      <Dialog open={isBatchConfirmOpen} onOpenChange={setIsBatchConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear productos</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se crearan{" "}
            <span className="font-semibold text-foreground">
              {batchCart.length + 1}
            </span>{" "}
            producto(s): el del formulario actual y{" "}
            <span className="font-semibold text-foreground">{batchCart.length}</span> en el
            carrito.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleConfirmCreateOnly}
              disabled={isProcessing}
            >
              Crear solo este
            </Button>
            <Button type="button" onClick={handleConfirmCreateAll} disabled={isProcessing}>
              Crear todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isBatchOnlyConfirmOpen} onOpenChange={setIsBatchOnlyConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear productos agregados</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El formulario actual no est&aacute; completo. Puedes crear los{" "}
            <span className="font-semibold text-foreground">{batchCart.length}</span>{" "}
            producto(s) del carrito y continuar editando luego.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBatchOnlyConfirmOpen(false)}
              disabled={isProcessing}
            >
              Volver al formulario
            </Button>
            <Button
              type="button"
              onClick={async () => {
                setIsBatchOnlyConfirmOpen(false)
                await handleCreateBatch()
              }}
              disabled={isProcessing}
            >
              Crear productos agregados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isStockDialogOpen}
        onOpenChange={(open) => {
          setIsStockDialogOpen(open)
          if (!open) {
            setPendingStockPayload(null)
            setPendingStockQuantity(0)
            setStockStoreId('')
            setStockProviderId('')
            setStockDialogError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar stock inicial</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Indica la tienda y el proveedor para registrar{" "}
            <span className="font-semibold text-foreground">
              {pendingStockQuantity}
            </span>{" "}
            unidad(es) de stock inicial.
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label>Tienda de destino</Label>
              <Select value={stockStoreId} onValueChange={setStockStoreId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una tienda" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store: any) => (
                    <SelectItem key={store.id} value={String(store.id)}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Proveedor</Label>
              <Select value={stockProviderId} onValueChange={setStockProviderId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider: any) => (
                    <SelectItem key={provider.id} value={String(provider.id)}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {stockDialogError && (
              <p className="text-xs text-rose-500">{stockDialogError}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStockDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmInitialStock} disabled={isProcessing}>
              Registrar stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductForm
























