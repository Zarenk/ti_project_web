"use client"

import Link from 'next/link'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { AlertTriangle, Check, Loader2, Plus, X, Trash2, Boxes, LocateFixed, XCircle, CheckCircle2, Package, Info, DollarSign, Settings, ImageIcon, Store, Truck, ChevronDown, ChevronUp } from 'lucide-react'

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
import {
  createProduct,
  createProductWithStock,
  getProducts,
  updateProduct,
  uploadProductImage,
  validateProductName,
} from '../products.api'
import { getBrands } from '../../brands/brands.api'
import { createCategory, getCategories } from '../../categories/categories.api'
import { getStores } from '../../stores/stores.api'
import { getProviders } from '../../providers/providers.api'
import { createEntry } from '../../entries/entries.api'
import { ProductSerialsDialog } from '../../entries/components/quick-entry/serials-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { IconName, icons } from '@/lib/icons'
import { useTenantSelection } from '@/context/tenant-selection-context'
import { resolveImageUrl } from '@/lib/images'
import { useVerticalConfig } from '@/hooks/use-vertical-config'
import { useDebounce } from '@/app/hooks/useDebounce'
import { useAuth } from '@/context/auth-context'

import { ProductBasicFields } from './components/product-basic-fields'
import { ProductBrandDescription } from './components/product-brand-description'
import { ProductPricingFields } from './components/product-pricing-fields'
import { ProductFeaturesSection } from './components/product-features-section'
import { ProductSchemaFields } from './components/product-schema-fields'
import { ProductComputerSpecs } from './components/product-computer-specs'
import { ProductImagesSection } from './components/product-images-section'
import { ProductBatchPanel } from './components/product-batch-panel'
import { ProductGuideButton } from './components/product-guide-dialog'

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
  initialStock: number
}

const BATCH_CART_STORAGE_KEY = "product-batch-cart:v1"
const BATCH_ASSIGNMENTS_STORAGE_KEY = "product-batch-assignments:v1"
const BATCH_UI_STATE_STORAGE_KEY = "product-batch-ui-state:v1"
const BATCH_SERIALS_STORAGE_KEY = "product-batch-serials:v1"

// ---------------------------------------------------------------------------
// BatchOnlyAssignDialog — Hybrid global + individual store/provider assignment
// ---------------------------------------------------------------------------
type BatchAssignment = {
  storeId: string
  providerId: string
  quantity: number
  price: number
  currency: 'PEN' | 'USD'
}

interface BatchOnlyAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchCart: BatchCartItem[]
  stores: any[]
  providers: any[]
  batchAssignments: Record<string, BatchAssignment>
  updateBatchAssignment: (
    id: string,
    next: Partial<BatchAssignment>,
  ) => void
  isProcessing: boolean
  onCreateWithStock: () => Promise<void>
  onCreateWithoutStock: () => Promise<void>
}

