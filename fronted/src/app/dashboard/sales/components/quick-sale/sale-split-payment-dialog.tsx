"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Banknote,
  Landmark,
  Check,
  X,
  Layers,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/BrandLogo"

type PaymentEntry = {
  paymentMethodId: number
  amount: number
  currency: string
}

type MethodDef = {
  id: number
  label: string
  icon?: React.ComponentType<{ className?: string }>
  iconSrc?: string
}

const METHODS: MethodDef[] = [
  { id: -1, label: "Efectivo", icon: Banknote },
  { id: -4, label: "Yape", iconSrc: "/icons/yape.png" },
  { id: -5, label: "Plin", iconSrc: "/icons/plin.png" },
  { id: -3, label: "Visa", iconSrc: "/icons/visa.png" },
  { id: -2, label: "Transferencia", icon: Landmark },
]

type SplitPaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  /** Current split state (to resume editing) */
  initialPayments: PaymentEntry[]
  onConfirm: (payments: PaymentEntry[]) => void
}

export function SplitPaymentDialog({
  open,
  onOpenChange,
  total,
  initialPayments,
  onConfirm,
}: SplitPaymentDialogProps) {
  const [entries, setEntries] = useState<PaymentEntry[]>([])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (initialPayments.length > 0) {
        setEntries([...initialPayments])
      } else {
        setEntries([])
      }
    }
  }, [open, initialPayments])

  // Computed values
  const assignedTotal = useMemo(
    () => entries.reduce((sum, e) => sum + e.amount, 0),
    [entries],
  )
  const remaining = useMemo(
    () => Math.max(0, Number((total - assignedTotal).toFixed(2))),
    [total, assignedTotal],
  )
  const isBalanced = Math.abs(assignedTotal - total) < 0.01
  const usedMethodIds = useMemo(
    () => new Set(entries.map((e) => e.paymentMethodId)),
    [entries],
  )
  const availableMethods = useMemo(
    () => METHODS.filter((m) => !usedMethodIds.has(m.id)),
    [usedMethodIds],
  )

  const handleAddMethod = useCallback(
    (methodId: number) => {
      // First method gets the full total, subsequent methods get remaining
      const amount =
        entries.length === 0 ? total : Number(remaining.toFixed(2))

      setEntries((prev) => [
        ...prev,
        { paymentMethodId: methodId, amount, currency: "PEN" },
      ])
    },
    [entries.length, total, remaining],
  )

  const handleUpdateAmount = useCallback(
    (index: number, newAmount: number) => {
      setEntries((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], amount: Math.max(0, newAmount) }

        // Auto-fill the last entry with remaining if there are exactly 2 entries
        // and the edited one is the first
        if (next.length === 2 && index === 0) {
          const rest = Number((total - newAmount).toFixed(2))
          next[1] = { ...next[1], amount: Math.max(0, rest) }
        }

        return next
      })
    },
    [total],
  )

  const handleRemoveEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleConfirm = () => {
    // Filter out zero amounts
    const valid = entries.filter((e) => e.amount > 0)
    onConfirm(valid)
    onOpenChange(false)
  }

  const getMethodDef = (id: number): MethodDef | undefined =>
    METHODS.find((m) => m.id === id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-md bg-emerald-500/10 p-1.5">
              <Layers className="h-5 w-5 text-emerald-500" />
            </span>
            Dividir pago
          </DialogTitle>
          <DialogDescription>
            Total a pagar:{" "}
            <span className="font-semibold text-foreground">
              S/. {total.toFixed(2)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Added payment methods */}
          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((entry, idx) => {
                const method = getMethodDef(entry.paymentMethodId)
                return (
                  <div
                    key={entry.paymentMethodId}
                    className="flex items-center gap-2.5 rounded-lg border bg-muted/20 p-2.5 transition-colors"
                  >
                    {/* Method icon + name */}
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
                        {method?.icon ? (
                          <method.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : method?.iconSrc ? (
                          <BrandLogo
                            src={method.iconSrc}
                            alt={method.label ?? ""}
                            className="h-4 w-4"
                          />
                        ) : (
                          <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {method?.label ?? `Metodo #${entry.paymentMethodId}`}
                      </span>
                    </div>

                    {/* Amount input */}
                    <div className="flex items-center gap-0.5 rounded-md border bg-background px-2 flex-1">
                      <span className="text-xs text-muted-foreground">
                        S/.
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={entry.amount || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          handleUpdateAmount(idx, isNaN(val) ? 0 : val)
                        }}
                        className="h-8 border-0 bg-transparent px-1 text-sm text-right font-semibold shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveEntry(idx)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Remaining indicator */}
          {entries.length > 0 && (
            <div
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm",
                isBalanced
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : remaining > 0
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-destructive/10 text-destructive",
              )}
            >
              <span className="font-medium">
                {isBalanced
                  ? "Pago completo"
                  : remaining > 0
                    ? "Restante"
                    : "Excedente"}
              </span>
              <span className="font-semibold tabular-nums">
                {isBalanced ? (
                  <Check className="h-4 w-4" />
                ) : (
                  `S/. ${Math.abs(Number((total - assignedTotal).toFixed(2))).toFixed(2)}`
                )}
              </span>
            </div>
          )}

          {/* Add method buttons */}
          {availableMethods.length > 0 && (
            <div className="space-y-2">
              {entries.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Selecciona los metodos de pago
                </span>
              )}
              {entries.length > 0 && !isBalanced && remaining > 0 && (
                <span className="text-xs text-muted-foreground">
                  Agrega otro metodo
                </span>
              )}
              <div className="grid grid-cols-5 gap-1.5">
                {availableMethods.map((method) => (
                  <Button
                    key={method.id}
                    variant="outline"
                    size="sm"
                    className="flex h-auto cursor-pointer flex-col items-center gap-0.5 py-2 text-[10px] hover:border-emerald-400/40 hover:bg-emerald-500/5"
                    onClick={() => handleAddMethod(method.id)}
                  >
                    {method.icon ? (
                      <method.icon className="h-4 w-4" />
                    ) : method.iconSrc ? (
                      <BrandLogo
                        src={method.iconSrc}
                        alt={method.label}
                        className="h-4 w-4"
                      />
                    ) : null}
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {entries.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Selecciona al menos 2 metodos de pago para dividir
            </p>
          )}

          {/* Validation warning */}
          {entries.length > 0 && !isBalanced && (
            <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Los montos deben sumar exactamente S/. {total.toFixed(2)}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_16px_rgba(16,185,129,0.35)] transition-shadow"
            onClick={handleConfirm}
            disabled={entries.length < 2 || !isBalanced}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Confirmar pago dividido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
