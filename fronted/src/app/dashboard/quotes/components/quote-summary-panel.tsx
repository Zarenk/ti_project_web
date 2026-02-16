import { memo, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { X, Plus, Minus, Sparkles } from "lucide-react"
import { toast } from "sonner"
import type { QuoteSummaryPanelProps } from "../types/quote-types"
import {
  isQuantityEditable,
  isServiceOrWarranty,
  getStockLimit,
  TAB_LABELS,
} from "../types/quote-types"

export const QuoteSummaryPanel = memo(function QuoteSummaryPanel({
  selection,
  priceOverrides,
  quantities,
  currency,
  taxRate,
  limitByStock,
  tab,
  sectionChips,
  onPriceChange,
  onQuantityChange,
  onRemoveItem,
  isReadOnly,
}: QuoteSummaryPanelProps) {
  // Calculate summary items with sorting
  const summaryItems = useMemo(() => {
    const selectedItems = Object.values(selection).flat()
    return selectedItems
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const weightA = isServiceOrWarranty(a.item) ? 1 : 0
        const weightB = isServiceOrWarranty(b.item) ? 1 : 0
        if (weightA !== weightB) return weightA - weightB
        return a.index - b.index
      })
      .map(({ item }) => item)
  }, [selection])

  // Calculate totals
  const { grossTotal, marginAmount, revenueTotal, taxAmount, netSubtotal } =
    useMemo(() => {
      let gross = 0
      let margin = 0
      let revenue = 0

      Object.values(selection)
        .flat()
        .forEach((item) => {
          if (!item) return
          const override = priceOverrides[item.id]
          const qty = Math.max(1, quantities[item.id] ?? 1)
          const sellPrice =
            typeof override === "number" ? override : item.price ?? 0

          gross += sellPrice * qty

          if (!isServiceOrWarranty(item)) {
            const cost =
              typeof item.costPrice === "number" ? item.costPrice : null
            revenue += sellPrice * qty
            if (cost !== null) {
              margin += (sellPrice - cost) * qty
            }
          }
        })

      const tax = gross ? gross - gross / (1 + (taxRate ?? 0)) : 0
      const net = gross - tax

      return {
        grossTotal: gross,
        marginAmount: margin,
        revenueTotal: revenue,
        taxAmount: tax,
        netSubtotal: net,
      }
    }, [selection, priceOverrides, quantities, taxRate])

  const handleQuantityDecrease = (itemId: number) => {
    const newQuantity = Math.max(1, (quantities[itemId] ?? 1) - 1)
    onQuantityChange(itemId, newQuantity)
  }

  const handleQuantityIncrease = (
    itemId: number,
    item: (typeof summaryItems)[0]
  ) => {
    const limit = getStockLimit(item, limitByStock)
    const next = (quantities[itemId] ?? 1) + 1
    if (limit !== null && next > limit) {
      toast.error(`Stock máximo: ${limit}`)
      return
    }
    onQuantityChange(itemId, next)
  }

  return (
    <>
      <Card className="border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-900 dark:text-slate-100">
              Resumen
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {TAB_LABELS[tab]}
            </Badge>
          </div>
          {sectionChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sectionChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  {chip.label}
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                    {chip.count}
                  </span>
                </span>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-1.5 pb-24">
          {summaryItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Selecciona componentes para ver el resumen.
            </div>
          ) : (
            summaryItems.map((item) => {
              const currentPrice = priceOverrides[item.id] ?? item.price
              const currentQuantity = Math.max(1, quantities[item.id] ?? 1)

              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-white/80 px-2 py-1.5 text-xs text-slate-600 transition-all duration-200 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-slate-700"
                >
                  {/* Remove button */}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item)}
                      className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 opacity-0 transition-opacity duration-150 hover:text-rose-500 group-hover:opacity-100 dark:text-slate-500 dark:hover:text-rose-400"
                      aria-label="Quitar item"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  {/* Name + badges */}
                  <span className="flex-1 truncate">
                    {item.name}
                    {(item.id === "service-assembly-free" ||
                      item.id === "warranty-12-free") && (
                      <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                        Incl.
                      </span>
                    )}
                  </span>

                  {/* Quantity controls */}
                  {isQuantityEditable(item) && !isReadOnly && (
                    <span className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleQuantityDecrease(item.id)}
                        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        aria-label="Disminuir"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="min-w-[16px] text-center text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                        {currentQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityIncrease(item.id, item)}
                        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        aria-label="Aumentar"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )}

                  {/* Price - Editable */}
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <Input
                      type="number"
                      step="0.01"
                      value={currentPrice.toFixed(2)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        onPriceChange(item.id, value)
                      }}
                      className="h-6 w-20 px-1.5 text-right text-[11px] font-semibold"
                      onClick={(e) => e.currentTarget.select()}
                      disabled={isReadOnly}
                    />
                    {priceOverrides[item.id] !== undefined &&
                      priceOverrides[item.id] !== item.price && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-[9px] text-slate-500 dark:text-slate-400">
                              Cat: {currency} {item.price.toFixed(2)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            Precio de catálogo: {currency} {item.price.toFixed(2)}
                          </TooltipContent>
                        </Tooltip>
                      )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Sticky totals footer */}
      <footer className="sticky bottom-0 z-20 border-t border-slate-200/70 bg-white/90 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-300">
            <span>
              Subtotal:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {currency} {netSubtotal.toFixed(2)}
              </span>
            </span>
            <span>
              Margen:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {currency} {marginAmount.toFixed(2)}
              </span>
            </span>
            <span>
              IGV:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {currency} {taxAmount.toFixed(2)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              Total: {currency} {grossTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </footer>
    </>
  )
})
