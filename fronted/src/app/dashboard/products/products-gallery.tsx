"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import {
  Pencil,
  Eye,
  Trash2,
  Loader2,
  Package,
  Camera,
  Tag,
  Calendar,
  Sparkles,
  Cpu,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DeleteActionsGuard } from "@/components/delete-actions-guard"
import { resolveImageUrl } from "@/lib/images"
import { isProductActive, normalizeProductStatus } from "./status.utils"
import { deleteProduct, uploadProductImage, updateProduct } from "./products.api"
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
}

type ProductsGalleryProps = {
  data: Products[]
  onProductUpdated?: () => void
}

export function ProductsGallery({ data, onProductUpdated }: ProductsGalleryProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Products | null>(null)
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleDelete = async () => {
    if (!deleteTarget) return
    setLoadingId(deleteTarget.id)
    try {
      await deleteProduct(deleteTarget.id)
      toast.success("Producto eliminado.")
      router.refresh()
      onProductUpdated?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el producto."
      toast.error(message)
    } finally {
      setLoadingId(null)
      setDeleteTarget(null)
    }
  }

  const handleImageChange = async (productId: string, file: File) => {
    // Backend only accepts jpg, jpeg, png, gif
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG o GIF.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe exceder los 5 MB.")
      return
    }

    setUploadingImageId(productId)
    try {
      const { url } = await uploadProductImage(file)
      // Normalize to relative path (/uploads/products/...)
      let normalizedPath = url
      try {
        const parsed = new URL(url)
        if (parsed.pathname.startsWith("/uploads")) {
          normalizedPath = parsed.pathname
        }
      } catch {
        const uploadsIndex = url.indexOf("/uploads")
        if (uploadsIndex >= 0) {
          normalizedPath = url.slice(uploadsIndex)
        }
      }

      await updateProduct(productId, { images: [normalizedPath] })
      toast.success("Imagen actualizada.")
      onProductUpdated?.()
    } catch (error: any) {
      const message = error?.message || "No se pudo actualizar la imagen."
      toast.error(message)
    } finally {
      setUploadingImageId(null)
      const input = fileInputRefs.current[productId]
      if (input) input.value = ""
    }
  }

  return (
    <>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay productos para mostrar.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((product) => {
            const images = Array.isArray((product as any).images)
              ? ((product as any).images as string[]).filter(Boolean)
              : []
            const imageUrl = images[0] ? resolveImageUrl(images[0]) : null
            const active = isProductActive(product.status)
            const brandName =
              typeof product.brand === "string"
                ? product.brand
                : product.brand?.name || null
            const isUploading = uploadingImageId === product.id
            const features = (product.features ?? []).filter(
              (f): f is NonNullable<typeof f> => !!f && !!(f.title || f.description),
            )
            const extraEntries = Object.entries(product.extraAttributes ?? {}).filter(
              ([, v]) => v != null && v !== "",
            )
            const createdDate = product.createdAt
              ? new Date(product.createdAt).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : null
            const spec = (product as any).specification as Record<string, string | null> | undefined
            const specEntries = Object.entries(spec ?? {}).filter(
              ([key, v]) => v != null && v !== "" && !["id", "productId", "createdAt", "updatedAt"].includes(key),
            )

            return (
              <div
                key={product.id}
                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-lg hover:shadow-black/8 dark:hover:shadow-black/25"
                onClick={() => router.push(`/dashboard/products/${product.id}`)}
              >
                {/* Hidden file input */}
                <input
                  ref={(el) => { fileInputRefs.current[product.id] = el }}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageChange(product.id, file)
                  }}
                />

                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/30">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}

                  {/* Upload spinner overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}

                  {/* Badges over image (visible when NOT hovering) */}
                  <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5 transition-opacity duration-200 group-hover:opacity-0">
                    <Badge
                      variant="secondary"
                      className="bg-background/80 text-[11px] font-medium backdrop-blur-sm"
                    >
                      {product.category_name || "Sin categoría"}
                    </Badge>
                    {brandName && (
                      <Badge
                        variant="outline"
                        className="border-background/60 bg-background/70 text-[11px] backdrop-blur-sm"
                      >
                        {brandName}
                      </Badge>
                    )}
                  </div>

                  <Badge
                    className={`absolute right-2.5 top-2.5 text-[11px] backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-0 ${
                      active
                        ? "border-emerald-500/30 bg-emerald-500/80 text-white"
                        : "border-rose-500/30 bg-rose-500/80 text-white"
                    }`}
                  >
                    {normalizeProductStatus(product.status)}
                  </Badge>
                </div>

                {/* Card body (visible when NOT hovering) */}
                <div className="flex flex-1 flex-col gap-1 p-3 transition-opacity duration-200 group-hover:opacity-0">
                  <h3 className="truncate text-sm font-semibold leading-tight">
                    {product.name}
                  </h3>
                  {!product.description && (
                    <p className="text-xs text-muted-foreground">Sin descripción</p>
                  )}
                  <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Compra</span>
                      <span className="text-sm font-medium">
                        {Number.isFinite(product.price) && product.price > 0
                          ? `S/. ${product.price.toFixed(2)}`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-muted-foreground">Venta</span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number.isFinite(product.priceSell) && product.priceSell > 0
                          ? `S/. ${product.priceSell.toFixed(2)}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Slide-up detail overlay ── */}
                <div className="pointer-events-none absolute inset-0 z-20 flex translate-y-full flex-col opacity-0 transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="flex h-full flex-col rounded-xl bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/98 backdrop-blur-md">
                    {/* Scrollable content */}
                    <div className="gallery-detail-scroll flex-1 space-y-2.5 overflow-y-auto p-4">
                      {/* Header: Name + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-tight text-white">
                          {product.name}
                        </h3>
                        <Badge
                          className={`shrink-0 text-[10px] ${
                            active
                              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                              : "border-rose-500/30 bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {normalizeProductStatus(product.status)}
                        </Badge>
                      </div>

                      {/* Category & Brand pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                          <Tag className="h-2.5 w-2.5" />
                          {product.category_name || "Sin categoría"}
                        </span>
                        {brandName && (
                          <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                            {brandName}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {product.description ? (
                        <p className="text-xs leading-relaxed text-white/75">
                          {product.description}
                        </p>
                      ) : (
                        <p className="text-[11px] italic text-white/30">Sin descripción</p>
                      )}

                      {/* Features */}
                      {features.length > 0 && (
                        <>
                          <div className="h-px bg-white/10" />
                          <div className="space-y-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/40">
                              <Sparkles className="h-2.5 w-2.5" />
                              Características
                            </span>
                            <div className="space-y-1">
                              {features.slice(0, 4).map((f, i) => (
                                <div
                                  key={i}
                                  className="rounded-md bg-white/5 px-2.5 py-1.5"
                                >
                                  {f.title && (
                                    <span className="text-[11px] font-semibold text-white/90">
                                      {f.title}
                                    </span>
                                  )}
                                  {f.description && (
                                    <p className="text-[10px] leading-snug text-white/50">
                                      {f.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                              {features.length > 4 && (
                                <span className="text-[10px] text-white/30">
                                  +{features.length - 4} más
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Specifications */}
                      {specEntries.length > 0 && (
                        <>
                          <div className="h-px bg-white/10" />
                          <div className="space-y-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/40">
                              <Cpu className="h-2.5 w-2.5" />
                              Especificaciones
                            </span>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {specEntries.map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="truncate text-[10px] text-white/40">
                                    {SPEC_LABELS[key] ?? key}
                                  </span>
                                  <span className="truncate text-[11px] font-semibold text-white/90">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Extra Attributes */}
                      {extraEntries.length > 0 && (
                        <>
                          <div className="h-px bg-white/10" />
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                              Atributos
                            </span>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {extraEntries.slice(0, 6).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="truncate text-[10px] capitalize text-white/40">
                                    {key.replace(/_/g, " ")}
                                  </span>
                                  <span className="truncate text-[11px] font-medium text-white/80">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {extraEntries.length > 6 && (
                              <span className="text-[10px] text-white/30">
                                +{extraEntries.length - 6} más
                              </span>
                            )}
                          </div>
                        </>
                      )}

                      {/* Prices */}
                      <div className="h-px bg-white/10" />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40">Compra</span>
                          <span className="text-sm font-medium text-white">
                            {Number.isFinite(product.price) && product.price > 0
                              ? `S/. ${product.price.toFixed(2)}`
                              : "—"}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-white/40">Venta</span>
                          <span className="text-sm font-semibold text-emerald-400">
                            {Number.isFinite(product.priceSell) && product.priceSell > 0
                              ? `S/. ${product.priceSell.toFixed(2)}`
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Date */}
                      {createdDate && (
                        <div className="flex items-center gap-1 text-[10px] text-white/30">
                          <Calendar className="h-2.5 w-2.5" />
                          Creado: {createdDate}
                        </div>
                      )}
                    </div>

                    {/* Action buttons – pinned at bottom */}
                    <div
                      className="flex items-center gap-1.5 border-t border-white/10 px-4 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 bg-white/90 text-[11px] font-medium text-slate-900 hover:bg-white"
                      >
                        <Link href={`/dashboard/products/${product.id}`}>
                          <Eye className="h-3 w-3" />
                          Ver
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 bg-white/90 text-[11px] font-medium text-slate-900 hover:bg-white"
                      >
                        <Link href={`/dashboard/products/${product.id}/edit`}>
                          <Pencil className="h-3 w-3" />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 bg-white/90 p-0 text-slate-900 hover:bg-white"
                        disabled={isUploading}
                        onClick={() => fileInputRefs.current[product.id]?.click()}
                      >
                        <Camera className="h-3 w-3" />
                      </Button>
                      <div className="flex-1" />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 bg-rose-500/80 p-0 text-white hover:bg-rose-600"
                        onClick={() => setDeleteTarget(product)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <span className="font-semibold">{deleteTarget?.name}</span> y
              sus variantes. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <DeleteActionsGuard>
              <AlertDialogAction
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={handleDelete}
              >
                {loadingId === deleteTarget?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Eliminar"
                )}
              </AlertDialogAction>
            </DeleteActionsGuard>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
