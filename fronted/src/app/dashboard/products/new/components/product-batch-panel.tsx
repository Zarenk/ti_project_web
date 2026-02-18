"use client"

import { memo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { Boxes, LocateFixed, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { resolveImageUrl } from '@/lib/images'

type BatchCartItem = {
  id: string
  name: string
  payload: any
  initialStock: number
}

export type ProductBatchPanelProps = {
  batchCart: BatchCartItem[]
  setBatchCart: Dispatch<SetStateAction<BatchCartItem[]>>
  editingBatchId: string | null
  startBatchEditFromCart: (item: BatchCartItem) => void
  floatingPanelRef: MutableRefObject<HTMLDivElement | null>
  floatingPanelPosition: { x: number; y: number } | null
  setFloatingPanelPosition: Dispatch<SetStateAction<{ x: number; y: number } | null>>
  isFloatingPanelDragging: boolean
  setIsFloatingPanelDragging: Dispatch<SetStateAction<boolean>>
  floatingDragOffsetRef: MutableRefObject<{ x: number; y: number }>
  floatingPanelPinnedRef: MutableRefObject<boolean>
  getDefaultPanelPosition: () => { x: number; y: number }
  setIsBatchStockDialogOpen: Dispatch<SetStateAction<boolean>>
  isProcessing: boolean
  categories: any
  formatMoney: (value: unknown) => string | null
  currentProductId: string | number | undefined
}

export const ProductBatchPanel = memo(function ProductBatchPanel({
  batchCart,
  setBatchCart,
  editingBatchId,
  startBatchEditFromCart,
  floatingPanelRef,
  floatingPanelPosition,
  setFloatingPanelPosition,
  isFloatingPanelDragging,
  setIsFloatingPanelDragging,
  floatingDragOffsetRef,
  floatingPanelPinnedRef,
  getDefaultPanelPosition,
  setIsBatchStockDialogOpen,
  isProcessing,
  categories,
  formatMoney,
  currentProductId,
}: ProductBatchPanelProps) {
  if (batchCart.length === 0 || currentProductId) return null

  return (
    <div
      ref={floatingPanelRef}
      className={`fixed z-40 w-[280px] rounded-xl border border-border/60 bg-card/95 p-4 shadow-lg backdrop-blur ${
        isFloatingPanelDragging ? "cursor-grabbing" : ""
      }`}
      style={{
        left: floatingPanelPosition?.x ?? 0,
        top: floatingPanelPosition?.y ?? 0,
      }}
    >
      <div
        className={`flex items-center justify-between ${
          isFloatingPanelDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={(event) => {
          setIsFloatingPanelDragging(true)
          floatingPanelPinnedRef.current = true
          floatingDragOffsetRef.current = {
            x: event.clientX - (floatingPanelPosition?.x ?? 0),
            y: event.clientY - (floatingPanelPosition?.y ?? 0),
          }
        }}
      >
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
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 cursor-pointer border-rose-500/60 bg-rose-50 text-rose-700 transition-all duration-200 hover:scale-105 hover:border-rose-500/80 hover:text-rose-800 hover:shadow-[0_0_18px_rgba(244,63,94,0.25)] dark:border-rose-400/40 dark:bg-transparent dark:text-rose-200 dark:hover:border-rose-300/70 dark:hover:text-rose-100 dark:hover:shadow-[0_0_18px_rgba(244,63,94,0.35)]"
                      onClick={(event) => {
                        event.stopPropagation()
                        setBatchCart((prev) =>
                          prev.filter((entry) => entry.id !== item.id),
                        )
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Quitar producto</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer border-emerald-500/60 bg-emerald-50 text-emerald-700 transition-all duration-200 hover:scale-105 hover:border-emerald-500/80 hover:text-emerald-800 hover:shadow-[0_0_18px_rgba(16,185,129,0.25)] dark:border-emerald-400/40 dark:bg-transparent dark:text-emerald-200 dark:hover:border-emerald-300/70 dark:hover:text-emerald-100 dark:hover:shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                onClick={() => setIsBatchStockDialogOpen(true)}
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
                className="h-9 w-9 cursor-pointer border-sky-500/60 bg-sky-50 text-sky-700 transition-all duration-200 hover:scale-105 hover:border-sky-500/80 hover:text-sky-800 hover:shadow-[0_0_18px_rgba(56,189,248,0.25)] dark:border-sky-400/40 dark:bg-transparent dark:text-sky-200 dark:hover:border-sky-300/70 dark:hover:text-sky-100 dark:hover:shadow-[0_0_18px_rgba(56,189,248,0.35)]"
                onClick={() => {
                  setFloatingPanelPosition(getDefaultPanelPosition())
                  floatingPanelPinnedRef.current = true
                }}
                disabled={isProcessing}
              >
                <LocateFixed className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Restaurar posición</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer border-rose-500/60 bg-rose-50 text-rose-700 transition-all duration-200 hover:scale-105 hover:border-rose-500/80 hover:text-rose-800 hover:shadow-[0_0_18px_rgba(244,63,94,0.25)] dark:border-rose-400/40 dark:bg-transparent dark:text-rose-200 dark:hover:border-rose-300/70 dark:hover:text-rose-100 dark:hover:shadow-[0_0_18px_rgba(244,63,94,0.35)]"
                onClick={() => setBatchCart([])}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Vaciar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
})
