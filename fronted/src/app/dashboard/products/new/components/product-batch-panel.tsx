"use client"

import { memo, useState, type Dispatch, type SetStateAction } from 'react'
import { Barcode, Boxes, ShoppingCart, Trash2, X, Minimize2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { resolveImageUrl } from '@/lib/images'
import { useHelpAssistant } from '@/context/help-assistant-context'

type BatchCartItem = {
  id: string
  name: string
  payload: any
  initialStock: number
}

export type ProductBatchPanelProps = {
  batchCart: BatchCartItem[]
  setBatchCart: Dispatch<SetStateAction<BatchCartItem[]>>
  onRemoveItem: (itemId: string) => void
  onClearAll: () => void
  editingBatchId: string | null
  startBatchEditFromCart: (item: BatchCartItem) => void
  onOpenAssignDialog: () => void
  isProcessing: boolean
  categories: any
  formatMoney: (value: unknown) => string | null
  currentProductId: string | number | undefined
  batchSerials?: Record<string, string[]>
  onOpenSerials?: (itemId: string) => void
}

export const ProductBatchPanel = memo(function ProductBatchPanel({
  batchCart,
  onRemoveItem,
  onClearAll,
  editingBatchId,
  startBatchEditFromCart,
  onOpenAssignDialog,
  isProcessing,
  categories,
  formatMoney,
  currentProductId,
  batchSerials,
  onOpenSerials,
}: ProductBatchPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { isMascotMinimized } = useHelpAssistant()

  // When mascot is visible (not minimized), offset FAB to the left to avoid overlap
  // Mascot is h-14 w-14 (56px) at right-6 (24px), so offset = 56px + 24px + 20px gap = 100px
  const mascotVisible = !isMascotMinimized

  if (batchCart.length === 0 || currentProductId) return null

  // ── Collapsed: floating cart FAB ──
  if (!isExpanded) {
    return (
      <button
        type="button"
        className="fixed bottom-6 z-40 flex items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-600 text-white shadow-[0_4px_24px_rgba(16,185,129,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_32px_rgba(16,185,129,0.45)] active:scale-95 dark:border-emerald-400/40 dark:bg-emerald-500 h-14 w-14"
        style={{ right: mascotVisible ? 108 : 32 }}
        onClick={() => setIsExpanded(true)}
        aria-label={`Ver ${batchCart.length} productos agregados`}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full border-2 border-emerald-400/60 animate-ping opacity-30" />

        <ShoppingCart className="h-6 w-6 relative" />

        {/* Badge count */}
        <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-rose-500 px-1.5 text-[11px] font-bold text-white tabular-nums shadow-sm">
          {batchCart.length}
        </span>
      </button>
    )
  }

  // ── Expanded: full product panel ──
  return (
    <div
      className="fixed bottom-6 z-40 w-[300px] max-h-[70vh] flex flex-col rounded-xl border border-border/60 bg-card/95 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-200"
      style={{ right: mascotVisible ? 108 : 32 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 pb-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-emerald-500" />
          <p className="text-sm font-semibold">Productos agregados</p>
          <Badge variant="secondary" className="text-[10px] tabular-nums">
            {batchCart.length}
          </Badge>
        </div>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(false)}
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Minimizar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Product list — scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {batchCart.map((item) => {
          const imageSrc =
            Array.isArray(item.payload?.images) && item.payload.images[0]
              ? resolveImageUrl(String(item.payload.images[0]))
              : null
          const categoryLabel =
            categories?.find(
              (category: any) =>
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
              className="flex items-start justify-between gap-1.5"
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-muted/20">
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
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Producto
                    </p>
                    {item.initialStock > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-4 px-1.5 text-[9px] font-bold tabular-nums bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0"
                      >
                        ×{item.initialStock}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs font-medium">{item.name}</p>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">
                      Marca:
                    </span>{" "}
                    {brandLabel || "-"}{" "}
                    <span className="text-muted-foreground">|</span>{" "}
                    <span className="font-semibold text-foreground/80">
                      Cat:
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
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                {/* Series button — only when item has quantity */}
                {item.initialStock > 0 && onOpenSerials && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 relative"
                          onClick={(event) => {
                            event.stopPropagation()
                            onOpenSerials(item.id)
                          }}
                        >
                          <Barcode className="h-3.5 w-3.5" />
                          {(batchSerials?.[item.id]?.length ?? 0) > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[8px] font-bold text-white tabular-nums">
                              {batchSerials![item.id].length}
                            </span>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {(batchSerials?.[item.id]?.length ?? 0) > 0
                          ? `Series: ${batchSerials![item.id].length}/${item.initialStock}`
                          : "Agregar series"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        onClick={(event) => {
                          event.stopPropagation()
                          onRemoveItem(item.id)
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Quitar producto</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions footer */}
      <div className="border-t border-border/40 p-3 flex items-center gap-2">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer border-emerald-500/60 text-emerald-600 hover:border-emerald-500/80 hover:text-emerald-500 dark:border-emerald-400/40 dark:text-emerald-300 dark:hover:border-emerald-300/70 dark:hover:text-emerald-200"
                onClick={onOpenAssignDialog}
                disabled={isProcessing}
              >
                <Boxes className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Asignar stock por tienda</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer border-rose-500/60 text-rose-600 hover:border-rose-500/80 hover:text-rose-500 dark:border-rose-400/40 dark:text-rose-300 dark:hover:border-rose-300/70 dark:hover:text-rose-200"
                onClick={onClearAll}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Vaciar todo</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Spacer */}
        <div className="flex-1" />

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(false)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Minimizar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
})
