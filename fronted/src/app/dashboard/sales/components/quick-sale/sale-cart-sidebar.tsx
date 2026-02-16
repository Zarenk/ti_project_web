"use client"

import {
  X,
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Barcode,
  AlertCircle,
  Layers,
  FileText,
  ChevronDown,
  Banknote,
  Landmark,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/images"
import { BrandLogo } from "@/components/BrandLogo"
import type { SaleProductCardItem } from "./sale-product-card"
import { useState } from "react"

export type SaleCartItem = {
  product: SaleProductCardItem
  quantity: number
  unitPrice: number
}

type QuickPayButton = {
  id: number
  label: string
  icon?: React.ComponentType<{ className?: string }>
  iconSrc?: string
}

const QUICK_PAY_BUTTONS: QuickPayButton[] = [
  { id: -1, label: "Efectivo", icon: Banknote },
  { id: -4, label: "Yape", iconSrc: "/icons/yape.png" },
  { id: -5, label: "Plin", iconSrc: "/icons/plin.png" },
  { id: -3, label: "Visa", iconSrc: "/icons/visa.png" },
  { id: -2, label: "Transfer.", icon: Landmark },
]

const METHOD_NAMES: Record<number, string> = {
  [-1]: "EN EFECTIVO",
  [-2]: "TRANSFERENCIA",
  [-3]: "PAGO CON VISA",
  [-4]: "YAPE",
  [-5]: "PLIN",
  [-6]: "OTRO MEDIO DE PAGO",
}

type PaymentInfo = {
  paymentMethodId: number
  amount: number
  currency: string
}

type SaleCartSidebarProps = {
  items: SaleCartItem[]
  stockMap: Map<number, number>
  onUpdateQty: (productId: number, qty: number) => void
  onUpdatePrice: (productId: number, price: number) => void
  onRemove: (productId: number) => void
  onSubmit: () => void
  isSubmitting: boolean
  contextHint?: string
  serialsEnabled?: boolean
  serialsMap?: Map<number, string[]>
  onSerialClick?: (productId: number) => void
  // Payments
  selectedPayment: PaymentInfo | null
  splitPayments: PaymentInfo[]
  onQuickPay: (methodId: number) => void
  onSplitPayClick: () => void
  // Comprobante
  tipoComprobante: string
  onTipoComprobanteChange: (value: string) => void
}

function getMethodName(id: number): string {
  return METHOD_NAMES[id] ?? `Metodo #${id}`
}

export function SaleCartSidebar({
  items,
  stockMap,
  onUpdateQty,
  onUpdatePrice,
  onRemove,
  onSubmit,
  isSubmitting,
  contextHint,
  serialsEnabled,
  serialsMap,
  onSerialClick,
  selectedPayment,
  splitPayments,
  onQuickPay,
  onSplitPayClick,
  tipoComprobante,
  onTipoComprobanteChange,
}: SaleCartSidebarProps) {
  const [comprobanteOpen, setComprobanteOpen] = useState(false)

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  )
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const hasPayment = selectedPayment !== null || splitPayments.length > 0

  return (
    <Card className="flex max-h-[calc(100vh-8rem)] flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-4 w-4" />
          Venta
          {items.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Package className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Haz clic en los productos para agregarlos
            </p>
          </div>
        ) : (
          items.map((item) => {
            const images = Array.isArray(item.product.images)
              ? item.product.images.filter(Boolean)
              : []
            const imageUrl = images[0] ? resolveImageUrl(images[0]) : null
            const subtotal = item.quantity * item.unitPrice
            const serialCount = serialsMap?.get(item.product.id)?.length ?? 0
            const maxStock = stockMap.get(item.product.id) ?? 0

            return (
              <div
                key={item.product.id}
                className="group/item rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted/20"
              >
                {/* Top row: thumbnail + name + remove */}
                <div className="flex items-start gap-2.5">
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted/30">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-muted-foreground/60">
                        {item.product.category_name || "Sin categoria"}
                      </span>
                      {serialsEnabled && onSerialClick && (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded px-1 py-0.5 cursor-pointer transition-all duration-200",
                            "hover:bg-blue-500/10 hover:shadow-[0_0_6px_rgba(59,130,246,0.25)]",
                            serialCount > 0
                              ? "bg-blue-500/10"
                              : "bg-transparent",
                          )}
                          onClick={() => onSerialClick(item.product.id)}
                        >
                          <Barcode className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                          {serialCount > 0 && (
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                              {serialCount}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 cursor-pointer opacity-0 transition-opacity group-hover/item:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item.product.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Bottom row: qty controls + price + subtotal */}
                <div className="mt-2 flex items-center gap-2">
                  {/* Quantity stepper */}
                  <div className="flex items-center rounded-md border bg-muted/30">
                    <button
                      type="button"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() =>
                        onUpdateQty(
                          item.product.id,
                          Math.max(1, item.quantity - 1),
                        )
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[2rem] text-center text-xs font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() =>
                        onUpdateQty(item.product.id, item.quantity + 1)
                      }
                      disabled={item.quantity >= maxStock}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="text-xs text-muted-foreground/50">x</span>

                  {/* Price input */}
                  <div className="flex items-center gap-0.5 rounded-md border bg-muted/30 px-1.5">
                    <span className="text-[10px] text-muted-foreground/60">
                      S/.
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) =>
                        onUpdatePrice(
                          item.product.id,
                          Math.max(0, parseFloat(e.target.value) || 0),
                        )
                      }
                      className="h-6 w-16 border-0 bg-transparent px-0.5 text-xs text-center shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>

                  {/* Subtotal */}
                  <span className="ml-auto text-sm font-semibold tabular-nums">
                    {subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </CardContent>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span className="tabular-nums">S/. {total.toFixed(2)}</span>
        </div>

        {/* Quick Pay Buttons */}
        {items.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Pago rapido
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {QUICK_PAY_BUTTONS.map((btn) => {
                const isActive = selectedPayment?.paymentMethodId === btn.id
                return (
                  <Button
                    key={btn.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex h-auto cursor-pointer flex-col items-center gap-0.5 py-1.5 text-[10px]",
                      isActive &&
                        "bg-emerald-600 text-white hover:bg-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-600 dark:hover:bg-emerald-500",
                    )}
                    onClick={() => onQuickPay(btn.id)}
                  >
                    {btn.icon ? (
                      <btn.icon className="h-4 w-4" />
                    ) : btn.iconSrc ? (
                      <BrandLogo
                        src={btn.iconSrc}
                        alt={btn.label}
                        className="h-4 w-4"
                      />
                    ) : null}
                    {btn.label}
                  </Button>
                )
              })}
            </div>

            {/* Split payment button */}
            <Button
              variant={splitPayments.length > 0 ? "default" : "ghost"}
              size="sm"
              className={cn(
                "w-full cursor-pointer text-xs",
                splitPayments.length > 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  : "text-muted-foreground",
              )}
              onClick={onSplitPayClick}
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              {splitPayments.length > 0
                ? `Pago dividido (${splitPayments.length} metodos)`
                : "Dividir pago"}
            </Button>

            {/* Active payment summary */}
            {hasPayment && (
              <div className="rounded-md bg-muted/30 px-2.5 py-1.5 text-[11px]">
                {selectedPayment && splitPayments.length === 0 && (
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    {getMethodName(selectedPayment.paymentMethodId)} — S/.{" "}
                    {selectedPayment.amount.toFixed(2)}
                  </span>
                )}
                {splitPayments.length > 0 && (
                  <div className="space-y-0.5">
                    {splitPayments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Check className="h-2.5 w-2.5" />
                          {getMethodName(p.paymentMethodId)}
                        </span>
                        <span className="font-medium tabular-nums">
                          S/. {p.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expandable Comprobante Section */}
        {items.length > 0 && (
          <Collapsible open={comprobanteOpen} onOpenChange={setComprobanteOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer justify-between text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Comprobante: {tipoComprobante}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    comprobanteOpen && "rotate-180",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pt-2">
              {["SIN COMPROBANTE", "BOLETA", "FACTURA"].map((tipo) => (
                <Button
                  key={tipo}
                  variant={tipoComprobante === tipo ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-full cursor-pointer text-xs",
                    tipoComprobante === tipo &&
                      "bg-primary text-primary-foreground",
                  )}
                  onClick={() => onTipoComprobanteChange(tipo)}
                >
                  {tipo}
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Submit button */}
        <Button
          className="w-full cursor-pointer"
          onClick={onSubmit}
          disabled={items.length === 0 || isSubmitting}
        >
          {isSubmitting ? "Registrando venta..." : "Registrar Venta"}
        </Button>

        {/* Context hint */}
        {contextHint && items.length > 0 && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {contextHint}
          </p>
        )}
      </div>
    </Card>
  )
}
