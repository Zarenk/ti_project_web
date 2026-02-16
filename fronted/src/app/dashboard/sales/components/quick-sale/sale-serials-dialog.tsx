"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Barcode,
  Check,
  Loader2,
  X,
  ArrowLeftRight,
  Package,
} from "lucide-react"

import { Button } from "@/components/ui/button"
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

type SaleSerialsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  quantity: number
  /** Series currently assigned to this product */
  assignedSerials: string[]
  /** All available (active) series for this product in the store */
  availableSerials: string[]
  /** Series assigned to OTHER products (to exclude from available) */
  otherProductSerials: string[]
  /** Loading state while fetching available series */
  loading?: boolean
  onSave: (serials: string[]) => void
}

export function SaleSerialsDialog({
  open,
  onOpenChange,
  productName,
  quantity,
  assignedSerials,
  availableSerials,
  otherProductSerials,
  loading,
  onSave,
}: SaleSerialsDialogProps) {
  // Local copy of assigned serials for editing
  const [localAssigned, setLocalAssigned] = useState<string[]>([])
  // Which serial is being swapped (shows available list)
  const [swapIndex, setSwapIndex] = useState<number | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalAssigned([...assignedSerials])
      setSwapIndex(null)
    }
  }, [open, assignedSerials])

  // Filter available serials: exclude assigned to this product and other products
  const otherSet = useMemo(
    () => new Set(otherProductSerials),
    [otherProductSerials],
  )
  const localAssignedSet = useMemo(
    () => new Set(localAssigned),
    [localAssigned],
  )

  const swappableSerials = useMemo(() => {
    return availableSerials.filter(
      (s) => !localAssignedSet.has(s) && !otherSet.has(s),
    )
  }, [availableSerials, localAssignedSet, otherSet])

  const handleRemoveSerial = (index: number) => {
    setLocalAssigned((prev) => prev.filter((_, i) => i !== index))
    setSwapIndex(null)
  }

  const handleSwapSerial = (index: number, newSerial: string) => {
    setLocalAssigned((prev) => {
      const next = [...prev]
      next[index] = newSerial
      return next
    })
    setSwapIndex(null)
  }

  const handleAddFromAvailable = (serial: string) => {
    if (localAssigned.length >= quantity) return
    setLocalAssigned((prev) => [...prev, serial])
  }

  const handleSave = () => {
    onSave(localAssigned)
    onOpenChange(false)
  }

  const hasChanges =
    localAssigned.length !== assignedSerials.length ||
    localAssigned.some((s, i) => s !== assignedSerials[i])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-md bg-blue-500/10 p-1.5">
              <Barcode className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </span>
            <span className="truncate">{productName}</span>
          </DialogTitle>
          <DialogDescription>
            Series asignadas automaticamente. Puedes intercambiar o quitar
            series.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Counter */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {localAssigned.length} de {quantity} series asignadas
              </span>
              {localAssigned.length >= quantity && (
                <Badge variant="secondary" className="text-[10px]">
                  Completo
                </Badge>
              )}
            </div>

            {/* Assigned serials list */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Series asignadas
              </span>
              {localAssigned.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay series asignadas
                </p>
              ) : (
                <div className="max-h-[180px] space-y-1 overflow-y-auto">
                  {localAssigned.map((serial, idx) => (
                    <div key={`${serial}-${idx}`}>
                      <div
                        className={cn(
                          "group/serial flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-1.5 transition-colors hover:bg-muted/40",
                          swapIndex === idx && "border-blue-500/40 bg-blue-500/5",
                        )}
                      >
                        <span className="w-5 text-right text-[11px] text-muted-foreground tabular-nums">
                          {idx + 1}.
                        </span>
                        <span className="flex-1 truncate text-sm font-medium">
                          {serial}
                        </span>
                        <Check className="h-3.5 w-3.5 shrink-0 text-blue-500" />

                        {/* Swap button */}
                        {swappableSerials.length > 0 && (
                          <button
                            type="button"
                            className={cn(
                              "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground/40 transition-all hover:bg-blue-500/10 hover:text-blue-500",
                              swapIndex === idx
                                ? "bg-blue-500/10 text-blue-500 opacity-100"
                                : "opacity-0 group-hover/serial:opacity-100",
                            )}
                            onClick={() =>
                              setSwapIndex(swapIndex === idx ? null : idx)
                            }
                            title="Intercambiar serie"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                          </button>
                        )}

                        {/* Remove button */}
                        <button
                          type="button"
                          className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/serial:opacity-100"
                          onClick={() => handleRemoveSerial(idx)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Swap picker inline */}
                      {swapIndex === idx && (
                        <div className="ml-7 mt-1 mb-1 max-h-[120px] space-y-0.5 overflow-y-auto rounded-md border border-blue-500/20 bg-blue-500/5 p-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            Selecciona una serie de reemplazo:
                          </span>
                          {swappableSerials.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-blue-500/10"
                              onClick={() => handleSwapSerial(idx, s)}
                            >
                              <Barcode className="h-3 w-3 shrink-0 text-blue-400" />
                              <span className="truncate font-medium">{s}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available serials to add */}
            {localAssigned.length < quantity && swappableSerials.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Series disponibles
                </span>
                <div className="max-h-[120px] space-y-0.5 overflow-y-auto">
                  {swappableSerials.map((serial) => (
                    <button
                      key={serial}
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed bg-muted/10 px-3 py-1.5 text-left transition-colors hover:bg-muted/30 hover:border-solid"
                      onClick={() => handleAddFromAvailable(serial)}
                    >
                      <Barcode className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                      <span className="truncate text-sm text-muted-foreground">
                        {serial}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No series available at all */}
            {availableSerials.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Package className="h-6 w-6 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">
                  No hay series registradas para este producto en la tienda
                  seleccionada
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)] hover:shadow-[0_0_16px_rgba(59,130,246,0.35)] transition-shadow"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Guardar ({localAssigned.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
