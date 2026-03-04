"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Package,
  Tag,
  Pencil,
  PenLine,
  Camera,
  ImagePlus,
  Megaphone,
  Send,
  Trash2,
  X as XIcon,
  Calendar,
  Sparkles,
  Cpu,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react"
import { resolveImageVariant } from "@/lib/images"
import { isProductActive, normalizeProductStatus } from "./status.utils"
import type { Products } from "./columns"

const SPEC_LABELS: Record<string, string> = {
  processor: "Procesador",
  ram: "RAM",
  storage: "Almacenamiento",
  graphics: "Gráficos",
  screen: "Pantalla",
  resolution: "Resolución",
  refreshRate: "Tasa de refresco",
  connectivity: "Conectividad",
  battery: "Batería",
  os: "Sistema Operativo",
  weight: "Peso",
  dimensions: "Dimensiones",
}

interface Props {
  product: Products | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestImageUpload?: (productId: string, file: File) => void
  onRequestDelete?: (product: Products) => void
}

export function ProductDetailDialog({ product, open, onOpenChange, onRequestImageUpload, onRequestDelete }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  // Reset preview when dialog closes or product changes
  useEffect(() => {
    setLocalPreviewUrl(null)
  }, [product?.id, open])

  // Cleanup object URL on unmount or change
  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  if (!product) return null

  const active = isProductActive(product.status)
  const brandName =
    typeof product.brand === "string"
      ? product.brand
      : product.brand?.name || null

  const images = Array.isArray((product as any).images)
    ? ((product as any).images as string[]).filter(Boolean)
    : []
  const serverImageUrl = images[0] ? resolveImageVariant(images[0], "card") : null
  const imageUrl = localPreviewUrl || serverImageUrl

  const features = (product.features ?? []).filter(
    (f): f is NonNullable<typeof f> => !!f && !!(f.title || f.description),
  )

  const spec = (product as any).specification as Record<string, string | null> | undefined
  const specEntries = Object.entries(spec ?? {}).filter(
    ([key, v]) =>
      v != null &&
      v !== "" &&
      !["id", "productId", "createdAt", "updatedAt"].includes(key),
  )

  const extraEntries = Object.entries(product.extraAttributes ?? {}).filter(
    ([, v]) => v != null && v !== "",
  )

  const createdDate = product.createdAt
    ? new Date(product.createdAt).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null

  const hasPrice = Number.isFinite(product.price) && product.price > 0
  const hasPriceSell = Number.isFinite(product.priceSell) && product.priceSell > 0
  const margin =
    hasPrice && hasPriceSell
      ? ((product.priceSell - product.price) / product.price) * 100
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!grid-rows-[auto_1fr] max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90dvh] !flex !flex-col !p-0 !gap-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-5 w-5 flex-shrink-0" />
            Detalle del Producto
          </DialogTitle>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="space-y-0">
            {/* ── Image Section ── */}
            <div className="relative w-full aspect-[16/7] sm:aspect-[16/6] bg-muted/30 overflow-hidden">
              {imageUrl ? (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover animate-in fade-in duration-300"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/15" />
                </div>
              )}
              {/* Status badge over image */}
              <Badge
                className={`absolute right-3 top-3 text-xs backdrop-blur-sm ${
                  active
                    ? "border-emerald-500/30 bg-emerald-500/80 text-white"
                    : "border-rose-500/30 bg-rose-500/80 text-white"
                }`}
              >
                {normalizeProductStatus(product.status)}
              </Badge>
            </div>

            <div className="px-4 sm:px-6 py-4 space-y-4">
              {/* ── Name + Category/Brand ── */}
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold leading-tight break-words">
                  {product.name}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Tag className="h-3 w-3" />
                    {product.category_name || "Sin categoría"}
                  </Badge>
                  {brandName && (
                    <Badge variant="outline" className="text-xs">
                      {brandName}
                    </Badge>
                  )}
                </div>
              </div>

              {/* ── Description ── */}
              {product.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground/50">
                  Sin descripción
                </p>
              )}

              <Separator />

              {/* ── Prices ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full min-w-0">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    P. Compra
                  </p>
                  <p className="text-base sm:text-lg font-bold">
                    {hasPrice ? `S/. ${product.price.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    P. Venta
                  </p>
                  <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {hasPriceSell ? `S/. ${product.priceSell.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Margen
                  </p>
                  {margin !== null ? (
                    <div className="flex items-center gap-1.5">
                      {margin > 0 ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : margin < 0 ? (
                        <TrendingDown className="h-4 w-4 text-rose-500 flex-shrink-0" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <p
                        className={`text-base sm:text-lg font-bold ${
                          margin > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : margin < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : ""
                        }`}
                      >
                        {margin > 0 ? "+" : ""}
                        {margin.toFixed(1)}%
                      </p>
                    </div>
                  ) : (
                    <p className="text-base sm:text-lg font-bold text-muted-foreground">—</p>
                  )}
                </div>
              </div>

              {/* ── Features ── */}
              {features.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Características
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {features.map((f, i) => (
                        <div
                          key={i}
                          className="rounded-md border bg-muted/20 px-3 py-2"
                        >
                          {f.title && (
                            <p className="text-sm font-medium">{f.title}</p>
                          )}
                          {f.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {f.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Specifications ── */}
              {specEntries.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Especificaciones
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      {specEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-baseline justify-between gap-2 py-1 border-b border-dashed last:border-b-0"
                        >
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {SPEC_LABELS[key] ?? key}
                          </span>
                          <span className="text-sm font-medium text-right break-words min-w-0">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Extra Attributes ── */}
              {extraEntries.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Atributos adicionales
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {extraEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1"
                        >
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="text-xs font-medium">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Date ── */}
              {createdDate && (
                <>
                  <Separator />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    Creado el {createdDate}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <Separator className="flex-shrink-0" />

        {/* ── Footer actions ── */}
        <div className="flex items-stretch gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 sm:py-0 sm:h-9 cursor-pointer text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <XIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            <span className="text-[9px] sm:text-sm leading-none">Cerrar</span>
          </button>

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/dashboard/products/${product.id}/edit`}
                  className="group/edit flex-1 flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5 rounded-md bg-primary px-2 py-1.5 sm:py-0 sm:h-9 cursor-pointer text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <span className="relative inline-flex flex-shrink-0">
                    <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5 transition-all duration-200 ease-out group-hover/edit:scale-0 group-hover/edit:opacity-0 group-hover/edit:rotate-12" />
                    <PenLine className="absolute inset-0 h-4 w-4 sm:h-3.5 sm:w-3.5 scale-0 opacity-0 -rotate-12 transition-all duration-200 ease-out group-hover/edit:scale-100 group-hover/edit:opacity-100 group-hover/edit:rotate-0" />
                  </span>
                  <span className="text-[9px] sm:text-sm leading-none">Editar</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Editar producto</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group/cam flex-1 flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5 rounded-md bg-secondary px-2 py-1.5 sm:py-0 sm:h-9 cursor-pointer text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="relative inline-flex flex-shrink-0">
                    <Camera className="h-4 w-4 sm:h-3.5 sm:w-3.5 transition-all duration-200 ease-out group-hover/cam:scale-0 group-hover/cam:opacity-0 group-hover/cam:rotate-12" />
                    <ImagePlus className="absolute inset-0 h-4 w-4 sm:h-3.5 sm:w-3.5 scale-0 opacity-0 -rotate-12 transition-all duration-200 ease-out group-hover/cam:scale-100 group-hover/cam:opacity-100 group-hover/cam:rotate-0" />
                  </span>
                  <span className="text-[9px] sm:text-sm leading-none">Imagen</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Cambiar imagen</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group/promo flex-1 flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5 rounded-md bg-violet-500 px-2 py-1.5 sm:py-0 sm:h-9 cursor-pointer text-sm font-medium text-white hover:bg-violet-600 transition-colors"
                  onClick={() => router.push(`/dashboard/products/${product.id}/promote`)}
                >
                  <span className="relative inline-flex flex-shrink-0">
                    <Megaphone className="h-4 w-4 sm:h-3.5 sm:w-3.5 transition-all duration-200 ease-out group-hover/promo:scale-0 group-hover/promo:opacity-0 group-hover/promo:rotate-12" />
                    <Send className="absolute inset-0 h-4 w-4 sm:h-3.5 sm:w-3.5 scale-0 opacity-0 -rotate-12 transition-all duration-200 ease-out group-hover/promo:scale-100 group-hover/promo:opacity-100 group-hover/promo:rotate-0" />
                  </span>
                  <span className="text-[9px] sm:text-sm leading-none">Promo</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Promocionar producto</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group/del flex-1 flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5 rounded-md bg-destructive px-2 py-1.5 sm:py-0 sm:h-9 cursor-pointer text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  onClick={() => {
                    onOpenChange(false)
                    onRequestDelete?.(product)
                  }}
                >
                  <span className="relative inline-flex flex-shrink-0">
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 transition-all duration-200 ease-out group-hover/del:scale-0 group-hover/del:opacity-0 group-hover/del:rotate-12" />
                    <XIcon className="absolute inset-0 h-4 w-4 sm:h-3.5 sm:w-3.5 scale-0 opacity-0 -rotate-12 transition-all duration-200 ease-out group-hover/del:scale-100 group-hover/del:opacity-100 group-hover/del:rotate-0" />
                  </span>
                  <span className="text-[9px] sm:text-sm leading-none">Eliminar</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Eliminar producto</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Hidden file input for image upload */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && product) {
                // Instant local preview
                const previewUrl = URL.createObjectURL(file)
                setLocalPreviewUrl(previewUrl)
                onRequestImageUpload?.(product.id, file)
              }
              e.target.value = ""
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
