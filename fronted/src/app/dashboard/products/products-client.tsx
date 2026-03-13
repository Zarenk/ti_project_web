"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  LayoutGrid, List, Search, Plus, FileSpreadsheet, MoreVertical, ArrowRightLeft, Upload,
  Megaphone, Loader2, Pencil, PenLine, Eye, Camera, ImagePlus, Trash2, X, Send, Package,
} from "lucide-react"
import { ManualPagination } from "@/components/data-table-pagination"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ProductsTable } from "./products-table"
import { ProductsGallery } from "./products-gallery"
import { ProductDetailDialog } from "./product-detail-dialog"
import { resolveImageUrl, resolveImageVariant } from "@/lib/images"
import type { Products } from "./columns"
import { Badge } from "@/components/ui/badge"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { PRODUCTS_LIST_GUIDE_STEPS } from "./products-guide-steps"
import { Skeleton } from "@/components/ui/skeleton"
import { isProductActive } from "./status.utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProductsData, type MigrationFilter, type CategoryFilter } from "./use-products-data"
import { uploadProductImage, updateProduct, deleteProduct } from "./products.api"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { useTenantSelection } from "@/context/tenant-selection-context"
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

type ViewMode = "table" | "gallery"
const VIEW_MODE_KEY = "products-view-mode"
const ITEMS_PER_PAGE_KEY = "products-items-per-page"