const BatchOnlyAssignDialog = memo(function BatchOnlyAssignDialog({
  open,
  onOpenChange,
  batchCart,
  stores,
  providers,
  batchAssignments,
  updateBatchAssignment,
  isProcessing,
  onCreateWithStock,
  onCreateWithoutStock,
}: BatchOnlyAssignDialogProps) {
  // Only items with stock > 0 need store/provider assignment
  const itemsWithStock = useMemo(
    () => batchCart.filter((item) => item.initialStock > 0),
    [batchCart],
  )

  const [globalStoreId, setGlobalStoreId] = useState('')
  const [globalProviderId, setGlobalProviderId] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showSkipOption, setShowSkipOption] = useState(false)

  // Auto-select when only one store/provider exists.
  // Runs every time the dialog opens so new items always get assigned.
  useEffect(() => {
    if (!open) {
      setExpandedItems(new Set())
      setShowSkipOption(false)
      return
    }

    // --- Single store: auto-assign to every item with stock ---
    if (stores.length === 1) {
      const storeId = String(stores[0].id)
      setGlobalStoreId(storeId)
      for (const item of itemsWithStock) {
        const curr = batchAssignments[item.id]
        if (!curr?.storeId || curr.storeId !== storeId) {
          updateBatchAssignment(item.id, {
            storeId,
            quantity: curr?.quantity || item.initialStock,
          })
        }
      }
    }

    // --- Single provider: auto-assign to every item with stock ---
    if (providers.length === 1) {
      const providerId = String(providers[0].id)
      setGlobalProviderId(providerId)
      for (const item of itemsWithStock) {
        const curr = batchAssignments[item.id]
        if (!curr?.providerId || curr.providerId !== providerId) {
          updateBatchAssignment(item.id, {
            providerId,
            quantity: curr?.quantity || item.initialStock,
          })
        }
      }
    }

    // --- Fix items with quantity=0 that already have store/provider ---
    for (const item of itemsWithStock) {
      const curr = batchAssignments[item.id]
      if (curr && (curr.storeId || curr.providerId) && (!curr.quantity || curr.quantity <= 0)) {
        updateBatchAssignment(item.id, { quantity: item.initialStock })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const applyGlobalStore = useCallback(
    (storeId: string) => {
      setGlobalStoreId(storeId)
      for (const item of itemsWithStock) {
        const curr = batchAssignments[item.id]
        if (!curr?.storeId || curr.storeId === globalStoreId) {
          updateBatchAssignment(item.id, {
            storeId,
            quantity: curr?.quantity || item.initialStock,
          })
        }
      }
    },
    [batchAssignments, itemsWithStock, globalStoreId, updateBatchAssignment],
  )

  const applyGlobalProvider = useCallback(
    (providerId: string) => {
      setGlobalProviderId(providerId)
      for (const item of itemsWithStock) {
        const curr = batchAssignments[item.id]
        if (!curr?.providerId || curr.providerId === globalProviderId) {
          updateBatchAssignment(item.id, {
            providerId,
            quantity: curr?.quantity || item.initialStock,
          })
        }
      }
    },
    [batchAssignments, itemsWithStock, globalProviderId, updateBatchAssignment],
  )

  const allAssigned = itemsWithStock.length > 0 && itemsWithStock.every((item) => {
    const a = batchAssignments[item.id]
    return a && a.storeId && a.providerId && a.quantity > 0
  })

  const assignedCount = itemsWithStock.filter((item) => {
    const a = batchAssignments[item.id]
    return a && a.storeId && a.providerId && a.quantity > 0
  }).length

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-5 w-5 shrink-0" />
            <span>Crear productos agregados ({batchCart.length}){itemsWithStock.length < batchCart.length && ` · ${itemsWithStock.length} con stock`}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Asigna tienda y proveedor para crear los productos con stock inicial.
          </p>

          {/* Global assignment — stacks on mobile */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Asignación global
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {/* Store selector */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 shrink-0" />
                  Tienda
                </Label>
                {stores.length === 1 ? (
                  <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-2 text-sm min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="truncate">{stores[0].name}</span>
                  </div>
                ) : (
                  <Select
                    value={globalStoreId}
                    onValueChange={applyGlobalStore}
                  >
                    <SelectTrigger className="h-9 w-full text-xs">
                      <SelectValue placeholder="Seleccionar tienda" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store: any) => (
                        <SelectItem key={store.id} value={String(store.id)}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Provider selector */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  Proveedor
                </Label>
                {providers.length === 1 ? (
                  <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-2 text-sm min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="truncate">{providers[0].name}</span>
                  </div>
                ) : (
                  <Select
                    value={globalProviderId}
                    onValueChange={applyGlobalProvider}
                  >
                    <SelectTrigger className="h-9 w-full text-xs">
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider: any) => (
                        <SelectItem key={provider.id} value={String(provider.id)}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Products list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Productos
              </p>
              <Badge
                variant={allAssigned ? 'default' : 'secondary'}
                className="text-[10px]"
              >
                {assignedCount}/{itemsWithStock.length} listos
              </Badge>
            </div>

            <div className="max-h-[30vh] sm:max-h-[35vh] overflow-y-auto space-y-1.5 rounded-lg border border-border/40 p-1.5 sm:p-2">
              {itemsWithStock.map((item) => {
                const assignment = batchAssignments[item.id]
                const hasStore = !!assignment?.storeId
                const hasProvider = !!assignment?.providerId
                const hasQty = (assignment?.quantity ?? 0) > 0
                const isComplete = hasStore && hasProvider && hasQty
                const isExpanded = expandedItems.has(item.id)
                const effectiveQty = assignment?.quantity ?? item.initialStock ?? 0

                // Resolve display names
                const storeName = hasStore
                  ? stores.find((s: any) => String(s.id) === assignment.storeId)?.name ?? '—'
                  : '—'
                const providerName = hasProvider
                  ? providers.find((p: any) => String(p.id) === assignment.providerId)?.name ?? '—'
                  : '—'

                return (
                  <div
                    key={item.id}
                    className={`rounded-md border transition-colors overflow-hidden ${
                      isComplete
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-border/60 bg-card/50'
                    }`}
                  >
                    {/* Collapsed row — name wraps up to 2 lines */}
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-2.5 sm:px-3 py-2 text-left min-w-0"
                      onClick={() => toggleExpand(item.id)}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                      )}
                      <span className="flex-1 min-w-0 text-[13px] sm:text-sm font-medium leading-snug line-clamp-2 break-words">
                        {item.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums mr-0.5">
                        ×{effectiveQty}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                      )}
                    </button>

                    {/* Expanded: individual overrides — stacks on mobile */}
                    {isExpanded && (
                      <div className="border-t border-border/40 px-2.5 sm:px-3 pb-3 pt-2 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Tienda</Label>
                            <Select
                              value={assignment?.storeId ?? ''}
                              onValueChange={(v) =>
                                updateBatchAssignment(item.id, { storeId: v })
                              }
                            >
                              <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Tienda" />
                              </SelectTrigger>
                              <SelectContent>
                                {stores.map((s: any) => (
                                  <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Proveedor</Label>
                            <Select
                              value={assignment?.providerId ?? ''}
                              onValueChange={(v) =>
                                updateBatchAssignment(item.id, { providerId: v })
                              }
                            >
                              <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Proveedor" />
                              </SelectTrigger>
                              <SelectContent>
                                {providers.map((p: any) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-xs"
                              value={assignment?.quantity ?? item.initialStock ?? 0}
                              onChange={(e) =>
                                updateBatchAssignment(item.id, {
                                  quantity: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              Resumen
                            </Label>
                            <div className="text-[10px] leading-tight text-muted-foreground space-y-0.5">
                              <div className="flex items-start gap-1 min-w-0">
                                <Store className="h-3 w-3 shrink-0 mt-0.5" />
                                <span className="line-clamp-2 break-words">{storeName}</span>
                              </div>
                              <div className="flex items-start gap-1 min-w-0">
                                <Truck className="h-3 w-3 shrink-0 mt-0.5" />
                                <span className="line-clamp-2 break-words">{providerName}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Progress indicator */}
          {!allAssigned && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs text-amber-200 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Selecciona tienda y proveedor para habilitar la creación con stock.</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col mt-1">
          <div className="flex w-full flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-xs sm:text-sm"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Volver al formulario
            </Button>
            <Button
              type="button"
              className="flex-1 text-xs sm:text-sm"
              onClick={onCreateWithStock}
              disabled={isProcessing || !allAssigned}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Crear con stock ({assignedCount}/{itemsWithStock.length})
            </Button>
          </div>
          {!showSkipOption ? (
            <button
              type="button"
              className="text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              onClick={() => setShowSkipOption(true)}
            >
              Crear sin stock (omitir asignación)
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 sm:px-3 py-2">
              <p className="flex-1 text-[11px] sm:text-xs text-amber-200">
                Los productos se crearán sin stock. Podrás asignarlo luego desde inventario.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs h-7 w-full sm:w-auto"
                onClick={onCreateWithoutStock}
                disabled={isProcessing}
              >
                Confirmar
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

// Optimized: Memoized components for better performance
const OptionalChip = memo(({ filled }: { filled: boolean }) => (
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
))
OptionalChip.displayName = 'OptionalChip'

const RequiredValidationChip = memo(({
  status,
  filled
}: {
  status: "idle" | "checking" | "valid" | "invalid" | undefined
  filled: boolean
}) => {
  if (status === "invalid") {
    return (
      <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
        <AlertTriangle className="h-3 w-3" />
        Ya existe
      </span>
    )
  }
  if (status === "checking") {
    return (
      <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <span className="flex items-center gap-0.5">
          <span className="h-1 w-1 animate-pulse rounded-full bg-amber-600" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-amber-600 [animation-delay:120ms]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-amber-600 [animation-delay:240ms]" />
        </span>
        Validando
      </span>
    )
  }
  if (status === "valid") {
    return <OptionalChip filled={true} />
  }
  return (
    <span
      className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
      }`}
    >
      {filled ? 'Listo' : 'Requerido'}
    </span>
  )
})
RequiredValidationChip.displayName = 'RequiredValidationChip'

export function ProductForm({
  product,
  categories,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const { info: verticalInfo } = useVerticalConfig()
  const verticalName = verticalInfo?.businessVertical ?? "GENERAL"
  const showComputerSpecs = verticalName === "COMPUTERS"
  const isGeneralVertical = verticalName === "GENERAL"
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
  const skipNameValidationRef = useRef(false)
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
  const [isBatchStockDialogOpen, setIsBatchStockDialogOpen] = useState(false)
  const [batchStockError, setBatchStockError] = useState<string | null>(null)
  const [batchAssignments, setBatchAssignments] = useState<
    Record<
      string,
      {
        storeId: string
        providerId: string
        quantity: number
        price: number
        currency: 'PEN' | 'USD'
      }
    >
  >({})
  const [batchSerials, setBatchSerials] = useState<Record<string, string[]>>({})
  const [serialsDialogItemId, setSerialsDialogItemId] = useState<string | null>(null)
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [dragOverStoreId, setDragOverStoreId] = useState<string | null>(null)
  const [dragOverProviderId, setDragOverProviderId] = useState<string | null>(null)
  const [hoveredBatchId, setHoveredBatchId] = useState<string | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [isBatchDragActive, setIsBatchDragActive] = useState(false)
  const [batchDragCursor, setBatchDragCursor] = useState<{ x: number; y: number } | null>(null)
  const batchDialogRef = useRef<HTMLDivElement | null>(null)
  const batchCardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [batchPanelPosition, setBatchPanelPosition] = useState<{ left: number; top: number } | null>(null)
  const batchCartHydratedRef = useRef(false)
  const [floatingPanelPosition, setFloatingPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [isFloatingPanelDragging, setIsFloatingPanelDragging] = useState(false)
  const floatingDragOffsetRef = useRef({ x: 0, y: 0 })
  const floatingDragFrameRef = useRef<number | null>(null)
  const floatingDragPointRef = useRef<{ x: number; y: number } | null>(null)
  const floatingPanelRef = useRef<HTMLDivElement | null>(null)
  const floatingPanelPinnedRef = useRef(false)
  const getDefaultPanelPosition = useCallback(() => {
    const panel = floatingPanelRef.current
    const panelWidth = panel?.offsetWidth ?? 280
    const panelHeight = panel?.offsetHeight ?? 200
    const x = Math.max(0, window.innerWidth - panelWidth - 24)
    const y = Math.max(0, window.innerHeight - panelHeight - 24)
    return { x, y }
  }, [])
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

  const optionLabels: Record<string, string> = useMemo(() => ({
    GRILL: 'Parrilla',
    FRY: 'Freidora',
    COLD: 'Fria',
    BAKERY: 'Horno / Panaderia',
    VEGAN: 'Vegano',
    GLUTEN_FREE: 'Sin Gluten',
    LACTOSE_FREE: 'Sin Lactosa',
    SPICY: 'Picante',
  }), [])

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
                    key={`ingredient-${index}`}
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
                  {optionLabels[option] ?? option}
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
                  <span>{optionLabels[option] ?? option}</span>
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

  // Normalize any value to a finite number (handles strings, NaN, undefined, null)
  const safeNumber = (v: unknown): number => {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    const parsed = Number(v)
    return Number.isFinite(parsed) ? parsed : 0
  }

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
        price: safeNumber(productData.price),
        priceSell: safeNumber(productData.priceSell),
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
      .max(200, "El nombre del producto no puede tener mas de 200 caracteres"),
      // Optimized: Removed costly Unicode regex (\p{L}) that was causing 30-50ms lag per keystroke
      // Users can now type instantly without validation blocking each keystroke
    description: z.string({
    }),
    brand: z.string().optional(),
    price: z.preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) return undefined
        if (typeof value === "string") {
          const normalized = value.replace(",", ".")
          const parsed = Number(normalized)
          return Number.isFinite(parsed) ? parsed : undefined
        }
        return Number.isFinite(value as number) ? value : undefined
      },
      z.number()
        .min(0, "El precio debe ser un numero positivo")
        .max(99999999.99, "El precio no puede exceder 99999999.99")
        .optional(),
    ),
    priceSell: z.preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) return undefined
        if (typeof value === "string") {
          const normalized = value.replace(",", ".")
          const parsed = Number(normalized)
          return Number.isFinite(parsed) ? parsed : undefined
        }
        return Number.isFinite(value as number) ? value : undefined
      },
      z.number()
        .min(0, "El precio de venta debe ser un numero positivo")
        .max(99999999.99, "El precio no puede exceder 99999999.99")
        .optional(),
    ),
    initialStock: z.preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) return undefined
        if (typeof value === "string") {
          const normalized = value.replace(",", ".")
          const parsed = Number(normalized)
          return Number.isFinite(parsed) ? parsed : undefined
        }
        return Number.isFinite(value as number) ? value : undefined
      },
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
            .map((img: string) => normalizeImagePath(img))
            .filter((img: string) => img.length > 0)
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
    // Optimized: Only validate on blur to prevent lag during typing
    mode: 'onTouched',
    reValidateMode: 'onBlur',
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

  const NUMERIC_FIELD_NAMES = ['price', 'priceSell', 'initialStock'] as const

  // Read actual DOM <input> values for numeric fields and push them into form state.
  // Fixes a react-hook-form + React 19 desync where form.getValues() can return
  // stale values that don't match what the user sees in the DOM.
  const syncNumericFieldsFromDOM = useCallback(() => {
    for (const name of NUMERIC_FIELD_NAMES) {
      const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
      if (el) {
        const raw = el.value
        if (raw === '') {
          form.setValue(name, undefined as any, { shouldValidate: false, shouldDirty: false })
        } else {
          const n = Number(raw.replace(',', '.'))
          if (Number.isFinite(n)) {
            form.setValue(name, n, { shouldValidate: false, shouldDirty: false })
          }
        }
      }
    }
  }, [form])

  // Force-set DOM <input> values to match form state after form.reset().
  // Works around a react-hook-form issue where reset() updates internal state
  // but fails to update the DOM for <input type="number"> fields.
  const flushNumericFieldsToDOM = useCallback(() => {
    requestAnimationFrame(() => {
      for (const name of NUMERIC_FIELD_NAMES) {
        const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
        if (el) {
          const v = form.getValues(name)
          el.value = (v != null && Number(v) !== 0) ? String(v) : ''
        }
      }
    })
  }, [form])

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


  const [brands, setBrands] = useState<any[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<any[]>(categories ?? []);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const { version } = useTenantSelection();
  const tenantFetchRef = useRef(true);
  const versionResetRef = useRef(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  // Estado para manejar el error del nombre si se repite
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameValidation, setNameValidation] = useState<{
    status?: "idle" | "checking" | "valid" | "invalid"
    message?: string
  }>({})
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
  // Optimized: Use individual useWatch calls instead of watching all fields at once
  // This prevents re-renders when unrelated fields change
  const watchedName = useWatch({ control, name: 'name' })
  const watchedCategoryId = useWatch({ control, name: 'categoryId' })
  const watchedBrand = useWatch({ control, name: 'brand' })
  const watchedDescription = useWatch({ control, name: 'description' })
  const watchedPrice = useWatch({ control, name: 'price' })
  const watchedPriceSell = useWatch({ control, name: 'priceSell' })
  const watchedInitialStock = useWatch({ control, name: 'initialStock' })
  const watchedImages = useWatch({ control, name: 'images' })
  const watchedFeatures = useWatch({ control, name: 'features' })
  const watchedProcessor = useWatch({ control, name: 'processor' }) ?? ''
  const watchedRam = useWatch({ control, name: 'ram' }) ?? ''
  const watchedStorage = useWatch({ control, name: 'storage' }) ?? ''
  const watchedGraphics = useWatch({ control, name: 'graphics' }) ?? ''
  const watchedScreen = useWatch({ control, name: 'screen' }) ?? ''
  const watchedResolution = useWatch({ control, name: 'resolution' }) ?? ''
  const watchedRefreshRate = useWatch({ control, name: 'refreshRate' }) ?? ''
  const watchedConnectivity = useWatch({ control, name: 'connectivity' }) ?? ''

  // Optimized: Memoize all derived boolean values to prevent unnecessary recalculations
  const hasName = useMemo(() => Boolean(watchedName?.trim()), [watchedName])
  const hasCategory = useMemo(() => Boolean(watchedCategoryId), [watchedCategoryId])
  const hasBrand = useMemo(() => Boolean(watchedBrand?.trim()), [watchedBrand])
  const hasDescription = useMemo(() => Boolean(watchedDescription?.trim()), [watchedDescription])
  const hasPrice = useMemo(
    () => { const n = Number(watchedPrice); return Number.isFinite(n) && n > 0 },
    [watchedPrice]
  )
  const hasPriceSell = useMemo(
    () => { const n = Number(watchedPriceSell); return Number.isFinite(n) && n > 0 },
    [watchedPriceSell]
  )
  const hasInitialStock = useMemo(
    () => { const n = Number(watchedInitialStock); return Number.isFinite(n) && n > 0 },
    [watchedInitialStock]
  )
  const hasImages = useMemo(
    () => Array.isArray(watchedImages) && watchedImages.some((img) => typeof img === 'string' && img.trim().length > 0),
    [watchedImages]
  )
  const hasFeatures = useMemo(
    () => Array.isArray(watchedFeatures) && watchedFeatures.some((feature) =>
      Boolean(feature?.icon?.trim() || feature?.title?.trim() || feature?.description?.trim())
    ),
    [watchedFeatures]
  )
  const hasSpecs = useMemo(
    () => Boolean(
      watchedProcessor?.trim() ||
      watchedRam?.trim() ||
      watchedStorage?.trim() ||
      watchedGraphics?.trim() ||
      watchedScreen?.trim() ||
      watchedResolution?.trim() ||
      watchedRefreshRate?.trim() ||
      watchedConnectivity?.trim()
    ),
    [watchedProcessor, watchedRam, watchedStorage, watchedGraphics, watchedScreen, watchedResolution, watchedRefreshRate, watchedConnectivity]
  )
  // Optimized: Reduced debounce from 1200ms to 400ms for better UX
  // Removed debouncedName (250ms) - using single debounce for both validation and draft state
  const debouncedNameValidation = useDebounce(watchedName ?? '', 400)

  // Removed: Redundant loading of all products for name validation
  // Name validation is already handled by validateProductName API call below

  useEffect(() => {
    const trimmedName = String(debouncedNameValidation ?? "").trim()
    if (trimmedName.length < 3) {
      setNameValidation({ status: "idle", message: undefined })
      return
    }

    // Skip validation when loading a batch item for editing — name was already validated
    if (skipNameValidationRef.current) {
      skipNameValidationRef.current = false
      setNameValidation({ status: "valid", message: undefined })
      return
    }

    let active = true
    setNameValidation({ status: "checking", message: undefined })
    validateProductName({
      name: trimmedName,
      productId: currentProductId ? Number(currentProductId) : undefined,
    })
      .then((result) => {
        if (!active) return
        if (!result.nameAvailable) {
          setNameValidation({
            status: "invalid",
            message: "Ya existe un producto con ese nombre.",
          })
        } else {
          setNameValidation({ status: "valid", message: undefined })
        }
      })
      .catch((error) => {
        if (!active) return
        console.warn("[products] no se pudo validar nombre", error)
        setNameValidation({ status: "idle", message: undefined })
      })

    return () => {
      active = false
    }
  }, [debouncedNameValidation, currentProductId])
  const debouncedCategoryId = useDebounce(watchedCategoryId ?? '', 250)
  // Optimized: Use single debounced value instead of creating a separate one
  const normalizedDraftName = String(debouncedNameValidation ?? '').trim().toLowerCase()
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
  const batchMissingAssignmentsCount = useMemo(() => {
    if (!batchCart.length) return 0
    // Only count items that have stock — items with initialStock=0 are product-only (no inventory)
    return batchCart.filter((item) => {
      if (item.initialStock <= 0) return false
      const assignment = batchAssignments[item.id]
      return !assignment || !assignment.storeId || !assignment.providerId || assignment.quantity <= 0
    }).length
  }, [batchAssignments, batchCart])

  useEffect(() => {
    if (!isBatchStockDialogOpen || !activeBatchId) {
      setBatchPanelPosition(null)
      return
    }
    const dialogEl = batchDialogRef.current
    const cardEl = batchCardRefs.current[activeBatchId]
    if (!dialogEl || !cardEl) return
    const dialogRect = dialogEl.getBoundingClientRect()
    const cardRect = cardEl.getBoundingClientRect()
    const panelWidth = 240
    const panelHeight = 110
    const gap = 8
    let left = cardRect.left - dialogRect.left
    let top = cardRect.bottom - dialogRect.top + gap
    if (left + panelWidth > dialogRect.width - 12) {
      left = Math.max(12, dialogRect.width - panelWidth - 12)
    }
    if (top + panelHeight > dialogRect.height - 12) {
      top = Math.max(12, cardRect.top - dialogRect.top - panelHeight - gap)
    }
    setBatchPanelPosition({ left, top })
  }, [activeBatchId, isBatchStockDialogOpen, batchCart.length])
  const storeAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    batchCart.forEach((item) => {
      const storeId = batchAssignments[item.id]?.storeId
      if (storeId) {
        counts[storeId] = (counts[storeId] ?? 0) + 1
      }
    })
    return counts
  }, [batchAssignments, batchCart])
  const providerAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    batchCart.forEach((item) => {
      const providerId = batchAssignments[item.id]?.providerId
      if (providerId) {
        counts[providerId] = (counts[providerId] ?? 0) + 1
      }
    })
    return counts
  }, [batchAssignments, batchCart])
  const suppressInlineErrors =
    batchCart.length > 0 && !currentProductId && !hasDraftData;

  useEffect(() => {
    if (!pendingCategoryId) return
    if (!categoryOptions?.some((category: any) => String(category.id) === pendingCategoryId)) return
    setValue('categoryId', pendingCategoryId, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
    clearErrors('categoryId')
    void form.trigger('categoryId')
    setPendingCategoryId(null)
  }, [pendingCategoryId, categoryOptions, setValue, clearErrors, form])

  // FIX: Solo resetear el formulario cuando el producto cambia (modo edición),
  // no cada vez que defaultValues se recalcula
  const productIdRef = useRef(product?.id)

  useEffect(() => {
    // Solo resetear si estamos cambiando de producto (crear -> editar, o editar -> otro producto)
    const currentProductId = product?.id
    const hasProductChanged = productIdRef.current !== currentProductId

    if (hasProductChanged) {
      productIdRef.current = currentProductId
      form.reset(defaultValues)
    }
  }, [product?.id, defaultValues, form])

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
          setCategoryOptions(Array.isArray(freshCategories) ? freshCategories : [])
        }
      } catch {
        if (!cancelled) {
          setCategoryOptions([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCategories(false)
        }
      }
    }

    void loadCategories()

    return () => {
      cancelled = true
    }
  }, [version])

  useEffect(() => {
    let cancelled = false

    const loadBrands = async () => {
      setIsLoadingBrands(true)
      try {
        const response = await getBrands(1, 1000)
        const normalizedBrands = Array.isArray(response?.data)
          ? response.data.map((brand: any) => ({ id: brand.id, name: brand.name }))
          : Array.isArray(response)
            ? response
            : []
        if (!cancelled) {
          setBrands(normalizedBrands)
        }
      } catch (error) {
        console.error('Error al obtener las marcas:', error)
        if (!cancelled) {
          setBrands([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBrands(false)
        }
      }
    }

    setBrands([])
    void loadBrands()

    return () => {
      cancelled = true
    }
  }, [version])

  useEffect(() => {
    let cancelled = false

    const loadStores = async () => {
      try {
        const storesResponse = await getStores()
        if (!cancelled) {
          setStores(Array.isArray(storesResponse) ? storesResponse : [])
        }
      } catch (error) {
        console.error('Error al obtener las tiendas:', error)
        if (!cancelled) {
          setStores([])
        }
      }
    }

    setStores([])
    setStockStoreId('')
    void loadStores()

    return () => {
      cancelled = true
    }
  }, [version])

  useEffect(() => {
    let cancelled = false

    const loadProviders = async () => {
      try {
        const providersResponse = await getProviders()
        if (!cancelled) {
          setProviders(Array.isArray(providersResponse) ? providersResponse : [])
        }
      } catch (error) {
        console.error('Error al obtener los proveedores:', error)
        if (!cancelled) {
          setProviders([])
        }
      }
    }

    setProviders([])
    setStockProviderId('')
    void loadProviders()

    return () => {
      cancelled = true
    }
  }, [version])

  // ── Centralized batch cleanup helpers ──────────────────────────────
  const resetBatchState = useCallback(() => {
    setBatchCart([])
    setBatchAssignments({})
    setIsBatchStockDialogOpen(false)
    setIsBatchOnlyConfirmOpen(false)
    setActiveBatchId(null)
    setFloatingPanelPosition(null)
    setIsFloatingPanelDragging(false)
    floatingPanelPinnedRef.current = false
    batchCartHydratedRef.current = false
    setDraggingItemId(null)
    setDragOverStoreId(null)
    setDragOverProviderId(null)
    setHoveredBatchId(null)
    setIsBatchDragActive(false)
    setBatchDragCursor(null)
    setBatchStockError(null)
    setEditingBatchId(null)
    setBatchSerials({})
    setSerialsDialogItemId(null)
    try {
      localStorage.removeItem(BATCH_CART_STORAGE_KEY)
      localStorage.removeItem(BATCH_ASSIGNMENTS_STORAGE_KEY)
      localStorage.removeItem(BATCH_UI_STATE_STORAGE_KEY)
      localStorage.removeItem(BATCH_SERIALS_STORAGE_KEY)
    } catch { /* ignore */ }
    queueMicrotask(() => {
      batchCartHydratedRef.current = true
    })
  }, [])

  const handleRemoveBatchItem = useCallback(
    (itemId: string) => {
      setBatchCart((prev) => prev.filter((entry) => entry.id !== itemId))
      setBatchAssignments((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
      setBatchSerials((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
      if (activeBatchId === itemId) setActiveBatchId(null)
      if (editingBatchId === itemId) setEditingBatchId(null)
      if (hoveredBatchId === itemId) setHoveredBatchId(null)
    },
    [activeBatchId, editingBatchId, hoveredBatchId],
  )

  const handleClearBatchCart = useCallback(() => {
    resetBatchState()
  }, [resetBatchState])
  // ── End centralized batch cleanup ────────────────────────────────

  // Clear batch cart when organization/company changes
  useEffect(() => {
    if (versionResetRef.current) {
      versionResetRef.current = false
      return
    }
    resetBatchState()
  }, [version, resetBatchState])

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

      setIsLoadingCategories(true)
      let refreshedCategories: any[] | null = null
      try {
        const freshCategories = await getCategories()
        refreshedCategories = Array.isArray(freshCategories) ? freshCategories : null
      } catch {
        refreshedCategories = null
      }

      const mergedCategories = (refreshedCategories ?? []).some((c: any) => c.id === createdCategory.id)
        ? (refreshedCategories ?? [])
        : [...(refreshedCategories ?? []), createdCategory]

      if (mergedCategories.length > 0) {
        setCategoryOptions(mergedCategories)
      } else {
        setCategoryOptions((prev) => {
          const exists = prev.some((category: any) => category.id === createdCategory.id)
          if (exists) {
            return prev.map((category: any) =>
              category.id === createdCategory.id ? createdCategory : category,
            )
          }
          return [...prev, createdCategory]
        })
      }
      setIsLoadingCategories(false)

      const createdId = createdCategory?.id != null ? String(createdCategory.id) : ''
      if (createdId) {
        setPendingCategoryId(createdId)
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

  const [imageUploadErrors, setImageUploadErrors] = useState<Record<number, string>>({})

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Clear previous error for this slot
    setImageUploadErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    try {
      const { url } = await uploadProductImage(file);
      const normalizedPath = normalizeImagePath(url);
      setValue(`images.${index}` as const, normalizedPath, {
        shouldDirty: true,
        shouldValidate: true,
      })
      clearErrors(`images.${index}` as const)
    } catch (err: any) {
      const message = err?.message || 'Error al subir la imagen'
      toast.error(message)
      setImageUploadErrors((prev) => ({ ...prev, [index]: message }))
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
        if (normalizedName && nameValidation.status === "checking") {
          const message = "Aun estamos validando el nombre del producto."
          setNameError(message)
          toast.error(message)
          setIsProcessing(false)
          return
        }
        if (normalizedName && nameValidation.status === "invalid") {
          const message =
            nameValidation.message ?? "Ya existe un producto con ese nombre."
          setNameError(message)
          toast.error(message)
          setIsProcessing(false)
          return
        }
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

        const initialStockValue = safeNumber(data.initialStock)

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
    const createdCount: number[] = []
    try {
      const savedProduct = await createProduct(pendingBatchPayload)
      createdCount.push(1)
      for (const item of batchCart) {
        await createProduct(item.payload)
        createdCount.push(1)
      }
      toast.success("Productos creados correctamente.")
      resetBatchState()
      if (onSuccess) {
        await onSuccess(savedProduct)
      } else {
        router.push("/dashboard/products")
        router.refresh()
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Error al crear productos."
      if (createdCount.length > 0) {
        // Some products were created before the failure
        const remaining = batchCart.slice(Math.max(0, createdCount.length - 1))
        setBatchCart(remaining)
        toast.error(
          `${createdCount.length} producto(s) creados. Error al continuar: ${message}`,
        )
      } else {
        toast.error(message)
      }
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
      const purchasePrice = Number((pendingStockPayload as any)?.price ?? 0)
      const result = await createProductWithStock(pendingStockPayload, {
        storeId: Number(stockStoreId),
        userId,
        providerId: Number(stockProviderId),
        quantity: pendingStockQuantity,
        price: purchasePrice,
        priceInSoles: purchasePrice,
        tipoMoneda: "PEN",
      })
      toast.success("Producto creado con stock inicial.")
      setPendingStockPayload(null)
      setPendingStockQuantity(0)
      setStockStoreId('')
      setStockProviderId('')
      setIsStockDialogOpen(false)
      if (onSuccess) {
        await onSuccess(result.product)
      } else {
        router.push("/dashboard/products")
        router.refresh()
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Error al crear el producto con stock"
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }, [onSuccess, pendingStockPayload, pendingStockQuantity, router, stockProviderId, stockStoreId, userId])

  const updateBatchAssignment = useCallback(
    (id: string, next: Partial<{ storeId: string; providerId: string; quantity: number; price: number; currency: 'PEN' | 'USD' }>) => {
      setBatchAssignments((prev) => {
        const current = prev[id]
        const currentQty = current?.quantity ?? 0
        const isFirstAssignment = currentQty === 0 && (next.storeId || next.providerId)
        const item = batchCart.find((entry) => entry.id === id)
        // Auto-set quantity from initialStock (or 1 as fallback) on first assignment
        const autoQuantity = isFirstAssignment
          ? (item?.initialStock && item.initialStock > 0 ? item.initialStock : 1)
          : currentQty
        // Auto-set price from product payload on first assignment
        let autoPrice = current?.price ?? 0
        if (isFirstAssignment && autoPrice === 0) {
          autoPrice = Number(item?.payload?.price ?? 0)
        }
        return {
          ...prev,
          [id]: {
            storeId: current?.storeId ?? '',
            providerId: current?.providerId ?? '',
            quantity: autoQuantity,
            price: autoPrice,
            currency: current?.currency ?? 'PEN',
            ...next,
          },
        }
      })
    },
    [batchCart],
  )

  const handleCreateBatchWithAssignments = useCallback(async () => {
    if (!batchCart.length) return
    if (batchMissingAssignmentsCount > 0) {
      toast.error("Completa la asignación de stock para los productos con cantidad antes de crear.")
      return
    }
    if (!userId) {
      toast.error("No se pudo identificar al usuario para registrar el stock.")
      return
    }
    setIsProcessing(true)
    setBatchStockError(null)
    const successIds: string[] = []
    try {
      // Phase 1: Create all products first (with and without stock)
      const createdWithStock: {
        cartId: string
        productId: number
        assignment: NonNullable<typeof batchAssignments[string]>
      }[] = []

      for (const item of batchCart) {
        const product = await createProduct(item.payload)
        successIds.push(item.id)

        const assignment = batchAssignments[item.id]
        if (
          assignment &&
          assignment.storeId &&
          assignment.providerId &&
          assignment.quantity > 0
        ) {
          createdWithStock.push({
            cartId: item.id,
            productId: product.id,
            assignment,
          })
        }
      }

      // Phase 2: Group products with stock by (storeId + providerId + currency)
      // so we create ONE entry per provider instead of one per product
      if (createdWithStock.length > 0) {
        const entryGroups = new Map<string, {
          storeId: number
          providerId: number
          tipoMoneda: string
          details: { productId: number; quantity: number; price: number; priceInSoles: number; series?: string[] }[]
        }>()

        for (const cp of createdWithStock) {
          const a = cp.assignment
          const currency = a.currency || 'PEN'
          const key = `${a.storeId}-${a.providerId}-${currency}`

          if (!entryGroups.has(key)) {
            entryGroups.set(key, {
              storeId: Number(a.storeId),
              providerId: Number(a.providerId),
              tipoMoneda: currency,
              details: [],
            })
          }

          const purchasePrice = Number(a.price ?? 0)
          const itemSerials = batchSerials[cp.cartId]

          entryGroups.get(key)!.details.push({
            productId: cp.productId,
            quantity: a.quantity,
            price: purchasePrice,
            priceInSoles: purchasePrice,
            series: itemSerials?.length ? itemSerials : undefined,
          })
        }

        // Phase 3: Create one entry per provider group
        for (const [, group] of entryGroups) {
          await createEntry({
            storeId: group.storeId,
            userId,
            providerId: group.providerId,
            date: new Date(),
            description: group.details.length > 1
              ? `Stock inicial (${group.details.length} productos)`
              : 'Stock inicial',
            tipoMoneda: group.tipoMoneda,
            details: group.details,
            referenceId: `batch-stock:${Date.now()}:s${group.storeId}:p${group.providerId}`,
          })
        }
      }

      toast.success("Productos y stock inicial registrados.")
      resetBatchState()
      if (!onSuccess) {
        router.push("/dashboard/products")
        router.refresh()
      }
    } catch (error: any) {
      // Remove successfully created items from cart so user doesn't re-create them
      if (successIds.length > 0) {
        setBatchCart((prev) => prev.filter((item) => !successIds.includes(item.id)))
        setBatchAssignments((prev) => {
          const next = { ...prev }
          for (const id of successIds) delete next[id]
          return next
        })
      }
      const message =
        error?.response?.data?.message || error?.message || "Error al crear productos con stock."
      setBatchStockError(message)
      toast.error(
        successIds.length > 0
          ? `${successIds.length} producto(s) creados. Error al continuar: ${message}`
          : message,
      )
    } finally {
      setIsProcessing(false)
    }
  }, [batchAssignments, batchCart, batchMissingAssignmentsCount, batchSerials, onSuccess, router, userId])


  const handleAddAnother = useCallback(async () => {
    if (currentProductId) return

    // Sync DOM → form state for numeric fields before reading values.
    // Prevents desync where user sees one value but form state has another.
    syncNumericFieldsFromDOM()

    const valid = await form.trigger()
    if (!valid) {
      toast.error("Revisa los campos obligatorios antes de continuar.")
      return
    }

    const data = form.getValues()
    const stockValue = safeNumber(data.initialStock)
    const buildResult = buildPayload(data)
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
        if (editingBatchId && item.id === editingBatchId) return false
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
                initialStock: stockValue,
              }
            : entry,
        ),
      )
      setEditingBatchId(null)
      toast.success("Producto actualizado en el lote.")
    } else {
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
          initialStock: stockValue,
        },
      ])
      toast.success("Producto agregado al lote.")
    }
    setVariantRows([])
    setIngredientRows([])
    setExtraAttributes({})

    form.reset({
      ...emptyProductValues,
      status: form.getValues("status") ?? "Activo",
      categoryId: form.getValues("categoryId") ?? "",
    })
    // Force-clear numeric inputs in DOM after reset
    flushNumericFieldsToDOM()
  }, [
    batchCart,
    buildPayload,
    currentProductId,
    editingBatchId,
    existingProductNames,
    form,
    syncNumericFieldsFromDOM,
    flushNumericFieldsToDOM,
    emptyProductValues,
  ])

  const startBatchEditFromCart = useCallback(
    (item: BatchCartItem) => {
      const payload = item.payload ?? {}
      const nextExtraAttributes = (payload.extraAttributes ??
        {}) as Record<string, unknown>
      // Skip name validation when loading batch item — name was already validated on add
      skipNameValidationRef.current = true
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
        initialStock: item.initialStock ?? 0,
      })
      // Sync numeric fields to DOM after reset (loads cart item values into inputs)
      flushNumericFieldsToDOM()
      requestAnimationFrame(() => {
        nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        nameInputRef.current?.focus()
      })
      toast.message("Producto listo para actualizar.")
    },
    [form, flushNumericFieldsToDOM],
  )

  const handleCreateBatch = useCallback(async () => {
    if (!batchCart.length) return
    setIsProcessing(true)
    try {
      for (const item of batchCart) {
        await createProduct(item.payload)
      }
      toast.success("Productos creados correctamente.")
      resetBatchState()
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
  }, [batchCart, onSuccess, resetBatchState, router])

  const handleSubmitWithBatchGuard = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      // Sync DOM → form state for numeric fields before any submission
      syncNumericFieldsFromDOM()

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
    [batchCart.length, currentProductId, form, handleCreateBatch, onSubmit, syncNumericFieldsFromDOM],
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
    try {
      if (!raw) {
        return
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const safeNum = (v: unknown): number => {
          if (typeof v === 'number' && Number.isFinite(v)) return v
          const p = Number(v)
          return Number.isFinite(p) ? p : 0
        }
        const deduped = parsed.filter((item, index, self) => {
          const normalized = String(item?.name ?? '').trim().toLowerCase()
          if (!normalized) return false
          return (
            self.findIndex((entry) => String(entry?.name ?? '').trim().toLowerCase() === normalized) ===
            index
          )
        }).map((item) => ({
          ...item,
          initialStock: safeNum(item.initialStock),
          payload: item.payload ? {
            ...item.payload,
            price: safeNum(item.payload.price),
            priceSell: safeNum(item.payload.priceSell),
          } : item.payload,
        }))
        setBatchCart(deduped)
      }
    } catch (error) {
      console.warn("No se pudo leer el carrito de productos.", error)
    } finally {
      // Evita sobrescribir el storage con un estado vacio en el primer render.
      queueMicrotask(() => {
        batchCartHydratedRef.current = true
      })
    }
  }, [])

  useEffect(() => {
    if (!batchCartHydratedRef.current) return
    try {
      localStorage.setItem(BATCH_CART_STORAGE_KEY, JSON.stringify(batchCart))
    } catch (error) {
      console.warn("No se pudo guardar el carrito de productos.", error)
    }
  }, [batchCart])

  useEffect(() => {
    const raw = localStorage.getItem(BATCH_ASSIGNMENTS_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") {
        setBatchAssignments(parsed as typeof batchAssignments)
      }
    } catch (error) {
      console.warn("No se pudieron leer las asignaciones del lote.", error)
    }
  }, [])

  useEffect(() => {
    if (!batchCart.length) {
      localStorage.removeItem(BATCH_ASSIGNMENTS_STORAGE_KEY)
      return
    }
    localStorage.setItem(BATCH_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(batchAssignments))
  }, [batchAssignments, batchCart.length])

  // Hydrate batch serials from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(BATCH_SERIALS_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") {
        setBatchSerials(parsed as Record<string, string[]>)
      }
    } catch { /* ignore */ }
  }, [])

  // Persist batch serials
  useEffect(() => {
    if (!batchCart.length) {
      localStorage.removeItem(BATCH_SERIALS_STORAGE_KEY)
      return
    }
    localStorage.setItem(BATCH_SERIALS_STORAGE_KEY, JSON.stringify(batchSerials))
  }, [batchSerials, batchCart.length])

  useEffect(() => {
    const raw = localStorage.getItem(BATCH_UI_STATE_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.panel && typeof parsed.panel.x === "number" && typeof parsed.panel.y === "number") {
        setFloatingPanelPosition({ x: parsed.panel.x, y: parsed.panel.y })
      }
      if (parsed?.batchStockDialogOpen === true) {
        setIsBatchStockDialogOpen(true)
      }
    } catch (error) {
      console.warn("No se pudo leer el estado de UI del lote.", error)
    }
  }, [])

  useEffect(() => {
    if (!batchCart.length) {
      localStorage.removeItem(BATCH_UI_STATE_STORAGE_KEY)
      return
    }
    const payload = {
      panel: floatingPanelPosition ?? { x: 0, y: 0 },
      batchStockDialogOpen: isBatchStockDialogOpen,
    }
    localStorage.setItem(BATCH_UI_STATE_STORAGE_KEY, JSON.stringify(payload))
  }, [batchCart.length, floatingPanelPosition, isBatchStockDialogOpen])

  useEffect(() => {
    if (!batchCart.length || currentProductId) return
    if (floatingPanelPinnedRef.current) return
    if (floatingPanelPosition) return
    setFloatingPanelPosition(getDefaultPanelPosition())
    floatingPanelPinnedRef.current = true
  }, [batchCart.length, currentProductId, floatingPanelPosition, getDefaultPanelPosition])

  useEffect(() => {
    if (!isBatchStockDialogOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isBatchStockDialogOpen) {
          setIsBatchStockDialogOpen(false)
        }
        setActiveBatchId(null)
        setHoveredBatchId(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isBatchStockDialogOpen])

  useEffect(() => {
    if (!isBatchDragActive) {
      setBatchDragCursor(null)
      return
    }
    const handleMove = (event: MouseEvent) => {
      setBatchDragCursor({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener("mousemove", handleMove)
    return () => {
      window.removeEventListener("mousemove", handleMove)
    }
  }, [isBatchDragActive])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isFloatingPanelDragging) return
      floatingDragPointRef.current = {
        x: event.clientX,
        y: event.clientY,
      }
      if (floatingDragFrameRef.current != null) {
        return
      }
      floatingDragFrameRef.current = window.requestAnimationFrame(() => {
        const point = floatingDragPointRef.current
        if (!point) {
          floatingDragFrameRef.current = null
          return
        }
        const panel = floatingPanelRef.current
        const panelWidth = panel?.offsetWidth ?? 280
        const panelHeight = panel?.offsetHeight ?? 200
        const maxX = Math.max(0, window.innerWidth - panelWidth)
        const maxY = Math.max(0, window.innerHeight - panelHeight)
        const nextX = point.x - floatingDragOffsetRef.current.x
        const nextY = point.y - floatingDragOffsetRef.current.y
        setFloatingPanelPosition({
          x: Math.min(Math.max(0, nextX), maxX),
          y: Math.min(Math.max(0, nextY), maxY),
        })
        floatingDragFrameRef.current = null
      })
    }

    const handlePointerUp = () => {
      if (!isFloatingPanelDragging) return
      setIsFloatingPanelDragging(false)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      if (floatingDragFrameRef.current != null) {
        window.cancelAnimationFrame(floatingDragFrameRef.current)
        floatingDragFrameRef.current = null
      }
    }
  }, [isFloatingPanelDragging])

  useEffect(() => {
    if (!isBatchStockDialogOpen) return
    setBatchAssignments((prev) => {
      const next = { ...prev }
      batchCart.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = {
            storeId: '',
            providerId: '',
            quantity: 0,
            price: Number(item.payload?.price ?? 0),
            currency: 'PEN',
          }
        }
      })
      return next
    })
  }, [batchCart, isBatchStockDialogOpen])

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
  // Optimized: Removed renderOptionalChip and renderRequiredValidationChip functions
  // They are now memoized components defined outside this component

  return (
    <div className="flex flex-col">
      {/* ── Header contextual sticky ── */}
      <div className="sticky top-0 z-20 mb-4 border-b bg-white/85 backdrop-blur-lg dark:bg-background/85">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">
                  {currentProductId ? 'Actualizar Producto' : 'Crear Producto'}
                </h1>
                <ProductGuideButton />
              </div>
              <p className="text-xs text-muted-foreground">
                Completa los campos para {currentProductId ? 'actualizar' : 'registrar'} un producto
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {verticalInfo?.config?.displayName ?? verticalName}
          </Badge>
        </div>
      </div>

      <div className="px-4">
      <form className='relative flex flex-col gap-4' onSubmit={handleSubmitWithBatchGuard}>
        {isProcessing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Registrando producto...</p>
            </div>
          </div>
        )}
        <fieldset disabled={isProcessing} className="contents">

          {/* ── Sección 1: Información básica ── */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Info className="h-4 w-4" /> Información básica
            </h3>
            <div className="grid grid-cols-1 gap-x-0.5 gap-y-4 md:gap-x-1 md:gap-y-5 lg:grid-cols-3 lg:gap-x-4">
              <ProductBasicFields
                form={form}
                register={register}
                control={control}
                setValue={setValue}
                clearErrors={clearErrors}
                isProcessing={isProcessing}
                suppressInlineErrors={suppressInlineErrors}
                nameValidation={nameValidation}
                nameError={nameError}
                nameInputRef={nameInputRef}
                nameRegister={nameRegister}
                categoryOptions={categoryOptions}
                isLoadingCategories={isLoadingCategories}
                isCategoryDialogOpen={isCategoryDialogOpen}
                setIsCategoryDialogOpen={setIsCategoryDialogOpen}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                newCategoryDescription={newCategoryDescription}
                setNewCategoryDescription={setNewCategoryDescription}
                categoryError={categoryError}
                setCategoryError={setCategoryError}
                isCreatingCategory={isCreatingCategory}
                handleCreateCategory={handleCreateCategory}
                hasName={hasName}
                hasCategory={hasCategory}
                OptionalChip={OptionalChip}
                RequiredValidationChip={RequiredValidationChip}
              />
              <ProductBrandDescription
                form={form}
                register={register}
                control={control}
                setValue={setValue}
                clearErrors={clearErrors}
                isProcessing={isProcessing}
                suppressInlineErrors={suppressInlineErrors}
                brands={brands}
                isLoadingBrands={isLoadingBrands}
                hasBrand={hasBrand}
                hasDescription={hasDescription}
                hideBrand={isRestaurant}
                OptionalChip={OptionalChip}
              />
            </div>
          </div>

          {/* ── Sección 2: Precios y stock ── */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <DollarSign className="h-4 w-4" /> {isRestaurant ? 'Precios' : 'Precios y stock'}
            </h3>
            <div className={`grid grid-cols-1 gap-4 ${isRestaurant ? 'lg:grid-cols-2' : 'lg:grid-cols-[1fr_1fr_1fr_1.35fr]'}`}>
              <ProductPricingFields
                form={form}
                register={register}
                control={control}
                setValue={setValue}
                clearErrors={clearErrors}
                isProcessing={isProcessing}
                suppressInlineErrors={suppressInlineErrors}
                hasPrice={hasPrice}
                hasPriceSell={hasPriceSell}
                hasInitialStock={hasInitialStock}
                isEditing={Boolean(currentProductId)}
                hideStock={isRestaurant}
                OptionalChip={OptionalChip}
              />
              {!isRestaurant && (
                <ProductFeaturesSection
                  form={form}
                  register={register}
                  control={control}
                  setValue={setValue}
                  clearErrors={clearErrors}
                  isProcessing={isProcessing}
                  suppressInlineErrors={suppressInlineErrors}
                  featureFields={featureFields}
                  appendFeature={appendFeature}
                  removeFeature={removeFeature}
                  hasFeatures={hasFeatures}
                  OptionalChip={OptionalChip}
                />
              )}
            </div>
          </div>

          {/* ── Sección 3: Configuración del vertical ── */}
          {(schemaFields.length > 0 || showComputerSpecs) && (
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Settings className="h-4 w-4" /> Configuración del vertical
              </h3>
              <ProductSchemaFields
                form={form}
                register={register}
                control={control}
                setValue={setValue}
                clearErrors={clearErrors}
                isProcessing={isProcessing}
                suppressInlineErrors={suppressInlineErrors}
                schemaFields={schemaFields}
                groupedSchemaFields={groupedSchemaFields}
                verticalInfo={verticalInfo}
                verticalName={verticalName}
                isLegacyProduct={isLegacyProduct}
                extraFieldError={extraFieldError}
                renderSchemaField={renderSchemaField}
                productId={product?.id}
                migrationAssistantPath={MIGRATION_ASSISTANT_PATH}
              />
              {showComputerSpecs && (
                <ProductComputerSpecs
                  form={form}
                  register={register}
                  control={control}
                  setValue={setValue}
                  clearErrors={clearErrors}
                  isProcessing={isProcessing}
                  suppressInlineErrors={suppressInlineErrors}
                  hasSpecs={hasSpecs}
                  OptionalChip={OptionalChip}
                />
              )}
            </div>
          )}

          {/* ── Sección 4: Imágenes ── */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ImageIcon className="h-4 w-4" /> Imágenes
            </h3>
            <ProductImagesSection
              form={form}
              register={register}
              control={control}
              setValue={setValue}
              clearErrors={clearErrors}
              isProcessing={isProcessing}
              suppressInlineErrors={suppressInlineErrors}
              imageFields={imageFields}
              appendImage={appendImage}
              removeImage={(index?: number | number[]) => {
                removeImage(index)
                if (typeof index === 'number') {
                  setImageUploadErrors((prev) => {
                    const next = { ...prev }
                    delete next[index]
                    return next
                  })
                }
              }}
              handleImageFile={handleImageFile}
              hasImages={hasImages}
              showComputerSpecs={showComputerSpecs}
              isGeneralVertical={isGeneralVertical}
              OptionalChip={OptionalChip}
              imageUploadErrors={imageUploadErrors}
            />
          </div>
          {/* ── Sticky footer: botones de acción ── */}
          <div className="sticky bottom-0 z-10 mt-2 rounded-t-lg border-t bg-white/90 py-3 backdrop-blur dark:bg-background/90">
            <div className="flex flex-col gap-2 lg:flex-row lg:justify-end">
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
                  setNameValidation({ status: 'idle', message: undefined })
                  setPendingCategoryId(null)
                  setStockStoreId('')
                  setStockProviderId('')
                  setStockDialogError(null)
                  setPendingStockPayload(null)
                  setPendingStockQuantity(0)
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
                  // Force-clear numeric inputs in DOM after reset
                  flushNumericFieldsToDOM()
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
          </div>
        </fieldset>
      </form>
      <ProductBatchPanel
        batchCart={batchCart}
        setBatchCart={setBatchCart}
        onRemoveItem={handleRemoveBatchItem}
        onClearAll={handleClearBatchCart}
        editingBatchId={editingBatchId}
        startBatchEditFromCart={startBatchEditFromCart}
        onOpenAssignDialog={() => setIsBatchOnlyConfirmOpen(true)}
        isProcessing={isProcessing}
        categories={categories}
        formatMoney={formatMoney}
        currentProductId={currentProductId}
        batchSerials={batchSerials}
        onOpenSerials={(itemId) => setSerialsDialogItemId(itemId)}
      />
      {/* Serial numbers dialog for batch items */}
      {(() => {
        const serialsItem = batchCart.find((i) => i.id === serialsDialogItemId)
        if (!serialsItem) return null
        const allOtherSerials = Object.entries(batchSerials)
          .filter(([id]) => id !== serialsDialogItemId)
          .flatMap(([, serials]) => serials)
        const qty = batchAssignments[serialsItem.id]?.quantity || serialsItem.initialStock || 0
        return (
          <ProductSerialsDialog
            open={serialsDialogItemId !== null}
            onOpenChange={(open) => { if (!open) setSerialsDialogItemId(null) }}
            productName={serialsItem.name}
            quantity={qty}
            existingSerials={batchSerials[serialsItem.id] ?? []}
            allOtherSerials={allOtherSerials}
            onSave={(serials) => {
              setBatchSerials((prev) => ({ ...prev, [serialsItem.id]: serials }))
              toast.success(`${serials.length} serie(s) guardada(s) correctamente.`)
            }}
          />
        )
      })()}
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
      <BatchOnlyAssignDialog
        open={isBatchOnlyConfirmOpen}
        onOpenChange={setIsBatchOnlyConfirmOpen}
        batchCart={batchCart}
        stores={stores}
        providers={providers}
        batchAssignments={batchAssignments}
        updateBatchAssignment={updateBatchAssignment}
        isProcessing={isProcessing}
        onCreateWithStock={async () => {
          setIsBatchOnlyConfirmOpen(false)
          await handleCreateBatchWithAssignments()
        }}
        onCreateWithoutStock={async () => {
          setIsBatchOnlyConfirmOpen(false)
          await handleCreateBatch()
        }}
      />
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
    </div>
  )
}

export default ProductForm
