export function ProductsClient() {
  const {
    rawProducts,
    loading,
    error,
    isRestaurant,
    migrationStatus,
    setMigrationStatus,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    categories,
    filteredProducts,
    averagePrice,
    reloadProducts,
  } = useProductsData()

  // Pagination state for gallery view
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window === "undefined") return 24
    return Number(localStorage.getItem(ITEMS_PER_PAGE_KEY)) || 24
  })

  const [detailProduct, setDetailProduct] = useState<Products | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Products | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { selection } = useTenantSelection()

  const handleDialogImageUpload = useCallback(async (productId: string, file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG, GIF o WebP.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe exceder los 5 MB.")
      return
    }
    try {
      const { url } = await uploadProductImage(file)
      let normalizedPath = url
      try {
        const parsed = new URL(url)
        if (parsed.pathname.startsWith("/uploads")) normalizedPath = parsed.pathname
      } catch {
        const idx = url.indexOf("/uploads")
        if (idx >= 0) normalizedPath = url.slice(idx)
      }
      await updateProduct(productId, { images: [normalizedPath] })
      toast.success("Imagen actualizada.")
      reloadProducts()
      queryClient.invalidateQueries({ queryKey: queryKeys.products.root(selection.orgId, selection.companyId) })
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar la imagen.")
    }
  }, [reloadProducts, queryClient, selection.orgId, selection.companyId])

  const handleDialogDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await deleteProduct(deleteTarget.id)
      toast.success("Producto eliminado.")
      reloadProducts()
      queryClient.invalidateQueries({ queryKey: queryKeys.products.root(selection.orgId, selection.companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.root(selection.orgId, selection.companyId) })
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el producto.")
    } finally {
      setDeletingId(null)
      setDeleteTarget(null)
    }
  }, [deleteTarget, reloadProducts, queryClient, selection.orgId, selection.companyId])

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "table"
    return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || "table"
  })
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
    setCurrentPage(1)
  }

  const handleItemsPerPageChange = (value: string) => {
    const newValue = Number(value)
    setItemsPerPage(newValue)
    localStorage.setItem(ITEMS_PER_PAGE_KEY, String(newValue))
    setCurrentPage(1)
  }

  // Pagination for gallery view
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage, itemsPerPage])

  // Reset to page 1 only when actual filters change (not on data refetch)
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, migrationStatus])

  // Clamp page if current page exceeds total after data changes (e.g. product deleted)
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  return (
    <>
    <section className="py-2 sm:py-6">
      <div className="container mx-auto space-y-4 px-1 sm:px-6 lg:px-8">
        {isRestaurant ? (
          <div className="space-y-5 px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">Carta digital</p>
                <h1 className="text-2xl font-semibold sm:text-3xl">Platos disponibles</h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona tus platos y precios desde una vista rápida.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      className="w-full gap-2 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500 hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-[0.98] dark:border-emerald-400/30 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto"
                    >
                      <Link href="/dashboard/entries/excel-upload">
                        <FileSpreadsheet className="h-4 w-4" />
                        Importar Excel
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Carga masiva de productos desde Excel</TooltipContent>
                </Tooltip>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/products/new">Nuevo plato</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/5 bg-muted/30 p-4 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">Platos activos</p>
                <p className="mt-2 text-2xl font-semibold">{filteredProducts.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-muted/30 p-4 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">Categorías</p>
                <p className="mt-2 text-2xl font-semibold">{categories.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-muted/30 p-4 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">Precio promedio</p>
                <p className="mt-2 text-2xl font-semibold">S/. {averagePrice.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-muted/30 p-4 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">Disponibles</p>
                <p className="mt-2 text-2xl font-semibold">
                  {filteredProducts.filter((product) => isProductActive(product.status)).length}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-background/40 p-4 shadow-sm lg:flex-row lg:items-center">
              <div className="flex-1">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar plato..."
                  className="h-11 bg-background/70"
                />
              </div>
              <div className="w-full lg:w-[220px]">
                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-white/5 bg-muted/20">
                    <Skeleton className="h-44 w-full rounded-none" />
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-8 w-16 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                No hay platos registrados con esos filtros.
              </div>
            ) : (
              <RestaurantProductGrid
                products={filteredProducts}
                onViewProduct={setDetailProduct}
                onImageUpload={handleDialogImageUpload}
                onDelete={(product) => setDeleteTarget(product)}
                onProductUpdated={reloadProducts}
              />
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 px-5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Productos</h1>
                <PageGuideButton steps={PRODUCTS_LIST_GUIDE_STEPS} tooltipLabel="Guía de productos" />
              </div>

              {/* ── Mobile: compact icon row ─────────────────── */}
              <div className="flex items-center gap-1.5 sm:hidden">
                {/* New product — primary action */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      size="icon"
                      className="h-8 w-8 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500 active:scale-95 dark:border-emerald-400/30"
                    >
                      <Link href="/dashboard/products/new">
                        <Plus className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Nuevo producto</TooltipContent>
                </Tooltip>

                {/* View toggle */}
                <div className="flex rounded-lg border p-0.5">
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleViewChange("table")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "gallery" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleViewChange("gallery")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>

                {/* Actions menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onSelect={() => setMigrationStatus("all")}>
                      <span className={migrationStatus === "all" ? "font-semibold" : ""}>Todos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setMigrationStatus("legacy")}>
                      <span className={migrationStatus === "legacy" ? "font-semibold" : ""}>Legacy</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setMigrationStatus("migrated")}>
                      <span className={migrationStatus === "migrated" ? "font-semibold" : ""}>Migrados</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/products/new" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo producto
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/products/migration" className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Asistente de migracion
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/entries/excel-upload" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Importar Excel
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* ── Desktop: full controls ────────────────────── */}
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex rounded-lg border p-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "table" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewChange("table")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Vista de tabla</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "gallery" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewChange("gallery")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Vista de galería</TooltipContent>
                  </Tooltip>
                </div>

                <Select value={migrationStatus} onValueChange={(value) => setMigrationStatus(value as MigrationFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Migracion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="legacy">Legacy</SelectItem>
                    <SelectItem value="migrated">Migrados</SelectItem>
                  </SelectContent>
                </Select>
                <Button asChild variant="outline">
                  <Link href="/dashboard/products/migration">Asistente de migracion</Link>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      className="gap-2 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500 hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-[0.98] dark:border-emerald-400/30 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    >
                      <Link href="/dashboard/entries/excel-upload">
                        <FileSpreadsheet className="h-4 w-4" />
                        Importar Excel
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Carga masiva de productos desde Excel</TooltipContent>
                </Tooltip>
                <Button
                  asChild
                  className="gap-2 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500 hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-[0.98] dark:border-emerald-400/30 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  <Link href="/dashboard/products/new">
                    <Plus className="h-4 w-4" />
                    Nuevo producto
                  </Link>
                </Button>
              </div>
            </div>
            {loading ? (
              <div className="space-y-4 px-5">
                <div className="rounded-md border">
                  <div className="flex items-center gap-4 border-b px-4 py-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className={`h-4 ${["w-32", "w-40", "w-24", "w-28", "w-20"][i]}`} />
                    ))}
                  </div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="px-5 text-sm text-destructive">{error}</div>
            ) : viewMode === "gallery" ? (
              <div className="space-y-4 px-5">
                {/* Search and controls for gallery view */}
                <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center w-full min-w-0 overflow-hidden">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar producto por nombre o descripción..."
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={categoryFilter}
                    onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] cursor-pointer flex-shrink-0">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="cursor-pointer">Todas las categorías</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="cursor-pointer">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Products count */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <p>
                    Mostrando {paginatedProducts.length} de {filteredProducts.length} productos
                  </p>
                </div>

                {/* Gallery */}
                <ProductsGallery data={paginatedProducts} onProductUpdated={reloadProducts} onViewProduct={setDetailProduct} />

                {/* Pagination controls */}
                {totalPages > 0 && (
                  <ManualPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={itemsPerPage}
                    totalItems={filteredProducts.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => handleItemsPerPageChange(String(size))}
                    pageSizeOptions={[12, 24, 48]}
                  />
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <ProductsTable data={rawProducts} onViewProduct={setDetailProduct} />
              </div>
            )}
          </>
        )}
      </div>
    </section>

    <ProductDetailDialog
      product={detailProduct}
      open={!!detailProduct}
      onOpenChange={(open) => { if (!open) setDetailProduct(null) }}
      onRequestImageUpload={handleDialogImageUpload}
      onRequestDelete={(product) => {
        setDetailProduct(null)
        setDeleteTarget(product)
      }}
    />

    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará <strong>{deleteTarget?.name}</strong> y sus variantes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
          <DeleteActionsGuard>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600 cursor-pointer"
              onClick={handleDialogDelete}
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </DeleteActionsGuard>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

/* ─── Restaurant Product Grid (with gallery effects matching COMPUTERS vertical) ── */

function RestaurantProductGrid({
  products,
  onViewProduct,
  onImageUpload,
  onDelete,
  onProductUpdated,
}: {
  products: Products[]
  onViewProduct: (product: Products) => void
  onImageUpload: (productId: string, file: File) => Promise<void>
  onDelete: (product: Products) => void
  onProductUpdated: () => void
}) {
  const router = useRouter()
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const handleFileChange = async (productId: string, file: File) => {
    setUploadingId(productId)
    try {
      await onImageUpload(productId, file)
    } finally {
      setUploadingId(null)
      const input = fileInputRefs.current[productId]
      if (input) input.value = ""
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const images = Array.isArray((product as any).images)
          ? ((product as any).images as string[]).filter(Boolean)
          : []
        const imageUrl = images[0] ? resolveImageVariant(images[0], "card") : null
        const price = Number(product.priceSell ?? product.price ?? 0)
        const active = isProductActive(product.status)
        const isUploading = uploadingId === product.id

        return (
          <div
            key={product.id}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:shadow-lg hover:shadow-black/8 dark:hover:shadow-black/25"
            onClick={() => onViewProduct(product)}
          >
            {/* Hidden file input */}
            <input
              ref={(el) => { fileInputRefs.current[product.id] = el }}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileChange(product.id, file)
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

              {/* Upload spinner */}
              {isUploading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}

              {/* Badges (hide on hover) */}
              <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5 transition-opacity duration-200 group-hover:opacity-0">
                <Badge variant="secondary" className="bg-background/80 text-[11px] font-medium backdrop-blur-sm">
                  {product.category_name || "Sin categoría"}
                </Badge>
              </div>
              <Badge
                className={`absolute right-2.5 top-2.5 text-[11px] backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-0 ${
                  active
                    ? "border-emerald-500/30 bg-emerald-500/80 text-white"
                    : "border-rose-500/30 bg-rose-500/80 text-white"
                }`}
              >
                {active ? "Disponible" : "Inactivo"}
              </Badge>
            </div>

            {/* Card body (hides on hover) */}
            <div className="flex flex-1 flex-col gap-1 p-3 transition-opacity duration-200 group-hover:opacity-0">
              <h3 className="truncate text-sm font-semibold leading-tight">{product.name}</h3>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {product.description || "Sin descripción"}
              </p>
              <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Compra</span>
                  <span className="text-sm font-medium">
                    {Number.isFinite(product.price) && product.price > 0 ? `S/. ${product.price.toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs text-muted-foreground">Venta</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {Number.isFinite(price) && price > 0 ? `S/. ${price.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Slide-up detail overlay */}
            <div className="pointer-events-none absolute inset-0 z-20 flex translate-y-full flex-col opacity-0 transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
              <div className="flex h-full flex-col rounded-2xl bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/98 backdrop-blur-md">
                {/* Scrollable content */}
                <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-tight text-white">{product.name}</h3>
                    <Badge
                      className={`shrink-0 text-[10px] ${
                        active
                          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                          : "border-rose-500/30 bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {active ? "Disponible" : "Inactivo"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                      {product.category_name || "Sin categoría"}
                    </span>
                  </div>

                  {product.description ? (
                    <p className="text-xs leading-relaxed text-white/75">{product.description}</p>
                  ) : (
                    <p className="text-[11px] italic text-white/30">Sin descripción</p>
                  )}

                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40">Compra</span>
                      <span className="text-sm font-medium text-white">
                        {Number.isFinite(product.price) && product.price > 0 ? `S/. ${product.price.toFixed(2)}` : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-white/40">Venta</span>
                      <span className="text-sm font-semibold text-emerald-400">
                        {Number.isFinite(price) && price > 0 ? `S/. ${price.toFixed(2)}` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons with icon crossfade effects */}
                <TooltipProvider delayDuration={100}>
                  <div
                    className="flex items-center gap-1.5 border-t border-white/10 px-2 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="group/ver h-7 flex-1 cursor-pointer bg-white/90 p-0 text-slate-900 hover:bg-white"
                          onClick={() => onViewProduct(product)}
                        >
                          <span className="relative inline-flex">
                            <Eye className="h-3.5 w-3.5 transition-all duration-200 ease-out group-hover/ver:scale-0 group-hover/ver:opacity-0 group-hover/ver:rotate-12" />
                            <Search className="absolute inset-0 h-3.5 w-3.5 scale-0 opacity-0 -rotate-12 transition-all duration-200 ease-out group-hover/ver:scale-100 group-hover/ver:opacity-100 group-hover/ver:rotate-0" />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">Ver detalle</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          size="sm"
                          variant="secondary"
                          className="group/edit h-7 flex-1 bg-white/90 p-0 text-slate-900 hover:bg-white"
                        >
                          <Link href={`/dashboard/products/${product.id}/edit`}>
                            <span className="relative inline-flex">
                              <Pencil className="h-3.5 w-3.5 transition-all duration-200 ease-out group-hover/edit:scale-0 group-hover/edit:opacity-0 group-hover/edit:rotate-12" />
                              <PenLine className="absolute inset-0 h-3.5 w-3.5 scale-0 opacity-0 -rotate-12 transition-all duration-200 ease-out group-hover/edit:scale-100 group-hover/edit:opacity-100 group-hover/edit:rotate-0" />
                            </span>
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">Editar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="group/cam h-7 flex-1 cursor-pointer bg-white/90 p-0 text-slate-900 hover:bg-white"
                          disabled={isUploading}
                          onClick={() => fileInputRefs.current[product.id]?.click()}
                        >
                          <span className="relative inline-flex">
                            <Camera className="h-3.5 w-3.5 transition-all duration-200 ease-out group-hover/cam:scale-0 group-hover/cam:opacity-0 group-hover/cam:rotate-12" />
                            <ImagePlus className="absolute inset-0 h-3.5 w-3.5 scale-0 opacity-0 -rotate-12 transition-all duration-200 ease-out group-hover/cam:scale-100 group-hover/cam:opacity-100 group-hover/cam:rotate-0" />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">Cambiar imagen</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="group/promo h-7 flex-1 cursor-pointer bg-violet-500/80 p-0 text-white hover:bg-violet-600"
                          onClick={() => router.push(`/dashboard/products/${product.id}/promote`)}
                        >
                          <span className="relative inline-flex">
                            <Megaphone className="h-3.5 w-3.5 transition-all duration-200 ease-out group-hover/promo:scale-0 group-hover/promo:opacity-0 group-hover/promo:rotate-12" />
                            <Send className="absolute inset-0 h-3.5 w-3.5 scale-0 opacity-0 -rotate-12 transition-all duration-200 ease-out group-hover/promo:scale-100 group-hover/promo:opacity-100 group-hover/promo:rotate-0" />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">Promocionar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="group/del h-7 flex-1 cursor-pointer bg-rose-500/80 p-0 text-white hover:bg-rose-600"
                          onClick={() => onDelete(product)}
                        >
                          <span className="relative inline-flex">
                            <Trash2 className="h-3.5 w-3.5 transition-all duration-200 ease-out group-hover/del:scale-0 group-hover/del:opacity-0 group-hover/del:rotate-12" />
                            <X className="absolute inset-0 h-3.5 w-3.5 scale-0 opacity-0 -rotate-12 transition-all duration-200 ease-out group-hover/del:scale-100 group-hover/del:opacity-100 group-hover/del:rotate-0" />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">Eliminar</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
